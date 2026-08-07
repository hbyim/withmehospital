import { useCallback, useEffect, useState } from 'react'
import { api } from './client'
import type { ServiceCategory, ServiceItem } from '../data/services'

export async function fetchServices(category?: ServiceCategory) {
  const q = category ? `?category=${category}` : ''
  const data = await api<{ services: ServiceItem[] }>(`/api/services${q}`)
  return data.services
}

export async function fetchService(id: string) {
  const data = await api<{ service: ServiceItem }>(`/api/services/${id}`)
  return data.service
}

export function useServices() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setServices(await fetchServices())
    } catch (e) {
      setError(e instanceof Error ? e.message : '서비스 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    services,
    companionServices: services.filter((s) => s.category === 'companion'),
    careServices: services.filter((s) => s.category === 'care'),
    getById: (id: string) => services.find((s) => s.id === id),
    loading,
    error,
    refresh,
  }
}
