import { api } from '../api/client'

export type LatLng = { lat: number; lng: number }

export type BookingTracking = {
  bookingId: string
  status: string
  trackingActive: boolean
  shareLocation: boolean
  managerLocation: LatLng | null
  locationUpdatedAt: string | null
  distanceToPickupKm: number | null
  pickup: { address: string; location: LatLng | null }
  destination: { address: string; location: LatLng | null }
  polledAt: string
}

export async function fetchBookingTracking(bookingId: string) {
  return api<BookingTracking>(`/api/bookings/${bookingId}/tracking`)
}

export async function postManagerLocation(input: {
  lat: number
  lng: number
  accuracy?: number
}) {
  return api<{
    ok: boolean
    location: LatLng
    locationUpdatedAt?: string
    shareLocation?: boolean
  }>('/api/managers/me/location', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function setManagerShareLocation(shareLocation: boolean) {
  return api<{ manager: unknown }>('/api/managers/me', {
    method: 'PATCH',
    body: JSON.stringify({ shareLocation }),
  })
}
