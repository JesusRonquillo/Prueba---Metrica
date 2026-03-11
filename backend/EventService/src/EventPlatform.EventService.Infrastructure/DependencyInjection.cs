using EventPlatform.EventService.Application.Events;
using EventPlatform.EventService.Infrastructure.Events;
using EventPlatform.EventService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EventPlatform.EventService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("EventDatabase")
                               ?? throw new InvalidOperationException("Connection string 'EventDatabase' is not configured.");

        services.AddDbContext<EventDbContext>(options =>
        {
            options.UseNpgsql(connectionString);
        });

        services.AddScoped<IEventRepository, EventRepository>();

        // Redis (B6) - opcional si no está configurado
        var redisConnection = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName = "EventService:";
            });
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        return services;
    }
}

