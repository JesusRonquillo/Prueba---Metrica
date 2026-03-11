using EventPlatform.NotificationService.Infrastructure.Consumers;
using EventPlatform.NotificationService.Infrastructure.Persistence;
using MassTransit;
using Microsoft.EntityFrameworkCore;

var builder = Host.CreateApplicationBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("NotificationDatabase")
    ?? throw new InvalidOperationException("ConnectionStrings:NotificationDatabase is required.");

builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseNpgsql(connectionString));

var rabbitConnection = builder.Configuration.GetConnectionString("RabbitMQ") ?? "amqp://guest:guest@localhost:5672";

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<EventCreatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("event-created", e =>
        {
            e.ConfigureConsumer<EventCreatedConsumer>(context);

            // D3: Reintentos (3 intentos, intervalo 5 s)
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));

            // Tras agotar reintentos, MassTransit mueve el mensaje a la cola _error (DLQ implícita)
            e.PrefetchCount = 1;
        });
    });
});

var host = builder.Build();

using (var scope = host.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
    await db.Database.MigrateAsync();
}

await host.RunAsync();
