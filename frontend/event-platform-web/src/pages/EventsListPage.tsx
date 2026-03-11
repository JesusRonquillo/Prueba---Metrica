import { useEffect, useState } from 'react'
import { getEvents, type EventSummary } from '../api/events'
import { PageHeader } from '../components/organisms/PageHeader'
import { Alert } from '../components/molecules/Alert'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isEventFinished(event: EventSummary): boolean {
  return new Date(event.date) < new Date()
}

export interface EventsListPageProps {
  onViewDetail?: (eventId: string) => void
}

export function EventsListPage({ onViewDetail }: EventsListPageProps) {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(null)
    getEvents()
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar eventos')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setShowDone(true)
        }
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!loading && showDone) {
      const t = setTimeout(() => setShowDone(false), 1800)
      return () => clearTimeout(t)
    }
  }, [loading, showDone])

  return (
    <>
      <PageHeader
        title="Eventos"
        description="Listado de eventos publicados. Los eventos finalizados se muestran con el estado correspondiente."
      />

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {!loading && showDone && (
        <div
          className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-2.5 text-emerald-400 animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <span className="text-sm font-medium">Listo</span>
        </div>
      )}

      {loading ? (
        <div className="animate-fade-in" role="status" aria-live="polite" aria-label="Cargando eventos">
          <p className="text-center text-slate-400 mb-8">Cargando eventos...</p>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 sm:p-6 animate-pulse"
                aria-hidden
              >
                <div className="h-5 w-3/4 rounded bg-slate-600/60 mb-3" />
                <div className="h-4 w-1/2 rounded bg-slate-600/40 mb-2" />
                <div className="h-4 w-1/3 rounded bg-slate-600/30" />
              </div>
            ))}
          </div>
        </div>
      ) : events.length === 0 ? (
        <section
          className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-8 text-center animate-fade-in-up"
          role="status"
        >
          <p className="text-slate-400">No hay eventos registrados.</p>
          <p className="mt-2 text-sm text-slate-500">Crea uno desde «Registrar evento».</p>
        </section>
      ) : (
        <ul className="space-y-4 animate-fade-in" aria-label="Listado de eventos">
          {events.map((event, index) => {
            const finished = isEventFinished(event)
            return (
              <li
                key={event.id}
                className="animate-list-item-in opacity-0"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <article
                  className={`rounded-2xl border p-5 sm:p-6 transition-smooth ${
                    finished
                      ? 'border-slate-700/40 bg-slate-900/40 opacity-85'
                      : 'border-slate-700/60 bg-slate-900/60 shadow-lg shadow-black/10'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-white">{event.name}</h2>
                      <p className="mt-1 text-slate-400">
                        {formatDate(event.date)} · {event.location}
                      </p>
                      {event.zones.length > 0 && (
                        <p className="mt-2 text-sm text-slate-500">
                          {event.zones.length} zona(s):{' '}
                          {event.zones.map((z) => `${z.name} (${z.capacity})`).join(', ')}
                        </p>
                      )}
                      {onViewDetail && (
                        <button
                          type="button"
                          onClick={() => onViewDetail(event.id)}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-400 hover:text-amber-300 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
                        >
                          Ver detalle
                          <span aria-hidden>→</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {finished ? (
                        <span
                          className="rounded-full bg-slate-600/80 px-3 py-1 text-xs font-medium text-slate-300"
                          aria-label="Evento finalizado"
                        >
                          Finalizado
                        </span>
                      ) : (
                        <span
                          className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400"
                          aria-label="Evento pendiente"
                        >
                          Próximo
                        </span>
                      )}
                      {event.status && event.status !== 'Draft' && (
                        <span className="rounded-full bg-slate-600/50 px-3 py-1 text-xs text-slate-400">
                          {event.status}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
