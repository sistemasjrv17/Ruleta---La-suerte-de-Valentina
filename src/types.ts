export type TicketStatus = 'available' | 'reserved' | 'paid'

export type OrderStatus = 'pending_payment' | 'proof_uploaded' | 'paid' | 'expired' | 'rejected'

export type PaymentMethodType = 'mercadopago'

export interface PricePackage {
  amount: number
  price: number
  label: string
}

export interface PaymentAccount {
  id: string
  type: PaymentMethodType
  bank: string
  name: string
  clabe?: string
  card?: string
  note?: string
}

export interface Raffle {
  id: string
  name: string
  title: string
  prize: string
  prizeAmount: number
  totalTickets: number
  digits: number
  ticketPrice: number
  packages: PricePackage[]
  reserveMinutes: number
  drawDate: string
  drawNote: string
  isActive: boolean
  soldCount: number
  reservedCount: number
}

export interface Buyer {
  fullName: string
  phone: string
  state: string
}

export interface Order {
  id: string
  raffleId: string
  tickets: number[]
  buyer: Buyer
  total: number
  status: OrderStatus
  paymentMethod?: PaymentMethodType
  proofFileName?: string
  createdAt: string
  expiresAt: string
}

export interface SiteConfig {
  brand: string
  tagline: string
  whatsapp: string
  whatsappDisplay: string
  paymentWarning: string
}
