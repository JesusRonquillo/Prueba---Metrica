/**
 * Base URL de la API.
 * - Producción (build con VITE_API_URL vacío): '' → peticiones relativas al mismo origen (ALB).
 * - Local: sin variable o VITE_API_URL=http://localhost:5151
 */
const raw = import.meta.env.VITE_API_URL
export const API_BASE_URL =
  raw === '' || (typeof raw === 'string' && raw.trim() === '')
    ? ''
    : (raw || 'http://localhost:5151').replace(/\/$/, '')

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${p}` : p
}
