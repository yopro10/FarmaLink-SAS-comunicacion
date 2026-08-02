import iconBusqueda from '../../assets/icon-busqueda.png';
import iconPrecios from '../../assets/icon-precios.png';
import iconMapa from '../../assets/icon-mapa.png';
import iconIA from '../../assets/icon-ia.png';
import './Features.css';

/**
 * Props para el componente Features
 * @interface FeaturesProps
 */
interface FeaturesProps {
  /** Cantidad de farmacias para mostrar */
  farmCount?: number;
}

/**
 * Features - Sección de características del servicio
 * @component
 * @description Strip horizontal con las 4 características principales de FarmaLink
 * @param {FeaturesProps} props - Propiedades del componente
 * @returns {JSX.Element} Sección de características
 */
export function Features({ farmCount = 0 }: FeaturesProps) {
  const features = [
    {
      img: iconBusqueda,
      title: 'Búsqueda Inteligente',
      desc: 'Autocompletado con 3 estrategias: nombre, categoría y similitud'
    },
    {
      img: iconPrecios,
      title: 'Comparador de Precios',
      desc: 'Visualiza precios de múltiples farmacias con indicador de mejor oferta'
    },
    {
      img: iconMapa,
      title: 'Mapa de Farmacias',
      desc: `${farmCount} farmacias en Bogotá con datos de contacto y dirección`
    },
    {
      img: iconIA,
      title: 'IA Personalizada',
      desc: 'Recomendaciones inteligentes basadas en patrones y alternativas genéricas'
    }
  ];

  return (
    <section className="features-strip">
      <div className="container">
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-item"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="feature-icon">
                <img src={feature.img} alt={feature.title} className="feature-icon-img" />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
