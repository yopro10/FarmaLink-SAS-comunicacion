import { PharmacyMap } from '../common/PharmacyMap';
import './MapView.css';

/**
 * MapView - Vista independiente del mapa de farmacias
 * @component
 * @description Página completa dedicada al mapa interactivo con geolocalización
 */
export function MapView() {
  return (
    <div className="map-view view active">
      <div className="map-view-hero">
        <div className="container">
          <div className="map-view-hero-content">
            <div className="map-view-tag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
              Mapa Interactivo
            </div>
            <h1>Farmacias cerca de ti</h1>
            <p>
              Usamos tu ubicación para mostrarte las farmacias más cercanas en tiempo real.
              Calcula rutas en auto, bus o a pie.
            </p>
          </div>

          {/* Feature pills */}
          <div className="map-feature-pills">
            <div className="map-pill">
              Geolocalización en tiempo real
            </div>
            <div className="map-pill">
              <span></span> Rutas puerta a puerta
            </div>
            <div className="map-pill">
              <span></span> Auto · Bus · A pie
            </div>
            <div className="map-pill">
              <span></span> Tiempo de llegada estimado
            </div>
          </div>
        </div>
      </div>

      <div className="container map-view-body">
        <PharmacyMap />
      </div>
    </div>
  );
}
