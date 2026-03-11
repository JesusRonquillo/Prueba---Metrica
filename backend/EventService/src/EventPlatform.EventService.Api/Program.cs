using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Amazon;
using Amazon.CloudWatchLogs;
using EventPlatform.EventService.Application.Events;
using EventPlatform.EventService.Infrastructure;
using EventPlatform.EventService.Infrastructure.Persistence;
using EventPlatform.Messaging.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.IdentityModel.Tokens;
using MassTransit;
using Serilog;
using Serilog.Formatting.Compact;
using Serilog.Sinks.AwsCloudWatch;

var builder = WebApplication.CreateBuilder(args);

// ---------- Serilog + CloudWatch (opcional) ----------
var logGroupName = builder.Configuration["CloudWatch:LogGroupName"];
var awsRegion = builder.Configuration["CloudWatch:Region"] ?? builder.Configuration["AWS_REGION"] ?? Environment.GetEnvironmentVariable("AWS_REGION");
var config = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "EventService.Api")
    .WriteTo.Console();

if (!string.IsNullOrWhiteSpace(logGroupName) && !string.IsNullOrWhiteSpace(awsRegion))
{
    var region = RegionEndpoint.GetBySystemName(awsRegion);
    var client = new AmazonCloudWatchLogsClient(region);
    config = config.WriteTo.AmazonCloudWatch(
        new CloudWatchSinkOptions
        {
            LogGroupName = logGroupName,
            TextFormatter = new CompactJsonFormatter(),
            MinimumLogEventLevel = Serilog.Events.LogEventLevel.Information,
            BatchSizeLimit = 50,
            QueueSizeLimit = 10000,
            Period = TimeSpan.FromSeconds(5),
            CreateLogGroup = true,
            RetryAttempts = 5
        }, client);
}

Log.Logger = config.CreateLogger();
builder.Host.UseSerilog();

builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:80", "http://127.0.0.1:80")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddInfrastructure(builder.Configuration);

// ---------- B5: MassTransit + RabbitMQ ----------
var rabbitConnection = builder.Configuration.GetConnectionString("RabbitMQ") ?? "amqp://guest:guest@localhost:5672";
var rabbitUri = new Uri(rabbitConnection);
builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(rabbitUri, h =>
        {
            if (!string.IsNullOrEmpty(rabbitUri.UserInfo))
            {
                var parts = rabbitUri.UserInfo.Split(':', 2);
                h.Username(parts[0]);
                if (parts.Length > 1)
                    h.Password(parts[1]);
            }
        });
    });
});

// ---------- B6: Redis ya registrado en AddInfrastructure (ConnectionStrings:Redis) ----------

// ---------- B7: JWT ----------
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "EventPlatform-SecretKey-Minimo-32-caracteres!!";
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "EventPlatform.EventService",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "EventPlatform",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOrPromotor", policy =>
        policy.RequireRole("Admin", "Promotor"));
});

// ---------- B8: Health checks ----------
var eventDbConnection = builder.Configuration.GetConnectionString("EventDatabase");
var healthBuilder = builder.Services.AddHealthChecks();
healthBuilder.AddNpgSql(eventDbConnection!, name: "postgres", tags: ["db"]);

var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnection))
{
    healthBuilder.AddRedis(redisConnection, name: "redis", tags: ["cache"]);
}

// RabbitMQ health check requiere factory; se omite para simplificar o configurar después
// healthBuilder.AddRabbitMQ(...);

var app = builder.Build();

// Aplicar migraciones pendientes al arrancar (crea tablas si no existen)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EventDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// ---------- Demo: obtener token JWT (B7) ----------
app.MapPost("/auth/token", (LoginRequest request) =>
{
    var secret = app.Configuration["Jwt:Secret"] ?? "EventPlatform-SecretKey-Minimo-32-caracteres!!";
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var role = string.IsNullOrWhiteSpace(request.Role) ? "Admin" : request.Role;
    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, request.UserName ?? "demo"),
        new Claim(ClaimTypes.Role, role)
    };
    var expires = DateTime.UtcNow.AddMinutes(app.Configuration.GetValue<int>("Jwt:ExpirationMinutes", 60));
    var token = new JwtSecurityToken(
        issuer: app.Configuration["Jwt:Issuer"] ?? "EventPlatform.EventService",
        audience: app.Configuration["Jwt:Audience"] ?? "EventPlatform",
        claims: claims,
        expires: expires,
        signingCredentials: creds
    );
    return Results.Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token), expires });
}).AllowAnonymous();

