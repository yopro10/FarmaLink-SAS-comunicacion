import { useState } from 'react';
// @ts-ignore
import './QuienesSomos.css';

interface Task {
  id: string;
  name: string;
  assignee: string;
  status: 'completed' | 'in-progress' | 'pending';
}

interface Sprint {
  id: number;
  title: string;
  dateRange: string;
  goal: string;
  progress: number;
  status: 'completed' | 'current' | 'planned';
  tasks: Task[];
}

const SPRINTS_DATA: Sprint[] = [
  {
    id: 1,
    title: 'Sprint 1',
    dateRange: '18 al 21 de Mayo de 2026',
    goal: 'Configuración inicial del repositorio, definición del diseño conceptual y bases de datos iniciales.',
    progress: 100,
    status: 'completed',
    tasks: [
      { id: '1-1', name: 'Diseñar base de datos PostgreSQL (Neon)', assignee: 'Haiver Darío Daza Cerdas', status: 'completed' },
      { id: '1-2', name: 'Estructura base del proyecto y configuración de Vite + React', assignee: 'Andrés Camilo Barco Roa', status: 'completed' },
      { id: '1-3', name: 'Configurar pipelines de despliegue en Vercel', assignee: 'Eduar Fabián Ultengo Pedraza', status: 'completed' }
    ]
  },
  {
    id: 2,
    title: 'Sprint 2',
    dateRange: '22 al 24 de Mayo de 2026',
    goal: 'Desarrollo del API Gateway y autenticación JWT, e interfaz de búsqueda de medicamentos.',
    progress: 100,
    status: 'completed',
    tasks: [
      { id: '2-1', name: 'Implementar JWT y Login/Registro en backend', assignee: 'Haiver Darío Daza Cerdas', status: 'completed' },
      { id: '2-2', name: 'Diseñar componentes UI de Autocompletado y Búsqueda', assignee: 'Sergio Andrés Merchán Rozo', status: 'completed' },
      { id: '2-3', name: 'Realizar pruebas de vulnerabilidad y seguridad inicial', assignee: 'Daniel Leonardo González Torres', status: 'completed' }
    ]
  },
  {
    id: 3,
    title: 'Sprint 3',
    dateRange: '25 al 27 de Mayo de 2026',
    goal: 'Implementar el panel de administración de medicamentos y mejorar la accesibilidad (WCAG).',
    progress: 75,
    status: 'current',
    tasks: [
      { id: '3-1', name: 'Crear vista de administración de medicamentos con CRUD', assignee: 'Andrés Camilo Barco Roa', status: 'in-progress' },
      { id: '3-2', name: 'Ajustar estilos CSS y variables para accesibilidad WCAG 2.1', assignee: 'Sergio Andrés Merchán Rozo', status: 'completed' },
      { id: '3-3', name: 'Desarrollar pruebas automatizadas de componentes críticos', assignee: 'Daniel Leonardo González Torres', status: 'completed' },
      { id: '3-4', name: 'Configurar y orquestar Docker / Docker Compose', assignee: 'Eduar Fabián Ultengo Pedraza', status: 'in-progress' }
    ]
  },
  {
    id: 4,
    title: 'Sprint 4',
    dateRange: '28 al 31 de Mayo de 2026',
    goal: 'Escalar arquitectura a microservicios e integrar geolocalización de farmacias.',
    progress: 0,
    status: 'planned',
    tasks: [
      { id: '4-1', name: 'Configurar microservicios y evaluar Kubernetes', assignee: 'Eduar Fabián Ultengo Pedraza', status: 'pending' },
      { id: '4-2', name: 'Integrar Mapas/Geolocalización para farmacias cercanas', assignee: 'Sergio Andrés Merchán Rozo', status: 'pending' },
      { id: '4-3', name: 'Conectar alianzas y APIs externas de farmacias aliadas', assignee: 'Haiver Darío Daza Cerdas', status: 'pending' }
    ]
  }
];

