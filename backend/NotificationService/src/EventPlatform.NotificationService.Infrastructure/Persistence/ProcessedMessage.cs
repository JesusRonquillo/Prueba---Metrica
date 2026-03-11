namespace EventPlatform.NotificationService.Infrastructure.Persistence;

public class ProcessedMessage
{
    public Guid MessageId { get; set; }
    public DateTimeOffset ProcessedAt { get; set; }
}
