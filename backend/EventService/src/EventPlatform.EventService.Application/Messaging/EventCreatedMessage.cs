namespace EventPlatform.EventService.Application.Messaging;

/// <summary>
/// Contrato obligatorio del mensaje publicado al crear un evento.
/// Requerido: messageId, eventId, name, occurredAt, correlationId, version.
/// </summary>
public record EventCreatedMessage
{
    public required Guid MessageId { get; init; }
    public required Guid EventId { get; init; }
    public required string Name { get; init; }
    public required DateTimeOffset OccurredAt { get; init; }
    public required Guid CorrelationId { get; init; }
    public int Version { get; init; } = 1;
}
