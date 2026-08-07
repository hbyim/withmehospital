import { resolve } from 'node:path'
import { config } from 'dotenv'
import { execute, migrate, pool } from './db'
import { hashPassword } from './lib/auth'
import { newId } from './lib/models'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), 'apps/api/.env') })
config()

const services = [
  ['hospital', 'companion', '병원 동행', '집 출발부터 접수·진료 대기·귀가까지 함께합니다.', 35000, '3시간', '기본 3시간', 'hospital'],
  ['one-hour', 'companion', '한시간 전용 동행', '짧은 병원 방문이나 간단한 동행이 필요할 때.', 18000, '1시간', '기본 1시간', 'clock'],
  ['dialysis', 'companion', '투석 전용 동행', '정기 투석 일정에 맞춰 이동과 대기를 지원합니다.', 40000, '회', '평균 4시간', 'dialysis'],
  ['checkup', 'companion', '건강검진 동행', '검진 접수부터 결과 상담까지 동행합니다.', 45000, '회', '반나절', 'checkup'],
  ['admission', 'companion', '입·퇴원 동행', '입원·퇴원 수속과 짐 정리를 돕니다.', 50000, '회', '기본 4시간', 'bed'],
  ['other-companion', 'companion', '기타 동행', '약국, 관공서, 은행 등 일상 동행이 필요할 때.', 25000, '2시간', '기본 2시간', 'walk'],
  ['elder', 'care', '노인 돌봄', '일상 케어, 약 복용 확인, 말벗 등 맞춤 돌봄.', 30000, '3시간', '기본 3시간', 'elder'],
  ['child', 'care', '아이 돌봄', '등하원·놀이·간단한 학습을 돌봐드립니다.', 28000, '3시간', '기본 3시간', 'child'],
  ['home', 'care', '가정 돌봄', '가사 보조와 생활 돌봄을 함께 제공합니다.', 32000, '3시간', '기본 3시간', 'home'],
  ['hospital-care', 'care', '병원 돌봄', '입원 중 병실 돌봄과 간병 보조를 지원합니다.', 55000, '6시간', '주간/야간', 'nurse'],
  ['other-care', 'care', '기타 돌봄', '상황에 맞는 맞춤형 돌봄을 상담 후 배정합니다.', 30000, '3시간', '상담 후 확정', 'heart'],
] as const

const managers = [
  {
    email: 'seoyeon@mosimi.local',
    name: '김서연',
    password: 'manager123',
    rating: 4.9,
    reviews: 214,
    years: 6,
    specialties: ['병원 동행', '노인 돌봄', '입·퇴원'],
    bio: '대형병원 동행 경험이 풍부하며, 어르신과 소통을 잘합니다.',
    color: '#1A7A72',
    region: '서울 강남',
  },
  {
    email: 'junho@mosimi.local',
    name: '박준호',
    password: 'manager123',
    rating: 4.8,
    reviews: 168,
    years: 4,
    specialties: ['투석 동행', '건강검진', '병원 돌봄'],
    bio: '투석·검진 일정 관리에 익숙하고 이동 동선 파악이 빠릅니다.',
    color: '#2D6A9F',
    region: '서울 마포',
  },
  {
    email: 'haneul@mosimi.local',
    name: '이하늘',
    password: 'manager123',
    rating: 4.95,
    reviews: 301,
    years: 8,
    specialties: ['아이 돌봄', '가정 돌봄', '한시간 동행'],
    bio: '아이·가정 돌봄 전문. 보호자 보고를 꼼꼼히 남깁니다.',
    color: '#C46B4A',
    region: '서울 송파',
  },
  {
    email: 'minji@mosimi.local',
    name: '최민지',
    password: 'manager123',
    rating: 4.7,
    reviews: 97,
    years: 3,
    specialties: ['병원 동행', '기타 동행', '노인 돌봄'],
    bio: '차분한 케어로 초진·외래 동행에 강점이 있습니다.',
    color: '#5B6EAE',
    region: '서울 강서',
  },
]

