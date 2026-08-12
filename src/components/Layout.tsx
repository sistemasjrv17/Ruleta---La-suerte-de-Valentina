import { NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { FacebookIcon, WhatsAppIcon } from './SocialIcons'
import { useStore } from '../store/Store'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/boletos', label: 'Boletos' },
  { to: '/pagos', label: 'Pagos' },
  { to: '/reglas', label: 'Reglas' },
  { to: '/verificar', label: 'Verificar' },
]

export function Layout() {
  const { site } = useStore()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container site-header__inner">
          <NavLink to="/" className="brand">
            <BrandMark showTagline tagline={site.tagline} />
          </NavLink>
          <nav className="nav">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span className="footer-brand">
            La suerte de Valentina
            <img src="/mono.jpeg" alt="" className="brand-mark__bow brand-mark__bow--sm" />
            <span>— rifa en línea</span>
          </span>
          <div className="site-footer__links">
            <a
              className="social-link social-link--whatsapp"
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon />
              <span>{site.whatsappDisplay}</span>
            </a>
            <a
              className="social-link social-link--facebook"
              href={site.facebookUrl}
              target="_blank"
              rel="noreferrer"
            >
              <FacebookIcon />
              <span>Facebook</span>
            </a>
            <NavLink to="/reglas">Reglas</NavLink>
          </div>
        </div>
      </footer>
    </div>
  )
}