// ---------- POST /events (B5: publicar EventCreated después de guardar) ----------
app.MapPost("/events", async (
    CreateEventRequest request,
    IEventRepository repository,
    IPublishEndpoint publishEndpoint,
    CancellationToken cancellationToken) =>
{
    if (request.Zones is null || request.Zones.Count == 0)
        return Results.BadRequest("At least one zone is required.");

    var eventEntity = new EventPlatform.EventService.Domain.Entities.Event(
        Guid.NewGuid(),
        request.Name,
        request.Date,
        request.Location);

    foreach (var zoneRequest in request.Zones)
        eventEntity.AddZone(zoneRequest.Name, zoneRequest.Price, zoneRequest.Capacity);

    await repository.AddAsync(eventEntity, cancellationToken);

    // B5: Publicar EventCreated (contrato obligatorio)
    var messageId = Guid.NewGuid();
    var correlationId = Guid.NewGuid();
    await publishEndpoint.Publish(new EventCreatedMessage
    {
        MessageId = messageId,
        EventId = eventEntity.Id,
        Name = "EventCreated",
        OccurredAt = DateTimeOffset.UtcNow,
        CorrelationId = correlationId,
        Version = 1
    }, cancellationToken);

    return Results.Created($"/events/{eventEntity.Id}", new { eventEntity.Id });
}).RequireAuthorization("AdminOrPromotor");

// ---------- GET /events (B6: cache Redis) ----------
const string EventsCacheKey = "events:list";
const int EventsCacheTtlSeconds = 60;

app.MapGet("/events/{id:guid}", async (Guid id, IEventRepository repository) =>
{
    var eventEntity = await repository.GetByIdAsync(id);
    if (eventEntity == null)
        return Results.NotFound();

    var response = new EventSummaryResponse(
        eventEntity.Id,
        eventEntity.Name,
        eventEntity.Date,
        eventEntity.Location,
        eventEntity.Status,
        eventEntity.Zones.Select(z => new ZoneResponse(z.Id, z.Name, z.Price, z.Capacity)).ToList()
    );
    return Results.Ok(response);
}).AllowAnonymous();

app.MapGet("/events", async (HttpContext httpContext, IEventRepository repository, IDistributedCache cache) =>
{
    var cached = await cache.GetStringAsync(EventsCacheKey);
    if (!string.IsNullOrEmpty(cached))
    {
        var parsed = JsonSerializer.Deserialize<List<EventSummaryResponse>>(cached);
        if (parsed != null)
        {
            httpContext.Response.Headers["X-Cache"] = "HIT";
            return Results.Ok(parsed);
        }
    }

    var events = await repository.GetAllAsync();
    var response = events.Select(e => new EventSummaryResponse(
        e.Id,
        e.Name,
        e.Date,
        e.Location,
        e.Status,
        e.Zones.Select(z => new ZoneResponse(z.Id, z.Name, z.Price, z.Capacity)).ToList()
    )).ToList();

    var json = JsonSerializer.Serialize(response);
    await cache.SetStringAsync(EventsCacheKey, json, new DistributedCacheEntryOptions
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(EventsCacheTtlSeconds)
    });

    httpContext.Response.Headers["X-Cache"] = "MISS";
    return Results.Ok(response);
}).AllowAnonymous();

// ---------- B8: Health ----------
// Liveness: solo comprueba que el proceso responde (para ECS; evita que maten la tarea por DB/Redis lentos al arranque).
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
// Readiness: Postgres + Redis (para ALB y operadores).
app.MapHealthChecks("/health");

app.Run();

// DTOs
public sealed record LoginRequest(string? UserName, string? Role);

public sealed record CreateEventRequest(
    string Name,
    DateTimeOffset Date,
    string Location,
    List<CreateZoneRequest> Zones);

public sealed record CreateZoneRequest(string Name, decimal Price, int Capacity);

public sealed record EventSummaryResponse(
    Guid Id,
    string Name,
    DateTimeOffset Date,
    string Location,
    string Status,
    List<ZoneResponse> Zones);

public sealed record ZoneResponse(Guid Id, string Name, decimal Price, int Capacity);

public partial class Program;
