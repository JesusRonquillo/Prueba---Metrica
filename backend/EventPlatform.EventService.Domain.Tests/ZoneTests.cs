using System;
using EventPlatform.EventService.Domain.Entities;

namespace EventPlatform.EventService.Domain.Tests;

public class ZoneTests
{
    [Fact]
    public void Constructor_Should_SetProperties_When_Valid()
    {
        var eventId = Guid.NewGuid();

        var zone = new Zone(Guid.Empty, eventId, "  VIP  ", 120m, 50);

        Assert.NotEqual(Guid.Empty, zone.Id);
        Assert.Equal(eventId, zone.EventId);
        Assert.Equal("VIP", zone.Name);
        Assert.Equal(120m, zone.Price);
        Assert.Equal(50, zone.Capacity);
    }

    [Fact]
    public void Constructor_Should_Throw_When_Capacity_Is_Zero_Or_Negative()
    {
        var eventId = Guid.NewGuid();

        Assert.Throws<ArgumentOutOfRangeException>(() => new Zone(Guid.NewGuid(), eventId, "General", 10m, 0));
        Assert.Throws<ArgumentOutOfRangeException>(() => new Zone(Guid.NewGuid(), eventId, "General", 10m, -5));
    }

    [Fact]
    public void Constructor_Should_Throw_When_Price_Is_Negative()
    {
        var eventId = Guid.NewGuid();

        Assert.Throws<ArgumentOutOfRangeException>(() => new Zone(Guid.NewGuid(), eventId, "General", -1m, 10));
    }

    [Fact]
    public void Update_Should_Apply_ValidChanges()
    {
        var eventId = Guid.NewGuid();
        var zone = new Zone(Guid.NewGuid(), eventId, "General", 10m, 100);

        zone.Update("  Preferencial  ", 20m, 80);

        Assert.Equal("Preferencial", zone.Name);
        Assert.Equal(20m, zone.Price);
        Assert.Equal(80, zone.Capacity);
    }
}

