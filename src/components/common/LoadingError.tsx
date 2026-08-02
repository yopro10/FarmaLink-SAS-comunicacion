import './LoadingError.css';

/**
 * Props para el componente LoadingState
 * @interface LoadingStateProps
 */
interface LoadingStateProps {
  /** Mensaje opcional a mostrar */
  message?: string;
}

/**
 * LoadingState - Estado de carga de la aplicación
 * @component
 * @description Pantalla de carga con animación de spinner
 * @param {LoadingStateProps} props - Propiedades del componente
 * @returns {JSX.Element} Estado de carga
 */
export function LoadingState({ message = 'CARGANDO DATOS...' }: LoadingStateProps) {
  return (
    <div className="state-loading">
      <div className="loading-ring"></div>
      <p>{message}</p>
    </div>
  );
}

/**
 * Props para el componente ErrorState
 * @interface ErrorStateProps
 */
interface ErrorStateProps {
  /** Mensaje de error a mostrar */
  message?: string;
  /** Callback para reintentar */
  onRetry?: () => void;
}

/**
 * ErrorState - Estado de error de la aplicación
 * @component
 * @description Pantalla de error con mensaje y opción de reintentar
 * @param {ErrorStateProps} props - Propiedades del componente
 * @returns {JSX.Element} Estado de error
 */
export function ErrorState({ 
  message = 'No se pudo conectar al backend. Asegúrate de que el servidor esté corriendo.',
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="state-error container">
      <h3>Error de conexión</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn-retry" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
