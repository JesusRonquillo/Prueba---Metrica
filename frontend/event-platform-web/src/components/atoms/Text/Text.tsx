import type { HTMLAttributes } from 'react'

export type TextVariant = 'body' | 'small' | 'caption' | 'error' | 'success'
export type TextAs = 'p' | 'span' | 'div'

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant
  as?: TextAs
}

const variantStyles: Record<TextVariant, string> = {
  body: 'text-slate-200',
  small: 'text-sm text-slate-400',
  caption: 'text-xs text-slate-500',
  error: 'text-sm text-red-400',
  success: 'text-sm text-emerald-400',
}

export function Text({
  variant = 'body',
  as: Component = 'p',
  className = '',
  ...props
}: TextProps) {
  return (
    <Component
      className={[variantStyles[variant], className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
