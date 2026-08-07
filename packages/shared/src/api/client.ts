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
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (configured) return configured
  // 로컬 개발: Vite 프록시로 same-origin 호출 (CORS/Load failed 방지)
  if (import.meta.env.DEV) return ''
  return 'http://127.0.0.1:8787'
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

function networkErrorMessage(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err)
  if (
    /load failed|failed to fetch|networkerror|network request failed|fetch failed/i.test(
      raw,
    )
  ) {
    return 'API 서버에 연결할 수 없습니다. 터미널에서 `npm run dev:api`가 실행 중인지 확인해 주세요.'
  }
  return raw || 'Request failed'
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

  let res: Response
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers,
    })
  } catch (err) {
    throw new ApiClientError(0, networkErrorMessage(err))
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      (data as ApiError).error || res.statusText || 'Request failed',
    )
  }
  return data as T
}
