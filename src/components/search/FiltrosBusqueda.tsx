import { useState, useEffect, useRef } from 'react';
import type { Sugerencia } from '../../types';
import { useToast } from '../../hooks/useToast';
import './FiltrosBusqueda.css';

interface Categoria {
  id: number;
  nombre: string;
  total_medicamentos: string;
}

interface ResultadoBusqueda {
  id: number;
  name: string;
  lab: string;
  description?: string;
  categoria_nombre?: string;
  precio_minimo?: number;
  farmacias_count: number;
  score?: number;
}

interface FiltrosState {
  categoria: string;
  lab: string;
  precioMin: string;
  precioMax: string;
  disponible: string;
  orden: string;
}

interface ErroresValidacion {
  precioMin?: string;
  precioMax?: string;
  rango?: string;
}

interface FiltrosBusquedaProps {
  query: string;
  onSelect: (med: Sugerencia) => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

const FILTROS_VACIOS: FiltrosState = {
  categoria: '', lab: '', precioMin: '', precioMax: '',
  disponible: '', orden: 'relevancia',
};

function validarPrecios(min: string, max: string): ErroresValidacion {
  const errores: ErroresValidacion = {};
  const n = Number(min), m = Number(max);
  if (min !== '' && (isNaN(n) || n < 0)) errores.precioMin = 'El precio mínimo no puede ser negativo.';
  if (max !== '' && (isNaN(m) || m < 0)) errores.precioMax = 'El precio máximo no puede ser negativo.';
  if (min !== '' && max !== '' && !errores.precioMin && !errores.precioMax && n > m)
    errores.rango = 'El precio mínimo no puede ser mayor que el máximo.';
  return errores;
}

// ── Componente de campo numérico con tooltip de error ─────────────────────────
interface CampoPrecioProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
}

