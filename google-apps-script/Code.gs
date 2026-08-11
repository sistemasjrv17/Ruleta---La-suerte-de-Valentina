/**
 * La suerte de Valentina — API sobre Google Sheets
 *
 * SETUP RÁPIDO:
 * 1. Crea una hoja de Google nueva.
 * 2. Extensiones > Apps Script > pega TODO este archivo > Guardar.
 * 3. Ejecuta una vez la función setupSheets() (autoriza permisos).
 * 4. Implementar > Nueva implementación > Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona
 * 5. Copia la URL y ponla en el archivo .env del proyecto:
 *    VITE_SHEETS_API_URL=https://script.google.com/macros/s/XXXX/exec
 *
 * HOJAS:
 * - Config: key | value  (edita title para cambiar "Gran premio $...")
 * - Ordenes: todas las compras / pagos
 *
 * Tras cada cambio importante: Implementar > Administrar implementaciones > Editar > Nueva versión.
 * Al subir comprobantes se crea la carpeta Drive "Comprobantes - La suerte de Valentina"
 * (vuelve a autorizar Drive si el script lo pide).
 */

const CONFIG_SHEET = 'Config'
const ORDERS_SHEET = 'Ordenes'

const ORDER_HEADERS = [
  'id',
  'raffleId',
  'tickets',
  'fullName',
  'phone',
  'state',
  'total',
  'status',
  'paymentMethod',
  'proofFileName',
  'createdAt',
  'expiresAt',
  'proofUrl',
]

const PROOFS_FOLDER_NAME = 'Comprobantes - La suerte de Valentina'
const MAX_PROOF_BYTES = 4 * 1024 * 1024

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  let config = ss.getSheetByName(CONFIG_SHEET)
  if (!config) config = ss.insertSheet(CONFIG_SHEET)
  config.clear()
  config.getRange(1, 1, 1, 2).setValues([['key', 'value']])
  config.getRange(2, 1, 12, 2).setValues([
    ['title', 'Gran premio $25,000 MXN'],
    ['name', 'Evento #001'],
    ['raffleId', 'rv-001'],
    ['ticketPrice', '1'],
    ['totalTickets', '10000'],
    ['digits', '4'],
    ['reserveMinutes', '20'],
    ['paymentBank', 'Mercado Pago'],
    ['paymentName', 'Luis Ángel Lara'],
    ['paymentCard', '5428 7806 9135 3171'],
    ['whatsapp', '5218127542796'],
    ['whatsappDisplay', '+52 1 81 2754 2796'],
  ])

  let orders = ss.getSheetByName(ORDERS_SHEET)
  if (!orders) orders = ss.insertSheet(ORDERS_SHEET)
  orders.clear()
  orders.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS])
  orders.setFrozenRows(1)
  orders.getRange('C:C').setNumberFormat('@')

  ensureOrdersHeaders_()
  getProofsFolder_()

  SpreadsheetApp.getUi?.()?.alert?.('Hojas Config y Ordenes listas. Ya puedes desplegar la Web App.')
}

/** Asegura columnas nuevas (p. ej. proofUrl) sin romper hojas existentes. */
function ensureOrdersHeaders_() {
  const sheet = getOrdersSheet_()
  const lastCol = Math.max(sheet.getLastColumn(), 1)
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String)
  ORDER_HEADERS.forEach(function (h) {
    if (headers.indexOf(h) === -1) {
      headers.push(h)
      sheet.getRange(1, headers.length).setValue(h)
    }
  })
  return headers
}

function getProofsFolder_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const file = DriveApp.getFileById(ss.getId())
  const parents = file.getParents()
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder()
  const existing = parent.getFoldersByName(PROOFS_FOLDER_NAME)
  if (existing.hasNext()) return existing.next()
  return parent.createFolder(PROOFS_FOLDER_NAME)
}

