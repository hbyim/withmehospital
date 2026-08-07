import { randomUUID } from 'node:crypto'
import { queryOne } from '../db'

export type BookingStatus =
  | 'matching'
  | 'matched'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type ServiceRow = {
  id: string
  category: 'companion' | 'care'
  name: string
  description: string
  base_price: number
  unit: string
  duration_hint: string
  icon: string
  active: boolean
}

export type UserRow = {
  id: string
  role: 'customer' | 'manager' | 'admin'
  email: string
  phone: string | null
  name: string
  password_hash: string
  created_at: string
}

export type ManagerProfileRow = {
  user_id: string
  rating: number
  reviews: number
  experience_years: number
  specialties_json: string
  bio: string
  color: string
  online: boolean
  base_lat: number | null
  base_lng: number | null
  region: string | null
}

export type BookingRow = {
  id: string
  customer_id: string
  manager_id: string | null
  service_id: string
  status: BookingStatus
  date: string
  time: string
  duration_hours: number
  pickup: string
  destination: string
  care_target: string
  note: string
  price: number
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded'
  customer_name: string | null
  created_at: string
  accepted_at: string | null
  updated_at: string
}

export function newId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

export function mapService(row: ServiceRow) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    basePrice: row.base_price,
    unit: row.unit,
    durationHint: row.duration_hint,
    icon: row.icon,
  }
}

export function mapManager(
  user: Pick<UserRow, 'id' | 'name'>,
  profile: ManagerProfileRow,
  distanceKm = 1.5,
) {
  let specialties: string[] = []
  try {
    specialties = JSON.parse(profile.specialties_json) as string[]
  } catch {
    specialties = []
  }
  return {
    id: user.id,
    name: user.name,
    rating: Number(profile.rating),
    reviews: profile.reviews,
    experienceYears: profile.experience_years,
    specialties,
    distanceKm,
    bio: profile.bio,
    color: profile.color,
    online: Boolean(profile.online),
    region: profile.region,
  }
}

export async function getService(id: string) {
  return queryOne<ServiceRow>(
    'SELECT * FROM services WHERE id = $1 AND active = TRUE',
    [id],
  )
}

export async function getUser(id: string) {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id])
}

export async function getManagerProfile(userId: string) {
  return queryOne<ManagerProfileRow>(
    'SELECT * FROM manager_profiles WHERE user_id = $1',
    [userId],
  )
}

export function calcPrice(basePrice: number, durationHours: number) {
  return basePrice + Math.max(0, durationHours - 3) * 10000
}

export async function mapBooking(row: BookingRow) {
  const service = (await getService(row.service_id)) ?? {
    id: row.service_id,
    category: 'companion' as const,
    name: row.service_id,
    description: '',
    base_price: row.price,
    unit: '',
    duration_hint: '',
    icon: 'heart',
    active: true,
  }

  let manager
  if (row.manager_id) {
    const user = await getUser(row.manager_id)
    const profile = await getManagerProfile(row.manager_id)
    if (user && profile) manager = mapManager(user, profile)
  }

  return {
    id: row.id,
    service: mapService(service),
    date: row.date,
    time: row.time,
    durationHours: row.duration_hours,
    pickup: row.pickup,
    destination: row.destination,
    careTarget: row.care_target,
    note: row.note,
    price: row.price,
    status: row.status,
    paymentStatus: row.payment_status,
    manager,
    customerName: row.customer_name ?? undefined,
    customerId: row.customer_id,
    managerId: row.manager_id ?? undefined,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? undefined,
    updatedAt: row.updated_at,
  }
}

export async function mapBookings(rows: BookingRow[]) {
  return Promise.all(rows.map((row) => mapBooking(row)))
}

export const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
  matching: ['matched', 'cancelled'],
  matched: ['confirmed', 'cancelled', 'matching'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}