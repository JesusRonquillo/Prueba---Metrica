using System;
using System.Collections.Generic;

namespace EventPlatform.EventService.Domain.Entities;

public class Event
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public DateTimeOffset Date { get; private set; }
    public string Location { get; private set; } = null!;
    public string Status { get; private set; } = "Draft";

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? UpdatedAt { get; private set; }

    private readonly List<Zone> _zones = new();
    public IReadOnlyCollection<Zone> Zones => _zones.AsReadOnly();

    private Event() { }

    public Event(Guid id, string name, DateTimeOffset date, string location)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        UpdateBasicInfo(name, date, location);
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void UpdateBasicInfo(string name, DateTimeOffset date, string location)
    {
        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Name is required", nameof(name))
            : name.Trim();

        Location = string.IsNullOrWhiteSpace(location)
            ? throw new ArgumentException("Location is required", nameof(location))
            : location.Trim();

        Date = date;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void SetStatus(string status)
    {
        if (string.IsNullOrWhiteSpace(status))
            throw new ArgumentException("Status is required", nameof(status));

        Status = status.Trim();
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public Zone AddZone(string name, decimal price, int capacity)
    {
        var zone = new Zone(
            Guid.NewGuid(),
            Id,
            name,
            price,
            capacity);

        _zones.Add(zone);
        UpdatedAt = DateTimeOffset.UtcNow;

        return zone;
    }
}

