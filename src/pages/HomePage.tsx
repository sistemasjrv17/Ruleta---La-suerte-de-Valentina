import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { useStore } from '../store/Store'

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

export function HomePage() {
  const { raffle, loading } = useStore()

  return (
    <div className="home stack">
      <section className="home-hero">
        <div className="home-hero__card">
          <div className="home-hero__grid">
            <div className="home-hero__copy">
              <span className="home-badge">
                <span className="home-badge__heart" aria-hidden="true">
                  ♥
                </span>
                Rifa en línea
              </span>

              <BrandMark as="h1" className="hero__brand-wrap" />

              <p className="home-hero__lead">
                Elige tus números a mano o deja que la ruleta te asigne boletos al azar. Aparta, paga
                y sube tu comprobante para entrar al sorteo.
              </p>

              <div className="hero__actions">
                <Link className="btn btn--gold btn--cta" to="/boletos">
                  Elegir boletos
                  <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn btn--soft" to="/verificar">
                  Verificar compra
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="home-hero__visual" aria-hidden="true">
              <div className="wheel-stage">
                <span className="deco deco--spark-1">✦</span>
                <span className="deco deco--spark-2">✧</span>
                <span className="deco deco--heart-1">♥</span>
                <span className="deco deco--heart-2">♥</span>
                <span className="deco deco--heart-3">♥</span>
                <div className="wheel-pointer">
                  <span>♥</span>
                </div>
                <div className="wheel" />
              </div>
            </div>
          </div>

          <div className="home-features">
            <div className="home-feature">
              <span className="home-feature__icon home-feature__icon--pink" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>100% Seguro</strong>
                <p>Tus datos están protegidos</p>
              </div>
            </div>
            <div className="home-feature">
              <span className="home-feature__icon home-feature__icon--blue" aria-hidden="true">
                ❍
              </span>
              <div>
                <strong>Pagos fáciles</strong>
                <p>Mercado Pago rápido y simple</p>
              </div>
            </div>
            <div className="home-feature">
              <span className="home-feature__icon home-feature__icon--lilac" aria-hidden="true">
                ✿
              </span>
              <div>
                <strong>Sorteo transparente</strong>
                <p>Premios y resultados claros</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section home-below">
        <div className="panel home-offer">
          <div className="home-offer__head">
            <div className="home-offer__prize">
              <span className="eyebrow">{raffle.name}</span>
              <h2>{loading ? 'Cargando premio…' : raffle.title}</h2>
              <div className="home-offer__meta">
                <span className="home-chip">
                  Boleto <strong>{formatMoney(raffle.ticketPrice)}</strong>
                </span>
                {raffle.reserveMinutes ? (
                  <span className="home-chip home-chip--soft">
                    {raffle.reserveMinutes} min para pagar
                  </span>
                ) : null}
              </div>
            </div>
            <Link className="btn btn--gold" to="/boletos">
              Participar ahora
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="home-offer__packages">
            <div className="home-offer__packages-title">
              <h3>Elige un paquete</h3>
              <p className="muted">El costo escala según cuántos números elijas.</p>
            </div>
            <div className="price-grid price-grid--offer">
              {raffle.packages.map((p) => (
                <Link
                  key={p.amount}
                  className="price-card"
                  to={`/boletos?qty=${p.amount}&mode=random`}
                >
                  <strong>{formatMoney(p.price)}</strong>
                  <span>{p.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
