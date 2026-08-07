import { queryOne } from './db'
import { hashPassword } from './lib/auth'
import { newId } from './lib/models'
import { execute } from './db'

/** 유저가 하나도 없을 때만 시드 (Render 첫 배포용) */
export default async function seedIfEmpty() {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM users',
  )
  if (Number(existing?.count || 0) > 0) {
    console.log('[seed] users already exist — skip')
    return
  }

  console.log('[seed] empty database — inserting demo data')

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

  for (const s of services) {
    await execute(
      `INSERT INTO services (id, category, name, description, base_price, unit, duration_hint, icon, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       ON CONFLICT (id) DO NOTHING`,
      [...s],
    )
  }

  const customerId = newId('cus')
  await execute(
    `INSERT INTO users (id, role, email, phone, name, password_hash)
     VALUES ($1, 'customer', $2, $3, $4, $5)`,
    [
      customerId,
      'customer@mosimi.local',
      '010-1234-5678',
      '김모시',
      await hashPassword('customer123'),
    ],
  )

  const managers = [
    {
      email: 'seoyeon@mosimi.local',
      name: '김서연',
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
      rating: 4.8,
      reviews: 168,
      years: 4,
      specialties: ['투석 동행', '건강검진', '병원 돌봄'],
      bio: '투석·검진 일정 관리에 익숙하고 이동 동선 파악이 빠릅니다.',
      color: '#2D6A9F',
      region: '서울 마포',
    },
  ]

  for (const m of managers) {
    const id = newId('mgr')
    await execute(
      `INSERT INTO users (id, role, email, phone, name, password_hash)
       VALUES ($1, 'manager', $2, $3, $4, $5)`,
      [id, m.email, '010-0000-0000', m.name, await hashPassword('manager123')],
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

  console.log('[seed] demo accounts ready (customer@ / seoyeon@ …)')
}
