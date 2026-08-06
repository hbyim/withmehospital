import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { managers, type Manager } from '../data/managers'
import { MANAGER_SESSION_KEY } from './storage'

export type ManagerSession = {
  managerId: string
  online: boolean
  declinedIds: string[]
}

type ManagerContextValue = {
  manager: Manager
  session: ManagerSession
  setOnline: (online: boolean) => void
  switchManager: (id: string) => void
  declineRequest: (bookingId: string) => void
  isDeclined: (bookingId: string) => boolean
}

const ManagerContext = createContext<ManagerContextValue | null>(null)

function loadSession(): ManagerSession {
  try {
    const raw = localStorage.getItem(MANAGER_SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ManagerSession
      if (managers.some((m) => m.id === parsed.managerId)) return parsed
    }
  } catch {
    /* ignore */
  }
  return { managerId: 'm1', online: true, declinedIds: [] }
}

export function ManagerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ManagerSession>(() => loadSession())

  useEffect(() => {
    localStorage.setItem(MANAGER_SESSION_KEY, JSON.stringify(session))
  }, [session])

  const manager = useMemo(
    () => managers.find((m) => m.id === session.managerId) ?? managers[0],
    [session.managerId],
  )

  const setOnline = useCallback((online: boolean) => {
    setSession((prev) => ({ ...prev, online }))
  }, [])

  const switchManager = useCallback((id: string) => {
    setSession((prev) => ({ ...prev, managerId: id, declinedIds: [] }))
  }, [])

  const declineRequest = useCallback((bookingId: string) => {
    setSession((prev) => ({
      ...prev,
      declinedIds: prev.declinedIds.includes(bookingId)
        ? prev.declinedIds
        : [...prev.declinedIds, bookingId],
    }))
  }, [])

  const isDeclined = useCallback(
    (bookingId: string) => session.declinedIds.includes(bookingId),
    [session.declinedIds],
  )

  const value = useMemo(
    () => ({
      manager,
      session,
      setOnline,
      switchManager,
      declineRequest,
      isDeclined,
    }),
    [manager, session, setOnline, switchManager, declineRequest, isDeclined],
  )

  return (
    <ManagerContext.Provider value={value}>{children}</ManagerContext.Provider>
  )
}

export function useManager() {
  const ctx = useContext(ManagerContext)
  if (!ctx) throw new Error('useManager must be used within ManagerProvider')
  return ctx
}
