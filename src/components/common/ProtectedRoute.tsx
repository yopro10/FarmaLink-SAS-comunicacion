import type { View } from '../../types';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  onGoLogin: () => void;
  onGoHome: () => void;
  children: React.ReactNode;
  requireRole?: string;
  userRole?: string;
  viewLabel?: string;
}

export function ProtectedRoute({
  isAuthenticated,
  onGoLogin,
  onGoHome,
  children,
  requireRole,
  userRole,
  viewLabel = 'esta sección',
}: ProtectedRouteProps) {
  // No autenticado
  if (!isAuthenticated) {
    return (
      <div className="protected-container">
        <div className="protected-card">
          <div className="protected-icon">🔒</div>
          <h2 className="protected-title">Acceso restringido</h2>
          <p className="protected-desc">
            Necesitas iniciar sesión para acceder a <strong>{viewLabel}</strong>.
          </p>
          <div className="protected-actions">
            <button className="protected-btn-login" onClick={onGoLogin}>
              Iniciar Sesión
            </button>
            <button className="protected-btn-home" onClick={onGoHome}>
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Autenticado pero sin rol requerido
  if (requireRole && userRole !== requireRole) {
    return (
      <div className="protected-container">
        <div className="protected-card protected-card--forbidden">
          <div className="protected-icon" aria-hidden="true">!</div>
          <h2 className="protected-title">Acceso denegado</h2>
          <p className="protected-desc">
            No tienes los permisos necesarios para acceder a <strong>{viewLabel}</strong>.
            Se requiere el rol de <strong>Administrador</strong>.
          </p>
          <div className="protected-actions">
            <button className="protected-btn-home" onClick={onGoHome}>
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
