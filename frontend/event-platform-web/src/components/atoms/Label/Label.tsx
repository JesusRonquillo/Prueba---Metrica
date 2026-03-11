import type { LabelHTMLAttributes } from 'react'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ required, className = '', children, ...props }: LabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-slate-300 ${className}`.trim()}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-amber-400" aria-hidden>*</span>}
    </label>
  )
}
