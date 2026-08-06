export type ServiceCategory = 'companion' | 'care'

export type ServiceItem = {
  id: string
  category: ServiceCategory
  name: string
  description: string
  basePrice: number
  unit: string
  durationHint: string
  icon: string
}

export const companionServices: ServiceItem[] = [
  {
    id: 'hospital',
    category: 'companion',
    name: '병원 동행',
    description: '집 출발부터 접수·진료 대기·귀가까지 함께합니다.',
    basePrice: 35000,
    unit: '3시간',
    durationHint: '기본 3시간',
    icon: 'hospital',
  },
  {
    id: 'one-hour',
    category: 'companion',
    name: '한시간 전용 동행',
    description: '짧은 병원 방문이나 간단한 동행이 필요할 때.',
    basePrice: 18000,
    unit: '1시간',
    durationHint: '기본 1시간',
    icon: 'clock',
  },
  {
    id: 'dialysis',
    category: 'companion',
    name: '투석 전용 동행',
    description: '정기 투석 일정에 맞춰 이동과 대기를 지원합니다.',
    basePrice: 40000,
    unit: '회',
    durationHint: '평균 4시간',
    icon: 'dialysis',
  },
  {
    id: 'checkup',
    category: 'companion',
    name: '건강검진 동행',
    description: '검진 접수부터 결과 상담까지 동행합니다.',
    basePrice: 45000,
    unit: '회',
    durationHint: '반나절',
    icon: 'checkup',
  },
  {
    id: 'admission',
    category: 'companion',
    name: '입·퇴원 동행',
    description: '입원·퇴원 수속과 짐 정리를 돕습니다.',
    basePrice: 50000,
    unit: '회',
    durationHint: '기본 4시간',
    icon: 'bed',
  },
  {
    id: 'other-companion',
    category: 'companion',
    name: '기타 동행',
    description: '약국, 관공서, 은행 등 일상 동행이 필요할 때.',
    basePrice: 25000,
    unit: '2시간',
    durationHint: '기본 2시간',
    icon: 'walk',
  },
]

export const careServices: ServiceItem[] = [
  {
    id: 'elder',
    category: 'care',
    name: '노인 돌봄',
    description: '일상 케어, 약 복용 확인, 말벗 등 맞춤 돌봄.',
    basePrice: 30000,
    unit: '3시간',
    durationHint: '기본 3시간',
    icon: 'elder',
  },
  {
    id: 'child',
    category: 'care',
    name: '아이 돌봄',
    description: '등하원·놀이·간단한 학습을 돌봐드립니다.',
    basePrice: 28000,
    unit: '3시간',
    durationHint: '기본 3시간',
    icon: 'child',
  },
  {
    id: 'home',
    category: 'care',
    name: '가정 돌봄',
    description: '가사 보조와 생활 돌봄을 함께 제공합니다.',
    basePrice: 32000,
    unit: '3시간',
    durationHint: '기본 3시간',
    icon: 'home',
  },
  {
    id: 'hospital-care',
    category: 'care',
    name: '병원 돌봄',
    description: '입원 중 병실 돌봄과 간병 보조를 지원합니다.',
    basePrice: 55000,
    unit: '6시간',
    durationHint: '주간/야간',
    icon: 'nurse',
  },
  {
    id: 'other-care',
    category: 'care',
    name: '기타 돌봄',
    description: '상황에 맞는 맞춤형 돌봄을 상담 후 배정합니다.',
    basePrice: 30000,
    unit: '3시간',
    durationHint: '상담 후 확정',
    icon: 'heart',
  },
]

export const allServices = [...companionServices, ...careServices]

export function getServiceById(id: string) {
  return allServices.find((s) => s.id === id)
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR').format(price) + '원'
}
