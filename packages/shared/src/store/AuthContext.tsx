import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  api,
  configureAuthStorage,
  getToken,
  setToken,
  type ApiUser,
} from '../api/client'
import type { Manager } from '../data/managers'

type AuthState = {
  user: ApiUser | null
  manager: Manager | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  registerCustomer: (input: {
    email: string
    password: string
    name: string
    phone?: string
  }) => Promise<void>
  registerManager: (input: {
    email: string
    password: string
    name: string
    phone?: string
    specialties?: string[]
    experienceYears?: number
    bio?: string
    region?: string
  }) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({
  children,
  expectedRole,
  storageKey = 'mosimi-auth-token',
}: {
  children: ReactNode
  expectedRole?: 'customer' | 'manager'
  storageKey?: string
}) {
  configureAuthStorage(storageKey)

  const [user, setUser] = useState<ApiUser | null>(null)
  const [manager, setManager] = useState<Manager | null>(null)
  const [token, setTokenState] = useState<string | null>(() => {
    configureAuthStorage(storageKey)
    return getToken()
  })
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(
    (next: { token: string; user: ApiUser; manager?: Manager }) => {
      if (expectedRole && next.user.role !== expectedRole) {
        throw new Error(
          expectedRole === 'manager'
            ? '매니저 계정으로 로그인해 주세요.'
            : '고객 계정으로 로그인해 주세요.',
        )
      }
      configureAuthStorage(storageKey)
      setToken(next.token)
      setTokenState(next.token)
      setUser(next.user)
      setManager(next.manager ?? null)
    },
    [expectedRole, storageKey],
  )

  const refreshMe = useCallback(async () => {
    configureAuthStorage(storageKey)
    const t = getToken()
    if (!t) {
      setUser(null)
      setManager(null)
      setLoading(false)
      return
    }
    try {
      const data = await api<{ user: ApiUser; manager?: Manager }>('/api/me')
      if (expectedRole && data.user.role !== expectedRole) {
        setToken(null)
        setTokenState(null)
        setUser(null)
        setManager(null)
      } else {
        setUser(data.user)
        setManager(data.manager ?? null)
        setTokenState(t)
      }
    } catch {
      setToken(null)
      setTokenState(null)
      setUser(null)
      setManager(null)
    } finally {
      setLoading(false)
    }
  }, [expectedRole, storageKey])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const value = useMemo<AuthState>(
    () => ({
      user,
      manager,
      token,
      loading,
      login: async (email, password) => {
        const data = await api<{
          token: string
          user: ApiUser
          manager?: Manager
        }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        applySession(data)
      },
      registerCustomer: async (input) => {
        const data = await api<{ token: string; user: ApiUser }>(
          '/api/auth/register/customer',
          { method: 'POST', body: JSON.stringify(input) },
        )
        applySession(data)
      },
      registerManager: async (input) => {
        const data = await api<{ token: string; user: ApiUser }>(
          '/api/auth/register/manager',
          { method: 'POST', body: JSON.stringify(input) },
        )
        applySession(data)
        await refreshMe()
      },
      logout: () => {
        configureAuthStorage(storageKey)
        setToken(null)
        setTokenState(null)
        setUser(null)
        setManager(null)
      },
      refreshMe,
    }),
    [user, manager, token, loading, applySession, refreshMe, storageKey],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
