using System;
using System.Linq;
using EventPlatform.EventService.Domain.Entities;

namespace EventPlatform.EventService.Domain.Tests;

public class EventTests
{
    [Fact]
    public void Constructor_Should_SetBasicProperties_And_DefaultStatus()
    {
        var id = Guid.NewGuid();
        var name = "  Concierto Test  ";
        var date = DateTimeOffset.UtcNow.AddDays(10);
        var location = "  Lima  ";

        var ev = new Event(id, name, date, location);

        Assert.Equal(id, ev.Id);
        Assert.Equal("Concierto Test", ev.Name);
        Assert.Equal("Lima", ev.Location);
        Assert.Equal(date, ev.Date);
        Assert.Equal("Draft", ev.Status);
        Assert.True(ev.CreatedAt <= DateTimeOffset.UtcNow);
        Assert.NotEqual(default, ev.CreatedAt);
    }

    [Fact]
    public void UpdateBasicInfo_Should_Trim_And_Update_Timestamps()
    {
        var ev = new Event(Guid.NewGuid(), "Old", DateTimeOffset.UtcNow, "OldLocation");
        var oldCreated = ev.CreatedAt;

        var newDate = DateTimeOffset.UtcNow.AddDays(5);
        ev.UpdateBasicInfo("  Nuevo Nombre  ", newDate, "  Cusco  ");

        Assert.Equal("Nuevo Nombre", ev.Name);
        Assert.Equal("Cusco", ev.Location);
        Assert.Equal(newDate, ev.Date);
        Assert.Equal(oldCreated, ev.CreatedAt);
        Assert.NotNull(ev.UpdatedAt);
    }

    [Fact]
    public void AddZone_Should_AddZone_With_ValidData()
    {
        var ev = new Event(Guid.NewGuid(), "Evento", DateTimeOffset.UtcNow, "Lima");

        var zone = ev.AddZone(" General ", 50m, 100);

        Assert.Single(ev.Zones);
        Assert.Equal(zone.Id, ev.Zones.First().Id);
        Assert.Equal(ev.Id, zone.EventId);
        Assert.Equal("General", zone.Name);
        Assert.Equal(50m, zone.Price);
        Assert.Equal(100, zone.Capacity);
        Assert.NotNull(ev.UpdatedAt);
    }

    [Fact]
    public void Constructor_Should_Throw_If_Name_Is_Empty()
    {
        var id = Guid.NewGuid();
        var date = DateTimeOffset.UtcNow.AddDays(1);

        Assert.Throws<ArgumentException>(() => new Event(id, "  ", date, "Lima"));
    }

    [Fact]
    public void Constructor_Should_Throw_If_Location_Is_Empty()
    {
        var id = Guid.NewGuid();
        var date = DateTimeOffset.UtcNow.AddDays(1);

        Assert.Throws<ArgumentException>(() => new Event(id, "Evento", date, "  "));
    }
}

