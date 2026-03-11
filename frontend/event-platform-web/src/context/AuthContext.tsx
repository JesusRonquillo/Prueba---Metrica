import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { getToken, type TokenResponse } from '../api/auth'

const STORAGE_KEY = 'eventplatform_jwt'

interface AuthContextValue {
  token: string | null
  setToken: (t: string | null) => void
  fetchToken: (userName?: string, role?: string) => Promise<TokenResponse>
  clearToken: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (token) {
      try {
        localStorage.setItem(STORAGE_KEY, token)
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }, [token])

  const setToken = useCallback((t: string | null) => {
    setTokenState(t)
  }, [])

  const fetchToken = useCallback(async (userName?: string, role?: string) => {
    const res = await getToken({ userName, role })
    setTokenState(res.token)
    return res
  }, [])

  const clearToken = useCallback(() => {
    setTokenState(null)
  }, [])

  const value: AuthContextValue = {
    token,
    setToken,
    fetchToken,
    clearToken,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
