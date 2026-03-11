import type { CreateZoneRequest } from '../../../api/events'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { Text } from '../../atoms/Text'

export interface ZoneCardProps {
  zone: CreateZoneRequest
  index: number
  onUpdate: (index: number, field: keyof CreateZoneRequest, value: string | number) => void
  onRemove: (index: number) => void
  canRemove: boolean
  errors?: { name?: string; price?: string; capacity?: string }
}

export function ZoneCard({
  zone,
  index,
  onUpdate,
  onRemove,
  canRemove,
  errors = {},
}: ZoneCardProps) {
  return (
    <div className="rounded-xl border border-slate-600/80 bg-slate-800/40 p-4 transition-colors hover:border-slate-500/80">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[140px] flex-1">
          <Input
            type="text"
            value={zone.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            placeholder="Nombre de la zona"
            hasError={!!errors.name}
            aria-label={`Zona ${index + 1} nombre`}
          />
          {errors.name && (
            <Text variant="error" className="mt-1">{errors.name}</Text>
          )}
        </div>
        <div className="w-28">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={zone.price === 0 ? '' : zone.price}
            onChange={(e) => onUpdate(index, 'price', e.target.valueAsNumber ?? 0)}
            placeholder="Precio (S/)"
            hasError={!!errors.price}
            aria-label={`Zona ${index + 1} precio`}
          />
          {errors.price && (
            <Text variant="error" className="mt-1">{errors.price}</Text>
          )}
        </div>
        <div className="w-28">
          <Input
            type="number"
            min={1}
            value={zone.capacity === 0 ? '' : zone.capacity}
            onChange={(e) => onUpdate(index, 'capacity', e.target.valueAsNumber ?? 0)}
            placeholder="Capacidad"
            hasError={!!errors.capacity}
            aria-label={`Zona ${index + 1} capacidad`}
          />
          {errors.capacity && (
            <Text variant="error" className="mt-1">{errors.capacity}</Text>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="shrink-0 text-slate-400 hover:text-red-400 disabled:opacity-50"
        >
          Quitar
        </Button>
      </div>
    </div>
  )
}