function saveProofToDrive_(orderId, fileName, mimeType, base64) {
  const name = String(fileName || '').trim()
  const data = String(base64 || '').trim()
  if (!name) throw new Error('Debes subir el comprobante de pago')
  if (!data) throw new Error('Debes subir el comprobante de pago')

  // base64 ocupa ~4/3 del tamaño del archivo
  const approxBytes = Math.floor((data.length * 3) / 4)
  if (approxBytes > MAX_PROOF_BYTES) {
    throw new Error('El comprobante pesa demasiado (máx. 4 MB)')
  }

  const mime = String(mimeType || 'application/octet-stream')
  const allowed =
    mime.indexOf('image/') === 0 ||
    mime === 'application/pdf' ||
    /\.(jpe?g|png|gif|webp|pdf)$/i.test(name)
  if (!allowed) throw new Error('Solo se permiten imágenes o PDF')

  const bytes = Utilities.base64Decode(data)
  const blob = Utilities.newBlob(bytes, mime, name)
  const safeName = String(orderId + '_' + name).replace(/[^\w.\-+() ]/g, '_')
  const file = getProofsFolder_().createFile(blob).setName(safeName)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  return file.getUrl()
}

function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'bootstrap'
    if (action === 'bootstrap') return json_(bootstrap_())
    if (action === 'verify') return json_(verifyByPhone_(e.parameter.phone || ''))
    if (action === 'config') return json_({ ok: true, config: getConfig_() })
    return json_({ ok: false, error: 'Acción GET no válida' })
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  }
}

function doPost(e) {
  try {
    const raw = e.postData && e.postData.contents ? e.postData.contents : '{}'
    const body = JSON.parse(raw)
    const action = body.action

    if (action === 'createOrder') return json_(withLock_(function () { return createOrder_(body) }))
    if (action === 'attachPayment') return json_(withLock_(function () { return attachPayment_(body) }))
    if (action === 'updateStatus') return json_(withLock_(function () { return updateStatus_(body) }))
    if (action === 'bootstrap') return json_(bootstrap_())

    return json_({ ok: false, error: 'Acción POST no válida' })
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock()
  const got = lock.tryLock(30000)
  if (!got) {
    return { ok: false, error: 'El sistema está ocupado. Intenta de nuevo en unos segundos.' }
  }
  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function getConfig_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET)
  if (!sheet) throw new Error('Falta hoja Config. Ejecuta setupSheets().')
  const values = sheet.getDataRange().getValues()
  const cfg = {}
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim()
    if (!key) continue
    cfg[key] = String(values[i][1] ?? '').trim()
  }
  return cfg
}

function getOrdersSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ORDERS_SHEET)
  if (!sheet) throw new Error('Falta hoja Ordenes. Ejecuta setupSheets().')
  return sheet
}

