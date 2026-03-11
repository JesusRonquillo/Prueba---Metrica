import { useState } from 'react'
import { createEvent, type CreateEventRequest, type CreateZoneRequest } from '../../../api/events'
import { useAuth } from '../../../context/AuthContext'
import { Alert } from '../../molecules/Alert'
import { FormField } from '../../molecules/FormField'
import { ZoneCard } from '../../molecules/ZoneCard'
import { Button } from '../../atoms/Button'
import { Label } from '../../atoms/Label'
import { Text } from '../../atoms/Text'

const initialZone: CreateZoneRequest = { name: '', price: 0, capacity: 0 }

export function EventForm() {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [zones, setZones] = useState<CreateZoneRequest[]>([{ ...initialZone }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { token } = useAuth()

  const validate = (): boolean => {
    const err: Record<string, string> = {}

    if (!name.trim()) err.name = 'El nombre del evento es obligatorio.'
    if (!date) err.date = 'La fecha es obligatoria.'
    if (!location.trim()) err.location = 'El lugar es obligatorio.'

    zones.forEach((z, i) => {
      if (!z.name.trim()) err[`zone_${i}_name`] = 'Nombre de zona obligatorio.'
      if (z.price < 0) err[`zone_${i}_price`] = 'El precio debe ser mayor o igual a 0.'
      if (z.capacity <= 0) err[`zone_${i}_capacity`] = 'La capacidad debe ser mayor a 0.'
    })

    if (zones.length === 0 || zones.every((z) => !z.name.trim() && z.price === 0 && z.capacity === 0)) {
      err.zones = 'Debe haber al menos una zona con datos.'
    }

    setFieldErrors(err)
    return Object.keys(err).length === 0
  }

  const addZone = () => setZones((prev) => [...prev, { ...initialZone }])

  const removeZone = (index: number) => {
    if (zones.length <= 1) return
    setZones((prev) => prev.filter((_, i) => i !== index))
  }

  const updateZone = (index: number, field: keyof CreateZoneRequest, value: string | number) => {
    setZones((prev) =>
      prev.map((z, i) => (i === index ? { ...z, [field]: value } : z))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!token) {
      setError('Necesitas un token para registrar eventos. Usa el botón «Obtener JWT» del encabezado.')
      return
    }
    if (!validate()) return

    const payload: CreateEventRequest = {
      name: name.trim(),
      date: new Date(date).toISOString(),
      location: location.trim(),
      zones: zones
        .filter((z) => z.name.trim() || z.price !== 0 || z.capacity !== 0)
        .map((z) => ({
          name: z.name.trim(),
          price: Number(z.price),
          capacity: Number(z.capacity),
        })),
    }

    if (payload.zones.length === 0) {
      setFieldErrors((prev) => ({
        ...prev,
        zones: 'Debe haber al menos una zona con nombre, precio y capacidad.',
      }))
      return
    }

    setLoading(true)
    try {
      const res = await createEvent(payload, token ?? undefined)
      setSuccess(`Evento creado correctamente. ID: ${res.id}`)
      setName('')
      setDate('')
      setLocation('')
      setZones([{ ...initialZone }])
      setFieldErrors({})
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el evento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-1">
        <FormField
          id="event-name"
          label="Nombre del evento"
          required
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Ej: Concierto en vivo"
          error={fieldErrors.name}
        />
        <FormField
          id="event-date"
          label="Fecha y hora"
          required
          type="datetime-local"
          value={date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
          error={fieldErrors.date}
        />
        <FormField
          id="event-location"
          label="Lugar"
          required
          value={location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
          placeholder="Ej: Lima"
          error={fieldErrors.location}
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <Label required>Zonas</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addZone}>
            + Añadir zona
          </Button>
        </div>
        {fieldErrors.zones && (
          <Text variant="error" className="mb-2" role="alert">
            {fieldErrors.zones}
          </Text>
        )}
        <div className="space-y-3">
          {zones.map((zone, index) => (
            <ZoneCard
              key={index}
              zone={zone}
              index={index}
              onUpdate={updateZone}
              onRemove={removeZone}
              canRemove={zones.length > 1}
              errors={{
                name: fieldErrors[`zone_${index}_name`],
                price: fieldErrors[`zone_${index}_price`],
                capacity: fieldErrors[`zone_${index}_capacity`],
              }}
            />
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="error">{error}</Alert>
      )}
      {success && (
        <Alert variant="success">{success}</Alert>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
      >
        Guardar evento
      </Button>
    </form>
  )
}
