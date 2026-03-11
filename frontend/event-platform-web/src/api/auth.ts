import { apiUrl } from './config'

export interface TokenRequest {
  userName?: string
  role?: string
}

export interface TokenResponse {
  token: string
  expires: string
}

export async function getToken(request: TokenRequest = {}): Promise<TokenResponse> {
  const res = await fetch(apiUrl('/auth/token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: request.userName ?? 'demo',
      role: request.role ?? 'Admin',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }

  return res.json()
}
