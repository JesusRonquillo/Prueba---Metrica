using EventPlatform.Messaging.Contracts;
using EventPlatform.NotificationService.Infrastructure.Persistence;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EventPlatform.NotificationService.Infrastructure.Consumers;

public class EventCreatedConsumer : IConsumer<EventCreatedMessage>
{
    private readonly NotificationDbContext _db;
    private readonly ILogger<EventCreatedConsumer> _logger;

    public EventCreatedConsumer(NotificationDbContext db, ILogger<EventCreatedConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<EventCreatedMessage> context)
    {
        var messageId = context.Message.MessageId;

        var alreadyProcessed = await _db.ProcessedMessages
            .AnyAsync(x => x.MessageId == messageId, context.CancellationToken);

        if (alreadyProcessed)
        {
            _logger.LogInformation("MessageId {MessageId} already processed, skipping (idempotency)", messageId);
            return;
        }

        await _db.ProcessedMessages.AddAsync(new ProcessedMessage
        {
            MessageId = messageId,
            ProcessedAt = DateTimeOffset.UtcNow
        }, context.CancellationToken);

        await _db.SaveChangesAsync(context.CancellationToken);

        _logger.LogInformation(
            "Processed EventCreated MessageId={MessageId}, EventId={EventId}, CorrelationId={CorrelationId}",
            messageId, context.Message.EventId, context.Message.CorrelationId);
    }
}
