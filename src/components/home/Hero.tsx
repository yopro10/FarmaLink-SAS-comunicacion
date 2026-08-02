import type { DashboardData } from '../../types';
import iconBusqueda from '../../assets/icon-busqueda.png';
import iconIA from '../../assets/icon-ia.png';
import iconMapa from '../../assets/icon-mapa.png';
import iconPrecios from '../../assets/icon-precios.png';
import { SocialLinks } from '../common/SocialLinks';
import './Hero.css';

interface HeroProps {
  data: DashboardData | null;
  onSearchClick: () => void;
  onDashboardClick: () => void;
}

export function Hero({ data, onSearchClick, onDashboardClick }: HeroProps) {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-text fade-up visible">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-line" aria-hidden="true"></span>
              Plataforma inteligente de salud
            </div>
            <h1 className="hero-title">
              Encuentra medicamentos al<br />
              <span>mejor precio</span><br />
              en tiempo real
            </h1>
            <p className="hero-subtitle">
              Compara precios entre farmacias de Bogotá, verifica disponibilidad 
              y recibe recomendaciones inteligentes para tomar decisiones informadas.
            </p>
            <div className="hero-badges">
              <span className="badge">
                <img src={iconPrecios} alt="" className="badge-img" /> Precios en Tiempo Real
              </span>
              <span className="badge">
                <img src={iconIA} alt="" className="badge-img" /> Sugerencias Inteligentes
              </span>
              <span className="badge">
                <img src={iconMapa} alt="" className="badge-img" /> {data?.farmacias.length || 0} Farmacias en Bogotá
              </span>
              <span className="badge">
                <img src={iconBusqueda} alt="" className="badge-img" /> +{data?.medicamentos.length || 0} Medicamentos
              </span>
            </div>

            {/* ── Botones mejorados: llamativos, con iconos y animación ── */}
            <div className="hero-actions">
              <a
                href="#"
                className="btn-primary"
                onClick={(e) => { e.preventDefault(); onSearchClick(); }}
                aria-label="Ir al buscador de medicamentos"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                Buscar Medicamento
              </a>
              <a
                href="#"
                className="btn-secondary"
                onClick={(e) => { e.preventDefault(); onDashboardClick(); }}
                aria-label="Ver el dashboard de estadísticas"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                </svg>
                Ver Dashboard
              </a>
            </div>
            
            <SocialLinks />
          </div>

          <div
            className="hero-visual fade-up visible"
            style={{ transitionDelay: '0.2s' }}
          >
            <div className="hero-card-main">
              <div className="hero-card-label">Comparador en vivo</div>
              <div className="hero-search-demo">
                <img src={iconBusqueda} alt="" style={{width:"20px",height:"20px",objectFit:"contain"}} />
                <span>Acetaminofén 500mg...</span>
              </div>
              <div className="price-rows">
                <div className="price-row best">
                  <div className="price-row-left">
                    <span className="price-row-name">Droguería Chapinero</span>
                    <span className="price-row-dist">1.2 km · Abierto</span>
                  </div>
                  <div className="price-row-right">
                    <span className="price-val">$4.800</span>
                    <span className="price-badge-best">MEJOR</span>
                  </div>
                </div>
                <div className="price-row">
                  <div className="price-row-left">
                    <span className="price-row-name">Farmacias Cruz Verde</span>
                    <span className="price-row-dist">2.4 km · Abierto</span>
                  </div>
                  <div className="price-row-right">
                    <span className="price-val">$6.200</span>
                  </div>
                </div>
                <div className="price-row">
                  <div className="price-row-left">
                    <span className="price-row-name">Droguería Usaquén</span>
                    <span className="price-row-dist">3.1 km · Abierto</span>
                  </div>
                  <div className="price-row-right">
                    <span className="price-val">$7.500</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-card-floating">
              <img src={iconPrecios} alt="" className="float-icon-img" />
              <div className="float-text">
                <strong>Ahorrás $2.700</strong>
                <span>en esta búsqueda</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
