import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { GetTokenModal } from '../GetTokenModal'
import { Button } from '../../atoms/Button'

export type AppPage = 'list' | 'register' | 'detail'

export interface MainLayoutProps {
  children: React.ReactNode
  currentPage?: AppPage
  onNavigate?: (page: AppPage, eventId?: string) => void
}

export function MainLayout({ children, currentPage, onNavigate }: MainLayoutProps) {
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const { isAuthenticated, clearToken } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-1" aria-label="Principal">
            {onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('list')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    currentPage === 'list' || currentPage === 'detail'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Ver eventos
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    currentPage === 'register'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Registrar evento
                </button>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5"
              title={isAuthenticated ? 'Con sesión' : 'Sin sesión'}
              aria-label={isAuthenticated ? 'Con sesión' : 'Sin sesión'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isAuthenticated
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                    : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                }`}
              />
            </span>
            {isAuthenticated ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => setTokenModalOpen(true)}>
                  Cambiar token
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearToken}>
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setTokenModalOpen(true)}
              >
                Obtener JWT
              </Button>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        {children}
      </div>
      <GetTokenModal isOpen={tokenModalOpen} onClose={() => setTokenModalOpen(false)} />
    </div>
  )
}
