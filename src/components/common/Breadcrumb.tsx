import type { View } from '../../types';
import './Breadcrumb.css';

const LABELS: Partial<Record<View, string>> = {
  buscar:    'Buscar medicamentos',
  dashboard: 'Dashboard',
  admin:     'Administración',
  mapa:      'Mapa de farmacias',
  settings:  'Mi cuenta',
  'quienes-somos': 'Quiénes somos',
  desarrolladores: 'Equipo',
  cart: 'Carrito',
  checkout: 'Checkout',
  faq:       'Preguntas frecuentes',
};

interface BreadcrumbProps {
  view: View;
  onGoHome: () => void;
}

export function Breadcrumb({ view, onGoHome }: BreadcrumbProps) {
  const label = LABELS[view];
  if (!label) return null;

  return (
    <nav className="app-breadcrumb" aria-label="Ruta de navegación">
      <div className="container app-breadcrumb-inner">
        <button className="app-crumb-btn" onClick={onGoHome} aria-label="Ir al inicio">
          Inicio
        </button>
        <span className="app-crumb-sep" aria-hidden="true">›</span>
        <span className="app-crumb-current" data-view={view} aria-current="page">
          {label}
        </span>
      </div>
    </nav>
  );
}