function parseTickets_(raw) {
  if (Array.isArray(raw)) {
    return raw.map(Number).filter(function (n) {
      return Number.isFinite(n)
    })
  }
  if (typeof raw === 'number') {
    return []
  }
  var s = String(raw == null ? '' : raw)
    .replace(/^'/, '')
    .trim()
  if (!s) return []
  if (/e[\+\-]/i.test(s)) return []
  return s
    .split(/[|;,]/)
    .map(function (t) {
      return t.trim()
    })
    .filter(Boolean)
    .map(Number)
    .filter(function (n) {
      return Number.isFinite(n)
    })
}

function ticketsToCell_(tickets) {
  return tickets.join('|')
}

function rowToOrder_(headers, row) {
  const obj = {}
  headers.forEach((h, i) => {
    obj[h] = row[i]
  })
  const tickets = parseTickets_(obj.tickets)
  return {
    id: String(obj.id),
    raffleId: String(obj.raffleId || ''),
    tickets,
    buyer: {
      fullName: String(obj.fullName || ''),
      phone: String(obj.phone || ''),
      state: String(obj.state || ''),
    },
    total: Number(obj.total || 0),
    status: String(obj.status || 'pending_payment'),
    paymentMethod: obj.paymentMethod ? String(obj.paymentMethod) : undefined,
    proofFileName: obj.proofFileName ? String(obj.proofFileName) : undefined,
    proofUrl: obj.proofUrl ? String(obj.proofUrl) : undefined,
    createdAt: String(obj.createdAt || ''),
    expiresAt: String(obj.expiresAt || ''),
  }
}

/** Lista órdenes y expira pendientes vencidos en una sola pasada (sin releer toda la hoja). */
function listOrdersAndExpire_() {
  const sheet = getOrdersSheet_()
  const values = sheet.getDataRange().getValues()
  if (values.length < 2) return []

  const headers = values[0].map(String)
  const statusIdx = headers.indexOf('status')
  const expiresIdx = headers.indexOf('expiresAt')
  const now = Date.now()
  const orders = []
  const expireRows = []

  for (let i = 1; i < values.length; i++) {
    if (!values[i][0]) continue

    let status = String(values[i][statusIdx] || '')
    const expiresAt = String(values[i][expiresIdx] || '')

    if (status === 'pending_payment' && expiresAt && new Date(expiresAt).getTime() < now) {
      status = 'expired'
      values[i][statusIdx] = 'expired'
      expireRows.push(i + 1)
    }

    const order = rowToOrder_(headers, values[i])
    order.status = status
    orders.push(order)
  }

  // Escritura por lote de expiraciones
  expireRows.forEach(function (row) {
    sheet.getRange(row, statusIdx + 1).setValue('expired')
  })
  if (expireRows.length) SpreadsheetApp.flush()

  return orders
}

function listOrders_() {
  return listOrdersAndExpire_()
}

function takenFromOrders_(orders) {
  const taken = []
  const now = Date.now()
  orders.forEach((o) => {
    if (o.status === 'paid') {
      taken.push.apply(taken, o.tickets)
      return
    }
    if (
      (o.status === 'pending_payment' || o.status === 'proof_uploaded') &&
      (!o.expiresAt || new Date(o.expiresAt).getTime() > now)
    ) {
      taken.push.apply(taken, o.tickets)
    }
  })
  return Array.from(new Set(taken))
}

function bootstrap_() {
  const config = getConfig_()
  const orders = listOrdersAndExpire_()
  return {
    ok: true,
    config,
    orders,
    taken: takenFromOrders_(orders),
  }
}

function verifyByPhone_(phone) {
  const clean = String(phone || '').replace(/\D/g, '')
  if (!clean) return { ok: true, orders: [] }
  const orders = listOrdersAndExpire_().filter((o) => {
    const p = String(o.buyer.phone || '').replace(/\D/g, '')
    return p === clean || p.endsWith(clean) || clean.endsWith(p)
  })
  return { ok: true, orders }
}

function createOrder_(body) {
  const config = getConfig_()
  const tickets = Array.isArray(body.tickets) ? body.tickets.map(Number) : []
  const buyer = body.buyer || {}
  if (!tickets.length) return { ok: false, error: 'Sin boletos' }
  if (!buyer.fullName || !buyer.phone) return { ok: false, error: 'Faltan datos del comprador' }

  // Idempotencia: si reenvían el mismo id, devolvemos la orden existente
  if (body.id) {
    const existing = findOrderRow_(String(body.id))
    if (existing) return { ok: true, order: existing.order }
  }

  const orders = listOrdersAndExpire_()
  const taken = new Set(takenFromOrders_(orders).map(Number))
  const conflict = tickets.filter((t) => taken.has(Number(t)))
  if (conflict.length) {
    return { ok: false, error: 'Algunos boletos ya no están disponibles', conflict: conflict }
  }

  const ticketPrice = Number(config.ticketPrice || 1)
  const total = Number(body.total != null ? body.total : tickets.length * ticketPrice)
  const reserveMinutes = Number(config.reserveMinutes || 20)
  const now = Date.now()
  const order = {
    id: body.id || ('ord-' + now.toString(36) + Math.floor(Math.random() * 1000).toString(36)),
    raffleId: config.raffleId || 'rv-001',
    tickets: tickets,
    buyer: {
      fullName: String(buyer.fullName),
      phone: String(buyer.phone),
      state: String(buyer.state || ''),
    },
    total: total,
    status: 'pending_payment',
    paymentMethod: '',
    proofFileName: '',
    proofUrl: '',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + reserveMinutes * 60 * 1000).toISOString(),
  }

  const sheet = getOrdersSheet_()
  ensureOrdersHeaders_()
  const ticketsCol = ORDER_HEADERS.indexOf('tickets') + 1
  sheet.appendRow([
    order.id,
    order.raffleId,
    ticketsToCell_(order.tickets),
    order.buyer.fullName,
    order.buyer.phone,
    order.buyer.state,
    order.total,
    order.status,
    order.paymentMethod,
    order.proofFileName,
    order.createdAt,
    order.expiresAt,
    order.proofUrl,
  ])
  const lastRow = sheet.getLastRow()
  sheet.getRange(lastRow, ticketsCol).setNumberFormat('@').setValue(ticketsToCell_(order.tickets))
  SpreadsheetApp.flush()

  return { ok: true, order: order }
}

