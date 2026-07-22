export type Manager = {
  id: string
  name: string
  rating: number
  reviews: number
  experienceYears: number
  specialties: string[]
  distanceKm: number
  bio: string
  color: string
}

export const managers: Manager[] = [
  {
    id: 'm1',
    name: '김서연',
    rating: 4.9,
    reviews: 214,
    experienceYears: 6,
    specialties: ['병원 동행', '노인 돌봄', '입·퇴원'],
    distanceKm: 1.2,
    bio: '대형병원 동행 경험이 풍부하며, 어르신과 소통을 잘합니다.',
    color: '#1A7A72',
  },
  {
    id: 'm2',
    name: '박준호',
    rating: 4.8,
    reviews: 168,
    experienceYears: 4,
    specialties: ['투석 동행', '건강검진', '병원 돌봄'],
    distanceKm: 2.4,
    bio: '투석·검진 일정 관리에 익숙하고 이동 동선 파악이 빠릅니다.',
    color: '#2D6A9F',
  },
  {
    id: 'm3',
    name: '이하늘',
    rating: 4.95,
    reviews: 301,
    experienceYears: 8,
    specialties: ['아이 돌봄', '가정 돌봄', '한시간 동행'],
    distanceKm: 0.8,
    bio: '아이·가정 돌봄 전문. 보호자 보고를 꼼꼼히 남깁니다.',
    color: '#C46B4A',
  },
  {
    id: 'm4',
    name: '최민지',
    rating: 4.7,
    reviews: 97,
    experienceYears: 3,
    specialties: ['병원 동행', '기타 동행', '노인 돌봄'],
    distanceKm: 3.1,
    bio: '차분한 케어로 초진·외래 동행에 강점이 있습니다.',
    color: '#5B6EAE',
  },
]

export function pickNearbyManager(seed = Date.now()) {
  const index = seed % managers.length
  return managers[index]
}
