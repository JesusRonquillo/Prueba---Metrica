using System;

namespace EventPlatform.EventService.Domain.Entities;

public class Zone
{
    public Guid Id { get; private set; }
    public Guid EventId { get; private set; }

    public string Name { get; private set; } = null!;
    public decimal Price { get; private set; }
    public int Capacity { get; private set; }

    public Event? Event { get; private set; }

    private Zone() { }

    public Zone(Guid id, Guid eventId, string name, decimal price, int capacity)
    {
        if (capacity <= 0)
            throw new ArgumentOutOfRangeException(nameof(capacity), "Capacity must be greater than zero.");

        if (price < 0)
            throw new ArgumentOutOfRangeException(nameof(price), "Price cannot be negative.");

        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        EventId = eventId;
        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Name is required", nameof(name))
            : name.Trim();

        Price = price;
        Capacity = capacity;
    }

    public void Update(string name, decimal price, int capacity)
    {
        if (capacity <= 0)
            throw new ArgumentOutOfRangeException(nameof(capacity), "Capacity must be greater than zero.");

        if (price < 0)
            throw new ArgumentOutOfRangeException(nameof(price), "Price cannot be negative.");

        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Name is required", nameof(name))
            : name.Trim();

        Price = price;
        Capacity = capacity;
    }
}

