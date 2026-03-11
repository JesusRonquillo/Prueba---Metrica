import { Text } from '../../atoms/Text'

export type AlertVariant = 'error' | 'success' | 'info'

export interface AlertProps {
  variant: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<AlertVariant, string> = {
  error: 'border-red-500/40 bg-red-950/40 text-red-200',
  success: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200',
  info: 'border-slate-500/40 bg-slate-800/50 text-slate-200',
}

export function Alert({ variant, title, children, className = '' }: AlertProps) {
  return (
    <div
      role="alert"
      className={[
        'rounded-xl border p-4',
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title && (
        <p className="font-semibold mb-1">{title}</p>
      )}
      <Text as="div" variant="body" className="text-inherit">
        {children}
      </Text>
    </div>
  )
}
