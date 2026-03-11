import { apiUrl } from './config'

const JWT_TOKEN = import.meta.env.VITE_JWT_TOKEN || ''

export interface ZoneSummary {
  id: string
  name: string
  price: number
  capacity: number
}

export interface EventSummary {
  id: string
  name: string
  date: string
  location: string
  status: string
  zones: ZoneSummary[]
}

export async function getEvents(): Promise<EventSummary[]> {
  const res = await fetch(apiUrl('/events'))
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

export async function getEventById(id: string): Promise<EventSummary | null> {
  const res = await fetch(apiUrl(`/events/${id}`))
  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

export interface CreateZoneRequest {
  name: string
  price: number
  capacity: number
}

export interface CreateEventRequest {
  name: string
  date: string
  location: string
  zones: CreateZoneRequest[]
}

export interface CreateEventResponse {
  id: string
}

export async function createEvent(
  data: CreateEventRequest,
  token: string = JWT_TOKEN
): Promise<CreateEventResponse> {
  const res = await fetch(apiUrl('/events'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      name: data.name,
      date: data.date,
      location: data.location,
      zones: data.zones,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }

  return res.json()
}
