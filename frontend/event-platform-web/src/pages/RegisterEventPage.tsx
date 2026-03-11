import { PageHeader } from '../components/organisms/PageHeader'
import { EventForm } from '../components/organisms/EventForm'

export function RegisterEventPage() {
  return (
    <>
      <PageHeader
        title="Registrar evento"
        description="Crea un nuevo evento y define las zonas con precios y capacidad. Los asistentes recibirán una notificación cuando se publique."
      />
      <section
        className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur sm:p-8 animate-slide-up"
        aria-labelledby="form-title"
      >
        <h2 id="form-title" className="sr-only">
          Formulario de registro de evento
        </h2>
        <EventForm />
      </section>
    </>
  )
}
