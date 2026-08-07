export type ApiUser = {
  id: string
  role: 'customer' | 'manager' | 'admin'
  email: string
  name: string
  phone?: string | null
}

export type ApiError = {
  error: string
  details?: unknown
}

const TOKEN_KEY = 'mosimi-auth-token'

export function getApiBase() {
  return (
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
    'http://localhost:8787'
  )
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiClientError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      (data as ApiError).error || res.statusText || 'Request failed',
    )
  }
  return data as T
}
