using EventPlatform.EventService.Application.Events;
using EventPlatform.EventService.Domain.Entities;
using EventPlatform.EventService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventPlatform.EventService.Infrastructure.Events;

public class EventRepository : IEventRepository
{
    private readonly EventDbContext _dbContext;

    public EventRepository(EventDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Event @event, CancellationToken cancellationToken = default)
    {
        await _dbContext.Events.AddAsync(@event, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Event>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Events
            .Include(e => e.Zones)
            .OrderBy(e => e.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task<Event?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Events
            .Include(e => e.Zones)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }
}

