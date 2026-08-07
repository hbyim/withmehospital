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

export function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR').format(price) + '원'
}