async function seed() {
  await migrate()

  await execute('DELETE FROM push_subscriptions')
  await execute('DELETE FROM payments')
  await execute('DELETE FROM booking_declines')
  await execute('DELETE FROM bookings')
  await execute('DELETE FROM manager_profiles')
  await execute('DELETE FROM users')
  await execute('DELETE FROM services')

  for (const s of services) {
    await execute(
      `INSERT INTO services (id, category, name, description, base_price, unit, duration_hint, icon, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [...s],
    )
  }

  const customerId = newId('cus')
  const customerHash = await hashPassword('customer123')
  await execute(
    `INSERT INTO users (id, role, email, phone, name, password_hash)
     VALUES ($1, 'customer', $2, $3, $4, $5)`,
    [
      customerId,
      'customer@mosimi.local',
      '010-1234-5678',
      '김모시',
      customerHash,
    ],
  )

  const managerIds: string[] = []
  for (const m of managers) {
    const id = newId('mgr')
    managerIds.push(id)
    const hash = await hashPassword(m.password)
    await execute(
      `INSERT INTO users (id, role, email, phone, name, password_hash)
       VALUES ($1, 'manager', $2, $3, $4, $5)`,
      [id, m.email, '010-0000-0000', m.name, hash],
    )
    await execute(
      `INSERT INTO manager_profiles
       (user_id, rating, reviews, experience_years, specialties_json, bio, color, online, region)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)`,
      [
        id,
        m.rating,
        m.reviews,
        m.years,
        JSON.stringify(m.specialties),
        m.bio,
        m.color,
        m.region,
      ],
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  const openBookings = [
    {
      id: newId('bk'),
      service: 'hospital',
      date: today,
      time: '15:30',
      hours: 3,
      pickup: '서울시 송파구 잠실동',
      destination: '서울아산병원',
      careTarget: '어머니',
      note: '휠체어 필요 · 외래 예약 있음',
      price: 35000,
      name: '이보호',
    },
    {
      id: newId('bk'),
      service: 'elder',
      date: tomorrowStr,
      time: '09:00',
      hours: 4,
      pickup: '서울시 마포구 연남동',
      destination: '자택 / 돌봄 장소',
      careTarget: '아버지',
      note: '오후 약 복용 확인 부탁드립니다',
      price: 40000,
      name: '박신청',
    },
    {
      id: newId('bk'),
      service: 'dialysis',
      date: tomorrowStr,
      time: '07:30',
      hours: 4,
      pickup: '서울시 강남구 대치동',
      destination: '강남세브란스병원',
      careTarget: '본인',
      note: '',
      price: 40000,
      name: '최이용',
    },
  ]

  for (const b of openBookings) {
    await execute(
      `INSERT INTO bookings (
        id, customer_id, manager_id, service_id, status, date, time, duration_hours,
        pickup, destination, care_target, note, price, payment_status, customer_name
      ) VALUES ($1, $2, NULL, $3, 'matching', $4, $5, $6, $7, $8, $9, $10, $11, 'unpaid', $12)`,
      [
        b.id,
        customerId,
        b.service,
        b.date,
        b.time,
        b.hours,
        b.pickup,
        b.destination,
        b.careTarget,
        b.note,
        b.price,
        b.name,
      ],
    )
  }

  await execute(
    `INSERT INTO bookings (
      id, customer_id, manager_id, service_id, status, date, time, duration_hours,
      pickup, destination, care_target, note, price, payment_status, customer_name, accepted_at
    ) VALUES ($1, $2, $3, 'hospital', 'confirmed', $4, '14:00', 3,
      '서울시 마포구 연남동', '세브란스병원', '아버지', '휠체어 필요', 35000, 'unpaid', '김모시', NOW())`,
    [newId('bk'), customerId, managerIds[0], today],
  )

  console.log('Seed complete (PostgreSQL)')
  console.log('Customer: customer@mosimi.local / customer123')
  console.log('Manager:  seoyeon@mosimi.local / manager123 (and junho/haneul/minji)')
}

seed()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
