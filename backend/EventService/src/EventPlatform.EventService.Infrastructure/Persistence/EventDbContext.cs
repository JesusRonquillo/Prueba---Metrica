using EventPlatform.EventService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EventPlatform.EventService.Infrastructure.Persistence;

public class EventDbContext : DbContext
{
    public EventDbContext(DbContextOptions<EventDbContext> options)
        : base(options)
    {
    }

    public DbSet<Event> Events => Set<Event>();
    public DbSet<Zone> Zones => Set<Zone>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Event>(builder =>
        {
            builder.ToTable("events");

            builder.HasKey(e => e.Id);

            builder.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(e => e.Location)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(e => e.Status)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(e => e.Date)
                .IsRequired();

            builder.Property(e => e.CreatedAt)
                .IsRequired();

            builder.Property(e => e.UpdatedAt);

            builder.HasMany(e => e.Zones)
                .WithOne(z => z.Event!)
                .HasForeignKey(z => z.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Zone>(builder =>
        {
            builder.ToTable("zones");

            builder.HasKey(z => z.Id);

            builder.Property(z => z.Name)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(z => z.Price)
                .IsRequired()
                .HasColumnType("numeric(18,2)");

            builder.Property(z => z.Capacity)
                .IsRequired();

            builder.HasIndex(z => new { z.EventId, z.Name })
                .IsUnique();
        });
    }
}

