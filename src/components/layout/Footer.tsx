import logoFarmalink from '../../assets/logo-farmalink.png';
import { SocialLinks } from '../common/SocialLinks';
import './Footer.css';

interface FooterProps {
  onNavigate?: (view: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      {/* ── Franja superior decorativa ── */}
      <div className="footer-wave">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="var(--footer-bg)" />
        </svg>
      </div>

      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">

            {/* ── Columna Brand ── */}
            <div className="footer-col footer-col--brand">
              <a className="footer-logo" href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('home'); }}>
                <img src={logoFarmalink} alt="FarmaLink" className="footer-logo-img" />
              </a>
              <p className="footer-desc">
                Plataforma inteligente que facilita el acceso a medicamentos mediante 
                comparación de precios en tiempo real y recomendaciones personalizadas 
                para los ciudadanos de Bogotá.
              </p>
              <div className="footer-tagline">
                <span className="footer-tagline-icon" aria-hidden="true"></span>
                Encuentra. Compara. Ahorra.
              </div>
              {/* Redes sociales / badges */}
              <div className="footer-badges">
                <span className="footer-badge footer-badge--green">Datos Seguros</span>
                <span className="footer-badge footer-badge--blue"> Tiempo Real</span>
              </div>
              <SocialLinks />
            </div>

            {/* ── Columna Navegación ── */}
            <div className="footer-col">
              <h4 className="footer-col-title">
                <span className="footer-col-icon"></span>
                Navegación
              </h4>
              <ul className="footer-links">
                <li>
                  <a onClick={() => onNavigate?.('home')}>
                    <span className="footer-link-arrow">→</span> Inicio
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('buscar')}>
                    <span className="footer-link-arrow">→</span> Buscar
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('categoria')}>
                    <span className="footer-link-arrow">→</span> Categorías
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('mapa')}>
                    <span className="footer-link-arrow">→</span> Mapa de Farmacias
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('dashboard')}>
                    <span className="footer-link-arrow">→</span> Dashboard
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('quienes-somos')}>
                    <span className="footer-link-arrow">→</span> Quiénes Somos
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('desarrolladores')}>
                    <span className="footer-link-arrow">→</span> Equipo
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('faq')}>
                    <span className="footer-link-arrow">→</span> Preguntas Frecuentes
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('cart')}>
                    <span className="footer-link-arrow">→</span> Carrito
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('settings')}>
                    <span className="footer-link-arrow">→</span> Mi cuenta
                  </a>
                </li>
                <li>
                  <a onClick={() => onNavigate?.('login')}>
                    <span className="footer-link-arrow">→</span> Iniciar Sesión
                  </a>
                </li>
              </ul>
            </div>

            {/* ── Columna Contacto ── */}
            <div className="footer-col">
              <h4 className="footer-col-title">
                <span className="footer-col-icon"></span>
                Contacto
              </h4>
              <ul className="footer-contact-list">
                <li className="footer-contact-item">
                  <span className="footer-contact-icon" aria-hidden="true"></span>
                  <div>
                    <strong>Ubicación</strong>
                    <span>Bogotá, Colombia</span>
                  </div>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-icon"></span>
                  <div>
                    <strong>Email</strong>
                    <span>contacto@farmalink.co</span>
                  </div>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-icon"></span>
                  <div>
                    <strong>Soporte</strong>
                    <span>Lunes a Viernes 8am – 6pm</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* ── Columna Tech Stack ── */}
            <div className="footer-col">
              <h4 className="footer-col-title">
                <span className="footer-col-icon" aria-hidden="true"></span>
                Tecnología
              </h4>
              <ul className="footer-tech-list">
                <li className="footer-tech-item">
                  <span className="footer-tech-dot footer-tech-dot--react"></span>
                  React + TypeScript
                </li>
                <li className="footer-tech-item">
                  <span className="footer-tech-dot footer-tech-dot--node"></span>
                  Node.js + Express
                </li>
                <li className="footer-tech-item">
                  <span className="footer-tech-dot footer-tech-dot--db"></span>
                  PostgreSQL (Neon)
                </li>
                <li className="footer-tech-item">
                  <span className="footer-tech-dot footer-tech-dot--docker"></span>
                  Docker + Nginx
                </li>
              </ul>

              <div className="footer-status">
                <span className="footer-status-dot"></span>
                <span>Todos los servicios activos</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer Bottom ── */}
      <div className="footer-bottom">
        <div className="container">
          <div className="footer-bottom-inner">
            <span className="footer-copy">
              © {currentYear} FarmaLink Solutions. Todos los derechos reservados.
            </span>
            <span className="footer-divider-dot">·</span>
            <span className="footer-academic">
              Proyecto Académico · Bogotá, Colombia
            </span>
            <span className="footer-divider-dot">·</span>
            <span className="footer-made">
              Hecho <span className="footer-heart"></span> por el equipo FarmaLink
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
