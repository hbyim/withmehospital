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

let tokenKey = 'mosimi-auth-token'

/** 고객/매니저 앱이 같은 origin에서 토큰이 덮이지 않도록 분리 */
export function configureAuthStorage(key: string) {
  tokenKey = key
}

export function getApiBase() {
  return (
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
    'http://localhost:8787'
  )
}

export function getToken() {
  return localStorage.getItem(tokenKey)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(tokenKey, token)
  else localStorage.removeItem(tokenKey)
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
