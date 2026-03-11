import type { InputHTMLAttributes } from 'react'
import { Input } from '../../atoms/Input'
import { Label } from '../../atoms/Label'
import { Text } from '../../atoms/Text'

export interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  required?: boolean
}

export function FormField({
  id,
  label,
  error,
  required,
  className = '',
  ...inputProps
}: FormFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} required={required} className="mb-2">
        {label}
      </Label>
      <Input id={id} hasError={!!error} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...inputProps} />
      {error && (
        <Text id={`${id}-error`} variant="error" className="mt-1.5" role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}
