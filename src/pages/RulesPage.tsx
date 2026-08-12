import { FacebookIcon, WhatsAppIcon } from '../components/SocialIcons'
import { useStore } from '../store/Store'

export function RulesPage() {
  const { site } = useStore()

  return (
    <div className="stack rules">
      <div className="section__head">
        <div>
          <span className="eyebrow">Información oficial</span>
          <h1>Reglas de la rifa</h1>
          <p className="muted" style={{ margin: 0 }}>
            Condiciones de participación en {site.brand}.
          </p>
        </div>
      </div>

      <div className="panel panel--pad stack rules__block">
        <h2>¿Cómo se realiza el sorteo?</h2>
        <p>
          Nuestros sorteos se realizan en base a la Lotería Nacional para la Asistencia Pública
          mexicana.
        </p>
        <p>
          El ganador de {site.brand} será el participante cuyo número de boleto coincida con los
          resultados de alguno de los sorteos de Lotería Nacional (las bases y fechas serán
          publicadas en nuestra página oficial).
        </p>
      </div>

      <div className="panel panel--pad stack rules__block">
        <h2>Comprobante de pago obligatorio</h2>
        <div className="alert">
          <strong>IMPORTANTE:</strong> es requisito indispensable subir su comprobante de pago al
          sitio web. No será válido si lo enviaron por WhatsApp o Messenger.
        </div>
      </div>

      <div className="panel panel--pad stack rules__block">
        <h2>¿Qué sucede cuando el número ganador es un boleto no vendido?</h2>
        <p>
          Se elige un nuevo ganador realizando la misma dinámica en otra fecha cercana (se anunciará
          la nueva fecha).
        </p>
        <p>
          Esto significa que ¡tendrías el doble de oportunidades de ganar con tu mismo boleto!
        </p>
      </div>

      <div className="panel panel--pad stack rules__block">
        <h2>¿Dónde se publican a los ganadores?</h2>
        <p>
          En nuestra página oficial de Facebook {site.brand} puedes encontrar todos y cada uno de
          nuestros sorteos anteriores, así como las transmisiones en vivo con Lotería Nacional y las
          entregas de premios a los ganadores.
        </p>
        <p>
          Encuentra transmisión en vivo de los sorteos en nuestra página de Facebook en las fechas
          indicadas y a la hora indicada para cada sorteo. ¡No te lo pierdas!
        </p>
      </div>

      <div className="panel panel--pad stack rules__contact">
        <h2>Envíanos tus preguntas</h2>
        <p className="muted" style={{ margin: 0 }}>
          Estamos para ayudarte por WhatsApp o Facebook.
        </p>
        <div className="rules__actions">
          <a
            className="btn btn--whatsapp"
            href={`https://wa.me/${site.whatsapp}`}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
          <a className="btn btn--facebook" href={site.facebookUrl} target="_blank" rel="noreferrer">
            <FacebookIcon />
            Facebook
          </a>
        </div>
      </div>
    </div>
  )
}
