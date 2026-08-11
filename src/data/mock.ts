import type { Order, PaymentAccount, Raffle, SiteConfig } from '../types'

const UNIT = 1

const packageAmounts = [1, 5, 10, 20, 50, 100]

export const siteConfig: SiteConfig = {
  brand: 'La suerte de Valentina',
  tagline: 'Tu número. Tu momento. Tu suerte.',
  whatsapp: '5218127542796',
  whatsappDisplay: '+52 1 81 2754 2796',
  paymentWarning:
    'Después de apartar debes subir obligatoriamente tu comprobante de pago (máx. 4 MB). Tienes 20 minutos; sin comprobante los boletos se liberan.',
}

export const activeRaffle: Raffle = {
  id: 'rv-001',
  name: 'Evento #001',
  title: 'Gran premio $25,000 MXN',
  prize: 'Efectivo $25,000 MXN',
  prizeAmount: 25000,
  totalTickets: 10000,
  digits: 4,
  ticketPrice: UNIT,
  packages: packageAmounts.map((amount) => ({
    amount,
    price: amount * UNIT,
    label: amount === 1 ? '1 boleto' : `${amount} boletos`,
  })),
  reserveMinutes: 20,
  drawDate: '2026-08-20T19:00:00.000Z',
  drawNote: 'Jugamos con el resultado oficial de Lotería Nacional / Tris.',
  isActive: true,
  soldCount: 1240,
  reservedCount: 86,
}

export const paymentAccounts: PaymentAccount[] = [
  {
    id: 'acc-mp',
    type: 'mercadopago',
    bank: 'Mercado Pago',
    name: 'Luis Ángel Lara',
    card: '5428 7806 9135 3171',
    note: 'Transfiere o deposita a esta tarjeta de Mercado Pago. Concepto: tu nombre completo.',
  },
]

export const seedOrders: Order[] = [
  {
    id: 'ord-1001',
    raffleId: activeRaffle.id,
    tickets: [124, 889, 4502],
    buyer: { fullName: 'Ana López', phone: '6141112233', state: 'Chihuahua' },
    total: 3,
    status: 'proof_uploaded',
    paymentMethod: 'mercadopago',
    proofFileName: 'comprobante-ana.jpg',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 8).toISOString(),
  },
  {
    id: 'ord-1002',
    raffleId: activeRaffle.id,
    tickets: [77, 901],
    buyer: { fullName: 'Carlos Ruiz', phone: '6145556677', state: 'Durango' },
    total: 2,
    status: 'pending_payment',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'ord-1003',
    raffleId: activeRaffle.id,
    tickets: [3333],
    buyer: { fullName: 'María Gómez', phone: '6149990011', state: 'Sinaloa' },
    total: 1,
    status: 'paid',
    paymentMethod: 'mercadopago',
    proofFileName: 'pago-maria.png',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
]

/** Números mock ya tomados (pagados o reservados) para demo. */
export const takenTickets = new Set<number>([
  ...seedOrders.flatMap((o) => o.tickets),
  1, 7, 13, 21, 100, 250, 777, 1000, 2024, 5555, 9999,
])
