import type { Buyer, Order, OrderStatus, PaymentAccount, PaymentMethodType, Raffle, SiteConfig } from '../types'
import { activeRaffle, paymentAccounts, seedOrders, siteConfig, takenTickets as seedTaken } from '../data/mock'

const API_URL = (import.meta.env.VITE_SHEETS_API_URL as string | undefined)?.trim() || ''
const REQUEST_TIMEOUT_MS = 25000
const MAX_RETRIES = 3

export function isSheetsConfigured() {
  return Boolean(API_URL)
}

export interface BootstrapPayload {
  site: SiteConfig
  raffle: Raffle
  accounts: PaymentAccount[]
  orders: Order[]
  taken: number[]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(err: Error, data?: { error?: string; conflict?: unknown }) {
  if (data?.conflict) return false
  const msg = (data?.error || err.message || '').toLowerCase()
  if (msg.includes('disponibles') || msg.includes('no encontrada') || msg.includes('no válida')) {
    return false
  }
  if (msg.includes('ocupado')) return true
  if (err.name === 'AbortError') return true
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('inválida')) return true
  return true
}

async function sheetsFetch(url: string, init?: RequestInit) {
  let lastError: Error = new Error('No se pudo completar la solicitud')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        ...init,
        redirect: 'follow',
        signal: controller.signal,
      })
      const text = await res.text()
      let data: { ok?: boolean; error?: string; conflict?: unknown }

      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error('Respuesta inválida del servidor. Reintentando…')
      }

      if (!res.ok || data?.ok === false) {
        const err = new Error(data?.error || 'No se pudo completar la solicitud')
        if (!isRetryableError(err, data) || attempt === MAX_RETRIES - 1) {
          throw err
        }
        lastError = err
      } else {
        return data
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (lastError.name === 'AbortError') {
        lastError = new Error('La solicitud tardó demasiado. Intenta de nuevo.')
      }
      if (!isRetryableError(lastError) || attempt === MAX_RETRIES - 1) {
        throw lastError
      }
    } finally {
      window.clearTimeout(timer)
    }

    await sleep(450 * 2 ** attempt)
  }

  throw lastError
}

function packagesFromPrice(ticketPrice: number) {
  return [1, 5, 10, 20, 50, 100].map((amount) => ({
    amount,
    price: amount * ticketPrice,
    label: amount === 1 ? '1 boleto' : `${amount} boletos`,
  }))
}

function mapConfig(cfg: Record<string, string>): Pick<BootstrapPayload, 'site' | 'raffle' | 'accounts'> {
  const ticketPrice = Number(cfg.ticketPrice || activeRaffle.ticketPrice)
  const totalTickets = Number(cfg.totalTickets || activeRaffle.totalTickets)
  const digits = Number(cfg.digits || activeRaffle.digits)
  const reserveMinutes = Number(cfg.reserveMinutes || activeRaffle.reserveMinutes)

  const site: SiteConfig = {
    ...siteConfig,
    whatsapp: cfg.whatsapp || siteConfig.whatsapp,
    whatsappDisplay: cfg.whatsappDisplay || siteConfig.whatsappDisplay,
  }

  const raffle: Raffle = {
    ...activeRaffle,
    id: cfg.raffleId || activeRaffle.id,
    name: cfg.name || activeRaffle.name,
    title: cfg.title || activeRaffle.title,
    prize: cfg.title || activeRaffle.title,
    ticketPrice,
    totalTickets,
    digits,
    reserveMinutes,
    packages: packagesFromPrice(ticketPrice),
  }

  const accounts: PaymentAccount[] = [
    {
      id: 'acc-mp',
      type: 'mercadopago',
      bank: cfg.paymentBank || paymentAccounts[0].bank,
      name: cfg.paymentName || paymentAccounts[0].name,
      card: cfg.paymentCard || paymentAccounts[0].card,
      note: 'Transfiere o deposita a esta tarjeta de Mercado Pago. Concepto: tu nombre completo.',
    },
  ]

  return { site, raffle, accounts }
}