export function QuienesSomos() {
  const [activeSprintIndex, setActiveSprintIndex] = useState(2);
  return (
    <div className="quienes-somos-container">
      {/* Header Section */}
      <div className="quienes-somos-header">
        <div className="container">
          <h1 className="quienes-somos-title">Quiénes Somos</h1>
          <p className="quienes-somos-subtitle">
            Transformando el acceso a información farmacéutica en Colombia
          </p>
        </div>
      </div>

      <div className="container">
        {/* Misión */}
        <section className="quienes-somos-section">
          <div className="section-header">
            <h2 className="qs-section-title">Misión</h2>
            <div className="section-divider"></div>
          </div>
          <p className="section-text">
            Democratizar el acceso a información farmacéutica transparente en Colombia, proporcionando a los ciudadanos una plataforma digital inteligente que centraliza precios de medicamentos entre farmacias cercanas, elimina la asimetría de información y permite tomar decisiones de compra informadas en tiempo real, reduciendo el sobregasto evitable en salud.
          </p>
        </section>

        {/* Visión */}
        <section className="quienes-somos-section">
          <div className="section-header">
            <h2 className="qs-section-title">Visión</h2>
            <div className="section-divider"></div>
          </div>
          <p className="section-text">
            Dentro de algunos años, ser la plataforma de referencia en transparencia farmacéutica de América Latina, conectando a millones de usuarios con información de precios y disponibilidad de medicamentos en tiempo real, posicionando a FarmaLink como el estándar tecnológico que garantiza equidad en el acceso a la salud.
          </p>
        </section>

        {/* Estrategia */}
        <section className="quienes-somos-section">
          <div className="section-header">
            <h2 className="qs-section-title">Estrategia</h2>
            <div className="section-divider"></div>
          </div>
          
          <div className="subsection">
            <h3 className="subsection-title">Objetivos Estratégicos</h3>
            <ul className="strategy-list">
              <li>Centralizar y actualizar en tiempo real los precios de medicamentos de farmacias en las principales ciudades de Colombia.</li>
              <li>Reducir en al menos un 30% el sobregasto promedio de los usuarios mediante comparación inteligente de precios.</li>
              <li>Garantizar una experiencia accesible bajo estándares WCAG 2.1 para usuarios con diferentes niveles de alfabetización digital.</li>
              <li>Escalar la arquitectura hacia microservicios con Kubernetes para soportar crecimiento nacional.</li>
              <li>Integrar recomendaciones inteligentes basadas en historial de búsqueda, geolocalización y disponibilidad.</li>
              <li>Establecer alianzas con cadenas farmacéuticas para obtener datos verificados y actualizados automáticamente.</li>
            </ul>
          </div>
        </section>

        {/* Cultura */}
        <section className="quienes-somos-section">
          <div className="section-header">
            <h2 className="qs-section-title">Cultura</h2>
            <div className="section-divider"></div>
          </div>
          
          <div className="subsection">
            <h3 className="subsection-title">Valores Corporativos</h3>
            
            <div className="values-grid">
              <div className="value-card">
                <h4 className="value-title">Transparencia</h4>
                <p className="value-description">
                  Información farmacéutica clara, verificada y accesible para todos los ciudadanos, sin barreras ni sesgos comerciales.
                </p>
              </div>
              
              <div className="value-card">
                <h4 className="value-title">Equidad en Salud</h4>
                <p className="value-description">
                  Compromiso con reducir la desigualdad en el acceso a medicamentos, especialmente para poblaciones de menores ingresos.
                </p>
              </div>
              
              <div className="value-card">
                <h4 className="value-title">Innovación Tecnológica</h4>
                <p className="value-description">
                  Uso de arquitecturas modernas, patrones de diseño y tecnologías escalables orientadas al crecimiento continuo.
                </p>
              </div>
              
              <div className="value-card">
                <h4 className="value-title">Seguridad y Confianza</h4>
                <p className="value-description">
                  Protección de datos mediante autenticación JWT, cifrado y cumplimiento de estándares de seguridad informática.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mercado */}
        <section className="quienes-somos-section">
          <div className="section-header">
            <h2 className="qs-section-title">Mercado</h2>
            <div className="section-divider"></div>
          </div>
          
          <div className="subsection">
            <h3 className="subsection-title">Propuesta de Valor</h3>
            <p className="section-text">
              FarmaLink resuelve un problema crítico del mercado farmacéutico colombiano: la variación de precios de un mismo medicamento puede superar el 400% entre establecimientos, mientras que la mayoría de los ciudadanos desconoce estas diferencias. La plataforma permite comparar precios y disponibilidad en tiempo real, ayudando a reducir el sobregasto en salud.
            </p>
            
            <div className="market-stats">
              <div className="stat-item">
                <span className="stat-number">+400%</span>
                <span className="stat-label">de variación de precio entre farmacias</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">78%</span>
                <span className="stat-label">de colombianos sin información clara sobre precios</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">$400B+</span>
                <span className="stat-label">en sobregasto anual estimado</span>
              </div>
            </div>
          </div>
          
          <div className="subsection">
            <h3 className="subsection-title">Segmento de Clientes</h3>
            
            <div className="segments-grid">
              <div className="segment-card">
                <h4 className="segment-title">Consumidor Final</h4>
                <p className="segment-description">
                  Ciudadanos colombianos que buscan medicamentos al mejor precio sin desplazamientos innecesarios.
                </p>
              </div>
              
              <div className="segment-card">
                <h4 className="segment-title">Gestores de Farmacia</h4>
                <p className="segment-description">
                  Administradores de farmacias interesados en visibilidad digital y análisis del mercado.
                </p>
              </div>
              
              <div className="segment-card">
                <h4 className="segment-title">Pacientes con Enfermedades Crónicas</h4>
                <p className="segment-description">
                  Usuarios con compras recurrentes que requieren optimización constante de costos.
                </p>
              </div>
              
              <div className="segment-card">
                <h4 className="segment-title">Entidades de Salud</h4>
                <p className="segment-description">
                  EPS, IPS y organismos gubernamentales interesados en monitoreo y transparencia de precios.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Empresa */}
        <section className="quienes-somos-section">
          <div className="section-header">
            <h2 className="qs-section-title">Empresa</h2>
            <div className="section-divider"></div>
          </div>
          
          <div className="subsection">
            <h3 className="subsection-title">Estructura Organizacional</h3>
            <p className="section-text">
              FarmaLink SAS es una empresa tecnológica constituida en Colombia, con operación inicial en Bogotá D.C. El equipo fundador está integrado por ingenieros de sistemas especializados en desarrollo web moderno y arquitecturas escalables.
            </p>
            
            <div className="team-grid">
              <div className="team-member">
                <h4 className="team-name">Andrés Camilo Barco Roa</h4>
                <span className="team-role">Desarrollo e integración</span>
              </div>
              
              <div className="team-member">
                <h4 className="team-name">Haiver Darío Daza Cerdas</h4>
                <span className="team-role">Backend y base de datos</span>
              </div>
              
              <div className="team-member">
                <h4 className="team-name">Sergio Andrés Merchán Rozo</h4>
                <span className="team-role">Frontend y experiencia de usuario</span>
              </div>
              
              <div className="team-member">
                <h4 className="team-name">Eduar Fabián Ultengo Pedraza</h4>
                <span className="team-role">Arquitectura y DevOps</span>
              </div>
              
              <div className="team-member">
                <h4 className="team-name">Daniel Leonardo González Torres</h4>
                <span className="team-role">Seguridad y calidad</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tecnología */}
        <section className="quienes-somos-section">
          <div className="section-header">
            <h2 className="qs-section-title">Tecnología</h2>
            <div className="section-divider"></div>
          </div>
          
          <div className="subsection">
            <h3 className="subsection-title">Stack Tecnológico</h3>
            <p className="section-text">
              La plataforma utiliza un ecosistema moderno, modular y orientado a microservicios:
            </p>
            
            <div className="tech-grid">
              <div className="tech-item">
                <span className="tech-icon">⚛️</span>
                <span className="tech-name">React 19 + TypeScript</span>
              </div>
              
              <div className="tech-item">
                <span className="tech-icon">🟢</span>
                <span className="tech-name">Node.js + Express 5</span>
              </div>
              
              <div className="tech-item">
                <span className="tech-icon">🐘</span>
                <span className="tech-name">PostgreSQL 16</span>
              </div>
              
              <div className="tech-item">
                <span className="tech-icon">🔐</span>
                <span className="tech-name">JWT Authentication</span>
              </div>
              
              <div className="tech-item">
                <span className="tech-icon">🚪</span>
                <span className="tech-name">API Gateway</span>
              </div>
              
              <div className="tech-item">
                <span className="tech-icon">🐳</span>
                <span className="tech-name">Docker + Docker Compose</span>
              </div>
              
              <div className="tech-item">
                <span className="tech-icon">⚡</span>
                <span className="tech-name">Vite 7</span>
              </div>
              
              <div className="tech-item">
                <span className="tech-icon">☁️</span>
                <span className="tech-name">Neon Serverless Database</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sección Scrum Horizontal */}
        <section className="quienes-somos-section scrum-horizontal-section">
          <div className="section-header">
            <h2 className="qs-section-title">Progreso del Proyecto (Scrum)</h2>
            <div className="section-divider"></div>
          </div>
          <p className="section-text">
            Nuestra metodología de desarrollo se basa en marcos ágiles (Scrum). A continuación se presenta la línea de tiempo horizontal interactiva con el progreso de nuestros Sprints y el desglose de tareas asignadas al equipo:
          </p>

          <div className="timeline-horizontal-container">
            <div className="timeline-scroll-wrapper">
              {/* Línea conectora */}
              <div className="timeline-horizontal-track">
                {/* Barra de progreso de fondo */}
                <div 
                  className="timeline-progress-bar" 
                  style={{ width: `${(activeSprintIndex / (SPRINTS_DATA.length - 1)) * 100}%` }}
                ></div>
              </div>

              {/* Nodos */}
              <div className="timeline-nodes-wrapper">
                {SPRINTS_DATA.map((sprint, index) => {
                  const isCompleted = sprint.status === 'completed';
                  const isCurrent = sprint.status === 'current';
                  const isActive = index === activeSprintIndex;

                  let nodeClass = 'timeline-node';
                  if (isCompleted) nodeClass += ' is-completed';
                  if (isCurrent) nodeClass += ' is-current';
                  if (isActive) nodeClass += ' is-active';

                  return (
                    <button
                      key={sprint.id}
                      className={nodeClass}
                      onClick={() => setActiveSprintIndex(index)}
                      aria-label={`Ver detalles de ${sprint.title}`}
                    >
                      <div className="node-marker-wrapper">
                        <div className="node-marker">
                          {isCompleted ? (
                            <svg className="node-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : isCurrent ? (
                            <span className="node-pulse-dot"></span>
                          ) : (
                            <span className="node-planned-dot"></span>
                          )}
                        </div>
                      </div>
                      <div className="node-info">
                        <span className="node-title">{sprint.title}</span>
                        <span className="node-date">{sprint.dateRange.split(' de ')[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tarjeta de Detalle del Sprint */}
          <div className="scrum-detail-card">
            <div className="scrum-card-header">
              <div className="scrum-header-left">
                <div className="scrum-header-row">
                  <span className={`scrum-status-badge ${SPRINTS_DATA[activeSprintIndex].status}`}>
                    {SPRINTS_DATA[activeSprintIndex].status === 'completed' && 'Completado'}
                    {SPRINTS_DATA[activeSprintIndex].status === 'current' && 'En Curso'}
                    {SPRINTS_DATA[activeSprintIndex].status === 'planned' && 'Planificado'}
                  </span>
                  <span className="scrum-card-date">📅 {SPRINTS_DATA[activeSprintIndex].dateRange}</span>
                </div>
                <h3 className="scrum-card-title">{SPRINTS_DATA[activeSprintIndex].title}: {SPRINTS_DATA[activeSprintIndex].goal}</h3>
              </div>
              <div className="scrum-header-right">
                <div className="scrum-progress-container">
                  <div className="scrum-progress-circle">
                    <span className="scrum-progress-number">{SPRINTS_DATA[activeSprintIndex].progress}%</span>
                    <span className="scrum-progress-label">Avance</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="scrum-card-body">
              <h4 className="scrum-tasks-title">Backlog de Tareas & Asignaciones</h4>
              <div className="scrum-tasks-list">
                {SPRINTS_DATA[activeSprintIndex].tasks.map((task) => (
                  <div key={task.id} className={`scrum-task-item ${task.status}`}>
                    <div className="task-status-indicator">
                      {task.status === 'completed' && (
                        <span className="task-status-dot completed" title="Completada">✓</span>
                      )}
                      {task.status === 'in-progress' && (
                        <span className="task-status-dot in-progress" title="En Curso">⚡</span>
                      )}
                      {task.status === 'pending' && (
                        <span className="task-status-dot pending" title="Pendiente">○</span>
                      )}
                    </div>
                    <div className="task-details">
                      <p className="task-name">{task.name}</p>
                      <p className="task-assignee">👤 Responsable: <strong>{task.assignee}</strong></p>
                    </div>
                    <div className="task-badge-container">
                      <span className={`task-status-badge ${task.status}`}>
                        {task.status === 'completed' && 'Completada'}
                        {task.status === 'in-progress' && 'En Curso'}
                        {task.status === 'pending' && 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