function CampoPrecio({ label, id, value, onChange, placeholder, error }: CampoPrecioProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipMsg, setTooltipMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarTooltip = (msg: string) => {
    setTooltipMsg(msg);
    setTooltipVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTooltipVisible(false), 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const teclaPermitida = [
      'Backspace','Delete','Tab','Escape','Enter',
      'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
    ];
    // Permitir números (0-9), punto decimal
    if (!teclaPermitida.includes(e.key) && !/^\d$/.test(e.key)) {
      e.preventDefault();
      mostrarTooltip('Solo se aceptan números en este campo.');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const texto = e.clipboardData.getData('text');
    if (!/^\d*\.?\d*$/.test(texto)) {
      e.preventDefault();
      mostrarTooltip('Solo se aceptan números. El texto pegado fue ignorado.');
    }
  };

  return (
    <div className="filtro-grupo">
      <label htmlFor={id}>{label}</label>
      <div className="filtro-input-wrap">
        <input
          id={id}
          type="number"
          placeholder={placeholder}
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={error ? 'filtro-input-error' : ''}
          autoComplete="off"
        />
        {/* Tooltip de prevención de error */}
        {tooltipVisible && (
          <div className="filtro-tooltip" role="alert">
            <span className="filtro-tooltip-icon">!</span>
            {tooltipMsg}
          </div>
        )}
      </div>
      {error && <span className="filtro-error-msg" role="alert">{error}</span>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function FiltrosBusqueda({ query, onSelect }: FiltrosBusquedaProps) {
  const [abierto,      setAbierto]      = useState(false);
  const [filtros,      setFiltros]      = useState<FiltrosState>(FILTROS_VACIOS);
  const [pendientes,   setPendientes]   = useState<FiltrosState>(FILTROS_VACIOS);
  const [categorias,   setCategorias]   = useState<Categoria[]>([]);
  const [laboratorios, setLaboratorios] = useState<{ lab: string }[]>([]);
  const [resultados,   setResultados]   = useState<ResultadoBusqueda[]>([]);
  const [cargando,     setCargando]     = useState(false);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [buscado,      setBuscado]      = useState(false);
  const [errores,      setErrores]      = useState<ErroresValidacion>({});

  const queryRef    = useRef(query);
  const buscadoRef  = useRef(buscado);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { queryRef.current = query; },     [query]);
  useEffect(() => { buscadoRef.current = buscado; }, [buscado]);

  const { addToast } = useToast();
  const LIMIT = 8;

  useEffect(() => {
    fetch(`${API_BASE}/api/busqueda/filtros`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCategorias(d.filtros.categorias);
          setLaboratorios(d.filtros.laboratorios);
        }
      })
      .catch(() => {});
  }, []);

  const filtrosActivos = [
    filtros.categoria, filtros.lab, filtros.precioMin,
    filtros.precioMax, filtros.disponible,
  ].filter(Boolean).length;

  const buscar = async (f: FiltrosState, pg: number) => {
    setCargando(true);
    setBuscado(true);
    const q = queryRef.current;
    const params = new URLSearchParams();
    if (q)           params.set('q', q);
    if (f.categoria) params.set('categoria', f.categoria);
    if (f.lab)       params.set('lab', f.lab);
    if (f.precioMin) params.set('precioMin', f.precioMin);
    if (f.precioMax) params.set('precioMax', f.precioMax);
    if (f.disponible) params.set('disponible', f.disponible);
    params.set('orden', f.orden || 'relevancia');
    params.set('page',  String(pg));
    params.set('limit', String(LIMIT));

    try {
      const res = await fetch(`${API_BASE}/api/busqueda?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setResultados(data.data);
        setTotal(data.paginacion.total);
        setTotalPaginas(data.paginacion.totalPaginas);
        if (data.paginacion.total === 0) {
          addToast('Sin resultados. Intenta ampliar los filtros.', 'info');
        } else {
          addToast(`${data.paginacion.total} medicamento${data.paginacion.total !== 1 ? 's' : ''} encontrado${data.paginacion.total !== 1 ? 's' : ''}.`, 'success', 2500);
        }
      }
    } catch {
      setResultados([]);
      addToast('Error al buscar. Verifica tu conexión.', 'error');
    } finally {
      setCargando(false);
    }
  };

  // Cuando el query cambia (el usuario hizo clic en Buscar desde SearchSection)
  // se dispara inmediatamente sin debounce, ya que el usuario confirmó la búsqueda
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) return;
    setPage(1);
    buscar(filtros, 1);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPend = (key: keyof FiltrosState, val: string) => {
    const nuevo = { ...pendientes, [key]: val };
    setPendientes(nuevo);
    if (key === 'precioMin' || key === 'precioMax') {
      setErrores(validarPrecios(nuevo.precioMin, nuevo.precioMax));
    }
  };

  const hayErrores = Object.keys(errores).length > 0;

  const handleAplicar = () => {
    const ef = validarPrecios(pendientes.precioMin, pendientes.precioMax);
    if (Object.keys(ef).length > 0) {
      setErrores(ef);
      addToast('Corrige los errores antes de buscar.', 'warning');
      return;
    }
    setFiltros(pendientes);
    setPage(1);
    buscar(pendientes, 1);
  };

  const handleLimpiar = () => {
    setPendientes(FILTROS_VACIOS);
    setFiltros(FILTROS_VACIOS);
    setErrores({});
    setPage(1);
    const q = queryRef.current?.trim() ?? '';
    // Mantener la búsqueda activa: volver a consultar sin filtros en lugar de borrar resultados.
    if (q.length >= 2) {
      buscar(FILTROS_VACIOS, 1);
    } else {
      setResultados([]);
      setTotal(0);
      setTotalPaginas(1);
      setBuscado(false);
    }
    addToast('Filtros eliminados.', 'info', 2000);
  };

  const handlePagina = (p: number) => {
    setPage(p);
    buscar(filtros, p);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSeleccionar = (r: ResultadoBusqueda) => {
    onSelect({
      _id: String(r.id), id: r.id, name: r.name, lab: r.lab,
      description: r.description, category: r.categoria_nombre,
      categoria_nombre: r.categoria_nombre, estrategiaUsada: 'busqueda_avanzada',
    });
  };

  return (
    <div className="filtros-wrapper">

      {/* ── Toggle compacto ─── */}
      <div className="filtros-toggle-link-row">
        <button
          className="filtros-toggle-link"
          onClick={() => setAbierto(v => !v)}
          aria-expanded={abierto}
        >
          {abierto ? 'Ocultar filtros' : 'Mostrar filtros'}
          {filtrosActivos > 0 && <span className="filtros-badge">{filtrosActivos}</span>}
        </button>
      </div>

      {/* ── Panel ─── */}
      {abierto && (
        <div className="filtros-panel">
          <div className="filtros-grid">

            <div className="filtro-grupo">
              <label htmlFor="f-categoria">Categoría</label>
              <select id="f-categoria" value={pendientes.categoria} onChange={e => setPend('categoria', e.target.value)}>
                <option value="">Todas</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.nombre}>{c.nombre} ({c.total_medicamentos})</option>
                ))}
              </select>
            </div>

            {/* Campo precio con tooltip de validación */}
            <CampoPrecio
              label="Precio mínimo"
              id="f-precio-min"
              value={pendientes.precioMin}
              onChange={v => setPend('precioMin', v)}
              placeholder="Ej: 2000"
              error={errores.precioMin}
            />

            <CampoPrecio
              label="Precio máximo"
              id="f-precio-max"
              value={pendientes.precioMax}
              onChange={v => setPend('precioMax', v)}
              placeholder="Ej: 15000"
              error={errores.precioMax}
            />
            
            <div className="filtro-grupo">
              <label htmlFor="f-lab">Laboratorio</label>
              <select id="f-lab" value={pendientes.lab} onChange={e => setPend('lab', e.target.value)}>
                <option value="">Todos</option>
                {laboratorios.map(l => <option key={l.lab} value={l.lab}>{l.lab}</option>)}
              </select>
            </div>

            <div className="filtro-grupo">
              <label htmlFor="f-disponible">Disponibilidad</label>
              <select id="f-disponible" value={pendientes.disponible} onChange={e => setPend('disponible', e.target.value)}>
                <option value="">Todos</option>
                <option value="true">Con precio registrado</option>
                <option value="false">Sin precio registrado</option>
              </select>
            </div>

            <div className="filtro-grupo">
              <label htmlFor="f-orden">Ordenar por</label>
              <select id="f-orden" value={pendientes.orden} onChange={e => setPend('orden', e.target.value)}>
                <option value="relevancia">Relevancia</option>
                <option value="precio_asc">Precio: menor a mayor</option>
                <option value="precio_desc">Precio: mayor a menor</option>
                <option value="nombre">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {errores.rango && (
            <div className="filtro-error-rango" role="alert">{errores.rango}</div>
          )}

          <div className="filtros-acciones">
            <button className="btn-limpiar-filtros" onClick={handleLimpiar} type="button">Limpiar filtros</button>
            <button
              className="btn-aplicar-filtros"
              onClick={handleAplicar}
              disabled={hayErrores || cargando}
              type="button"
              title={hayErrores ? 'Corrige los errores antes de aplicar' : undefined}
            >
              {cargando ? 'Aplicando...' : 'Aplicar filtros'}
            </button>
          </div>
        </div>
      )}

      {/* ── Resultados ─── */}
      {buscado && (
        <div className="busqueda-resultados">
          {cargando ? (
            <div className="busqueda-cargando">Buscando medicamentos...</div>
          ) : resultados.length === 0 ? (
            <div className="busqueda-vacio">
              <p>Sin resultados para los filtros aplicados.</p>
              <p>Intenta cambiar los filtros o el texto de búsqueda.</p>
            </div>
          ) : (
            <>
              <div className="busqueda-resultados-header">
                <span>
                  <strong>{total}</strong> medicamento{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                  {queryRef.current && <> para <strong>"{queryRef.current}"</strong></>}
                </span>
                <span>Página {page} de {totalPaginas}</span>
              </div>

              {resultados.map(r => (
                <div key={r.id} className="resultado-card" onClick={() => handleSeleccionar(r)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSeleccionar(r)}>
                  <div className="resultado-info">
                    <div className="resultado-nombre">{r.name}</div>
                    <div className="resultado-meta">
                      <span>{r.lab}</span>
                      {r.categoria_nombre && <span className="resultado-categoria">{r.categoria_nombre}</span>}
                      {r.farmacias_count > 0 && <span className="resultado-farmacias">{r.farmacias_count} farmacia{r.farmacias_count !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="resultado-precio">
                    {r.precio_minimo ? (
                      <>
                        <div className="resultado-precio-valor">${r.precio_minimo.toLocaleString('es-CO')}</div>
                        <div className="resultado-precio-label">mejor precio</div>
                      </>
                    ) : (
                      <div className="resultado-sin-precio">Sin precio</div>
                    )}
                  </div>
                </div>
              ))}

              {totalPaginas > 1 && (
                <div className="busqueda-paginacion">
                  <button onClick={() => handlePagina(page - 1)} disabled={page <= 1}>Anterior</button>
                  {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                    const p = i + 1;
                    return <button key={p} className={p === page ? 'activa' : ''} onClick={() => handlePagina(p)}>{p}</button>;
                  })}
                  <button onClick={() => handlePagina(page + 1)} disabled={page >= totalPaginas}>Siguiente</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