function findOrderRow_(orderId) {
  const sheet = getOrdersSheet_()
  const values = sheet.getDataRange().getValues()
  const headers = values[0].map(String)
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(orderId)) {
      return { sheet: sheet, headers: headers, rowIndex: i + 1, row: values[i], order: rowToOrder_(headers, values[i]) }
    }
  }
  return null
}

function attachPayment_(body) {
  const found = findOrderRow_(body.orderId)
  if (!found) return { ok: false, error: 'Orden no encontrada' }

  const proofFileName = String(body.proofFileName || '').trim()
  const proofBase64 = String(body.proofBase64 || '').trim()
  const proofMimeType = String(body.proofMimeType || '').trim()
  if (!proofFileName || !proofBase64) {
    return { ok: false, error: 'Debes subir el comprobante de pago' }
  }

  let proofUrl
  try {
    proofUrl = saveProofToDrive_(body.orderId, proofFileName, proofMimeType, proofBase64)
  } catch (err) {
    return { ok: false, error: String(err.message || err) }
  }

  const headers = ensureOrdersHeaders_()
  const sheet = found.sheet
  const rowIndex = found.rowIndex
  const order = found.order
  const methodIdx = headers.indexOf('paymentMethod')
  const proofIdx = headers.indexOf('proofFileName')
  const proofUrlIdx = headers.indexOf('proofUrl')
  const statusIdx = headers.indexOf('status')

  sheet.getRange(rowIndex, methodIdx + 1).setValue(body.paymentMethod || 'mercadopago')
  sheet.getRange(rowIndex, proofIdx + 1).setValue(proofFileName)
  if (proofUrlIdx >= 0) sheet.getRange(rowIndex, proofUrlIdx + 1).setValue(proofUrl)
  sheet.getRange(rowIndex, statusIdx + 1).setValue('proof_uploaded')
  SpreadsheetApp.flush()

  return {
    ok: true,
    order: {
      id: order.id,
      raffleId: order.raffleId,
      tickets: order.tickets,
      buyer: order.buyer,
      total: order.total,
      status: 'proof_uploaded',
      paymentMethod: body.paymentMethod || 'mercadopago',
      proofFileName: proofFileName,
      proofUrl: proofUrl,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
    },
  }
}

function updateStatus_(body) {
  const found = findOrderRow_(body.orderId)
  if (!found) return { ok: false, error: 'Orden no encontrada' }
  const allowed = ['pending_payment', 'proof_uploaded', 'paid', 'expired', 'rejected']
  if (allowed.indexOf(body.status) === -1) return { ok: false, error: 'Estado no válido' }

  const order = found.order
  if (body.status === 'paid' && !(order.proofFileName || order.proofUrl)) {
    return { ok: false, error: 'No se puede aprobar sin comprobante de pago' }
  }

  const sheet = found.sheet
  const headers = ensureOrdersHeaders_()
  const rowIndex = found.rowIndex
  const statusIdx = headers.indexOf('status')
  sheet.getRange(rowIndex, statusIdx + 1).setValue(body.status)
  SpreadsheetApp.flush()

  return {
    ok: true,
    order: {
      id: order.id,
      raffleId: order.raffleId,
      tickets: order.tickets,
      buyer: order.buyer,
      total: order.total,
      status: body.status,
      paymentMethod: order.paymentMethod,
      proofFileName: order.proofFileName,
      proofUrl: order.proofUrl,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
    },
  }
}
