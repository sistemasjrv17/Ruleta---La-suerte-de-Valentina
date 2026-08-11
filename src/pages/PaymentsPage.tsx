import { useStore } from '../store/Store'

export function PaymentsPage() {
  const { accounts, site } = useStore()

  return (
    <div className="stack">
      <div>
        <span className="eyebrow">Métodos de pago</span>
        <h1>Cuentas activas</h1>
        <p className="muted">{site.paymentWarning}</p>
      </div>

      <div className="alert">
        Concepto de pago: usa tu <strong>nombre completo</strong>. Evita poner “rifa”, “boleto” o “pago”
        como único concepto. Soporte:{' '}
        <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">
          {site.whatsappDisplay}
        </a>
      </div>

      <div className="grid-2">
        {accounts.map((acc) => (
          <div className="panel panel--pad account-card" key={acc.id} style={{ boxShadow: 'var(--shadow)' }}>
            <span className="eyebrow">Mercado Pago</span>
            <h2>{acc.bank}</h2>
            <div className="copy-row">
              <span className="muted">Titular</span> <strong>{acc.name}</strong>
            </div>
            {acc.card && (
              <div className="copy-row">
                <span className="muted">Tarjeta</span> <strong>{acc.card}</strong>
              </div>
            )}
            {acc.note && <p className="muted">{acc.note}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
