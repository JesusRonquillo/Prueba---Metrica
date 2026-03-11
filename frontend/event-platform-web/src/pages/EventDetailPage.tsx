import { useEffect, useState } from 'react'
import { getEventById, type EventSummary } from '../api/events'
import { PageHeader } from '../components/organisms/PageHeader'
import { Alert } from '../components/molecules/Alert'
import { Button } from '../components/atoms/Button'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isEventFinished(event: EventSummary): boolean {
  return new Date(event.date) < new Date()
}

export interface EventDetailPageProps {
  eventId: string
  onBack: () => void
}

export function EventDetailPage({ eventId, onBack }: EventDetailPageProps) {
  const [event, setEvent] = useState<EventSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    getEventById(eventId)
      .then((data) => {
        if (!cancelled) setEvent(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el evento')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [eventId])

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-16" role="status">
        <span className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mb-4" />
        <p className="text-slate-400">Cargando evento...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <>
        <Button type="button" variant="ghost" onClick={onBack} className="mb-6">
          ← Volver a eventos
        </Button>
        <Alert variant="error">
          {error ?? 'Evento no encontrado'}
        </Alert>
      </>
    )
  }

  const finished = isEventFinished(event)

  return (
    <div className="animate-fade-in">
      <Button type="button" variant="ghost" onClick={onBack} className="mb-6">
        ← Volver a eventos
      </Button>
      <article
        className={`rounded-2xl border p-6 sm:p-8 ${
          finished
            ? 'border-slate-700/40 bg-slate-900/40'
            : 'border-slate-700/60 bg-slate-900/60 shadow-xl shadow-black/10'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <PageHeader
            title={event.name}
            description={`${formatDate(event.date)} · ${event.location}`}
          />
          <div className="flex items-center gap-2">
            {finished ? (
              <span className="rounded-full bg-slate-600/80 px-3 py-1.5 text-sm font-medium text-slate-300">
                Finalizado
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-400">
                Próximo
              </span>
            )}
            {event.status && event.status !== 'Draft' && (
              <span className="rounded-full bg-slate-600/50 px-3 py-1.5 text-sm text-slate-400">
                {event.status}
              </span>
            )}
          </div>
        </div>

        <section aria-labelledby="zonas-title">
          <h2 id="zonas-title" className="text-lg font-semibold text-white mb-4">
            Zonas
          </h2>
          <ul className="space-y-3">
            {event.zones.map((zone) => (
              <li
                key={zone.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800/50 px-4 py-3 border border-slate-700/40"
              >
                <span className="font-medium text-slate-200">{zone.name}</span>
                <span className="text-slate-400">
                  Precio: {zone.price === 0 ? 'Gratis' : `S/ ${zone.price}`} · Capacidad: {zone.capacity}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  )
}
