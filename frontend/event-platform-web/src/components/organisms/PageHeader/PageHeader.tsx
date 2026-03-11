export interface PageHeaderProps {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-10 animate-fade-in">
      <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-slate-400 max-w-xl">
          {description}
        </p>
      )}
    </header>
  )
}