export function normalizeOrder(order: Order): Order {
  const raw = order.tickets as unknown
  let tickets: number[] = []

  if (Array.isArray(raw)) {
    tickets = raw
      .map((t) => Number(t))
      .filter((n) => Number.isFinite(n) && n >= 0 && n < 1e12)
  } else if (typeof raw === 'string') {
    tickets = raw
      .split(/[|;,]/)
      .map((t) => Number(t.trim()))
      .filter((n) => Number.isFinite(n) && n >= 0 && n < 1e12)
  }

  const looksBroken = tickets.length === 1 && tickets[0] > 1e12

  return {
    ...order,
    tickets: looksBroken ? [] : tickets,
  }
}

function normalizeOrders(orders: Order[]): Order[] {
  return orders.map(normalizeOrder)
}

export function computeTaken(orders: Order[]): number[] {
  const now = Date.now()
  const taken = new Set<number>()
  for (const o of orders) {
    if (o.status === 'paid') {
      o.tickets.forEach((t) => taken.add(t))
      continue
    }
    if (
      (o.status === 'pending_payment' || o.status === 'proof_uploaded') &&
      (!o.expiresAt || new Date(o.expiresAt).getTime() > now)
    ) {
      o.tickets.forEach((t) => taken.add(t))
    }
  }
  return Array.from(taken)
}

export async function fetchBootstrap(): Promise<BootstrapPayload & { connected: boolean }> {
  if (!API_URL) {
    return {
      connected: false,
      site: siteConfig,
      raffle: activeRaffle,
      accounts: paymentAccounts,
      orders: seedOrders,
      taken: Array.from(seedTaken),
    }
  }

  const data = await sheetsFetch(`${API_URL}?action=bootstrap`)
  const mapped = mapConfig((data as { config?: Record<string, string> }).config || {})
  const orders = normalizeOrders(((data as { orders?: Order[] }).orders || []) as Order[])
  const taken =
    ((data as { taken?: number[] }).taken as number[] | undefined) ?? computeTaken(orders)

  return {
    connected: true,
    ...mapped,
    orders,
    taken,
  }
}

export async function apiCreateOrder(input: {
  tickets: number[]
  buyer: Buyer
  total: number
}): Promise<Order> {
  if (!API_URL) {
    const now = Date.now()
    return {
      id: `ord-${now.toString(36)}`,
      raffleId: activeRaffle.id,
      tickets: input.tickets,
      buyer: input.buyer,
      total: input.total,
      status: 'pending_payment',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + activeRaffle.reserveMinutes * 60 * 1000).toISOString(),
    }
  }

  const data = await sheetsFetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'createOrder', ...input }),
  })
  return normalizeOrder((data as { order: Order }).order)
}

export async function apiAttachPayment(
  orderId: string,
  paymentMethod: PaymentMethodType,
  proofFileName: string,
): Promise<Order> {
  if (!API_URL) {
    throw new Error('LOCAL_ONLY')
  }
  const data = await sheetsFetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'attachPayment', orderId, paymentMethod, proofFileName }),
  })
  return normalizeOrder((data as { order: Order }).order)
}

export async function apiUpdateStatus(orderId: string, status: OrderStatus): Promise<Order> {
  if (!API_URL) {
    throw new Error('LOCAL_ONLY')
  }
  const data = await sheetsFetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'updateStatus', orderId, status }),
  })
  return normalizeOrder((data as { order: Order }).order)
}

export async function apiVerifyByPhone(phone: string): Promise<Order[]> {
  if (!API_URL) {
    const clean = phone.replace(/\D/g, '')
    return seedOrders.filter((o) => {
      const p = o.buyer.phone.replace(/\D/g, '')
      return p === clean || p.endsWith(clean)
    })
  }
  const data = await sheetsFetch(`${API_URL}?action=verify&phone=${encodeURIComponent(phone)}`)
  return normalizeOrders(((data as { orders?: Order[] }).orders || []) as Order[])
}
