import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { Button } from '../../atoms/Button'
import { FormField } from '../../molecules/FormField'
import { Alert } from '../../molecules/Alert'

export interface GetTokenModalProps {
  onClose: () => void
  isOpen: boolean
}

export function GetTokenModal({ onClose, isOpen }: GetTokenModalProps) {
  const { fetchToken } = useAuth()
  const [userName, setUserName] = useState('demo')
  const [role, setRole] = useState('Admin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await fetchToken(userName, role)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo obtener el token.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      aria-modal="true"
      role="dialog"
      aria-labelledby="get-token-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-600/80 bg-slate-900 shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <h2 id="get-token-title" className="text-xl font-bold text-white mb-1">
            Obtener JWT
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Necesitas un token para poder registrar eventos. Elige usuario y rol (Admin o Promotor).
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              id="token-username"
              label="Usuario"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="demo"
            />
            <div>
              <label htmlFor="token-role" className="mb-2 block text-sm font-medium text-slate-300">
                Rol
              </label>
              <select
                id="token-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition"
              >
                <option value="Admin">Admin</option>
                <option value="Promotor">Promotor</option>
              </select>
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={loading} className="flex-1">
                Obtener token
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
