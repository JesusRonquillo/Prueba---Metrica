import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export function Input({ hasError, className = '', ...props }: InputProps) {
  return (
    <input
      className={[
        'w-full rounded-xl border bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
        hasError
          ? 'border-red-500/60 focus:border-red-500'
          : 'border-slate-600 hover:border-slate-500',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
