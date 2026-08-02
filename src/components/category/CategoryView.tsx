import { useState, useEffect, useCallback } from 'react';
import type { Medicamento, Categoria, Sugerencia } from '../../types';
import './CategoryView.css';

interface CategoryViewProps {
  /** Categoría inicial seleccionada desde el menú */
  categoriaInicial?: string;
  /** Callback al seleccionar un medicamento para ver su detalle */
  onSelect?: (med: Sugerencia) => void;
  /** Callback para volver al inicio (breadcrumb) */
  onGoHome?: () => void;
}

type RangoPrecio = 'todos' | 'bajo' | 'medio' | 'alto';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

const PRECIO_LABELS: Record<RangoPrecio, string> = {
  todos:  'Todos los precios',
  bajo:   'Menos de $10.000',
  medio:  '$10.000 – $50.000',
  alto:   'Más de $50.000',
};

export function CategoryView({ categoriaInicial, onSelect, onGoHome }: CategoryViewProps) {
  const [categorias, setCategorias]           = useState<Categoria[]>([]);
  const [medicamentos, setMedicamentos]       = useState<Medicamento[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState<string>(categoriaInicial || '');
  const [soloDiponibles, setSoloDisponibles]  = useState(true);

  // PUNTO 4 FIX: sincronizar categoriaInicial cuando cambia desde el Header dropdown
  // Sin esto, navegar Header→Categoría→Analgésicos y luego Header→Antiinflamatorios
  // no actualizaba la vista porque el estado local no se sincronizaba con la prop
  useEffect(() => {
    if (categoriaInicial !== undefined) {
      setCategoriaActiva(categoriaInicial || '');
    }
  }, [categoriaInicial]);
  const [rangoPrecio, setRangoPrecio]         = useState<RangoPrecio>('todos');
  const [cargando, setCargando]               = useState(false);
  const [sidebarMobile, setSidebarMobile]     = useState(false);

  // Carga categorías para el sidebar
  useEffect(() => {
    fetch(`${API_BASE}/api/categorias`)
      .then(r => r.json())
      .then(d => { if (d.success) setCategorias(d.data); })
      .catch(() => {});
  }, []);

  // Carga medicamentos filtrados
  const fetchMedicamentos = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (categoriaActiva) params.set('category', categoriaActiva);
      if (soloDiponibles) params.set('active', 'true');

      const res  = await fetch(`${API_BASE}/api/medicamentos?${params}`);
      const data = await res.json();
      if (data.success) setMedicamentos(data.data);
    } catch {
      setMedicamentos([]);
    } finally {
      setCargando(false);
    }
  }, [categoriaActiva, soloDiponibles]);

  useEffect(() => { fetchMedicamentos(); }, [fetchMedicamentos]);

  // Filtro de precio (en el frontend, ya que el precio viene de otra tabla)
  const medicamentosFiltrados = medicamentos; // El precio no llega en esta consulta, filtro visual futuro

  const handleSelectMed = (med: Medicamento) => {
    onSelect?.({
      _id: med._id || String(med.id),
      id: med.id,
      name: med.name,
      lab: med.lab,
      category: med.category || med.categoria_nombre,
      categoria_nombre: med.categoria_nombre,
      description: med.description,
      estrategiaUsada: 'categoria',
    });
  };

  return (
    <div className="catview">
      {/* ── Cabecera ── */}
      <div className="catview__hero">
        <div className="container">
          <nav className="catview__breadcrumb" aria-label="Ruta de navegación">
            <button className="catview__crumb-btn" onClick={onGoHome}>Inicio</button>
            <span className="catview__crumb-sep" aria-hidden="true">›</span>
            <span className="catview__crumb-btn catview__crumb-inactive">Categorías</span>
            {categoriaActiva && (
              <>
                <span className="catview__crumb-sep" aria-hidden="true">›</span>
                <span className="catview__crumb-current">{categoriaActiva}</span>
              </>
            )}
          </nav>
          <h1 className="catview__title">
            {categoriaActiva || 'Todos los medicamentos'}
          </h1>
          <p className="catview__subtitle">
            {cargando ? 'Cargando...' : `${medicamentosFiltrados.length} producto${medicamentosFiltrados.length !== 1 ? 's' : ''} encontrado${medicamentosFiltrados.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="container catview__body">
        {/* ── Botón filtros mobile ── */}
        <button
          className="catview__filter-toggle"
          onClick={() => setSidebarMobile(v => !v)}
        >
          ☰ Filtros
        </button>

        <div className="catview__layout">
          {/* ════ SIDEBAR DE FILTROS ════ */}
          <aside className={`catview__sidebar ${sidebarMobile ? 'catview__sidebar--open' : ''}`}>

            {/* Filtro: Categorías */}
            <div className="catview__filter-group">
              <h3 className="catview__filter-title">Categoría</h3>
              <ul className="catview__filter-list">
                <li>
                  <button
                    className={`catview__filter-btn ${categoriaActiva === '' ? 'catview__filter-btn--active' : ''}`}
                    onClick={() => setCategoriaActiva('')}
                  >
                    Todas las categorías
                  </button>
                </li>
                {categorias.map(cat => (
                  <li key={cat.id}>
                    <button
                      className={`catview__filter-btn ${categoriaActiva === cat.nombre ? 'catview__filter-btn--active' : ''}`}
                      onClick={() => { setCategoriaActiva(cat.nombre); setSidebarMobile(false); }}
                    >
                      {cat.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Filtro: Disponibilidad */}
            <div className="catview__filter-group">
              <h3 className="catview__filter-title">Disponibilidad</h3>
              <label className="catview__toggle-label">
                <input
                  type="checkbox"
                  checked={soloDiponibles}
                  onChange={e => setSoloDisponibles(e.target.checked)}
                />
                <span className="catview__toggle-text">Solo disponibles</span>
              </label>
            </div>

            {/* Filtro: Precio (visual, referencial) */}
            <div className="catview__filter-group">
              <h3 className="catview__filter-title">Rango de precio</h3>
              <ul className="catview__filter-list">
                {(Object.keys(PRECIO_LABELS) as RangoPrecio[]).map(rango => (
                  <li key={rango}>
                    <button
                      className={`catview__filter-btn ${rangoPrecio === rango ? 'catview__filter-btn--active' : ''}`}
                      onClick={() => setRangoPrecio(rango)}
                    >
                      {PRECIO_LABELS[rango]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ════ GRID DE PRODUCTOS ════ */}
          <main className="catview__main">
            {cargando ? (
              <div className="catview__loading">
                <div className="catview__spinner"></div>
                <p>Cargando medicamentos...</p>
              </div>
            ) : medicamentosFiltrados.length === 0 ? (
              <div className="catview__empty">
                <span className="catview__empty-icon" aria-hidden="true">•</span>
                <h3>No se encontraron medicamentos</h3>
                <p>Intenta cambiar los filtros de búsqueda</p>
              </div>
            ) : (
              <div className="catview__grid">
                {medicamentosFiltrados.map(med => (
                  <article
                    key={med.id || med._id}
                    className={`catview__card ${!med.active ? 'catview__card--inactive' : ''}`}
                  >
                    <div className="catview__card-badge">
                      {med.active ? 'Disponible' : 'Agotado'}
                    </div>

                    <div className="catview__card-body">
                      <span className="catview__card-category">
                        {med.categoria_nombre || med.category || 'Sin categoría'}
                      </span>
                      <h3 className="catview__card-name">{med.name}</h3>
                      <p className="catview__card-lab"> {med.lab}</p>
                      {med.description && (
                        <p className="catview__card-desc">{med.description}</p>
                      )}
                    </div>

                    <div className="catview__card-footer">
                      <button
                        className="catview__card-btn"
                        onClick={() => handleSelectMed(med)}
                        disabled={!med.active}
                      >
                        Ver detalle →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
