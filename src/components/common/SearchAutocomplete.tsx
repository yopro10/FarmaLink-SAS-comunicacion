import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import './SearchAutocomplete.css';

interface Sugerencia {
  _id: string;
  name: string;
  lab: string;
  category?: string;
  description?: string;
  estrategiaUsada: string;
}

interface SearchAutocompleteProps {
  /** Callback cuando cambia el texto (para filtros avanzados) */
  onQueryChange?: (q: string) => void;
  /** Callback cuando el usuario selecciona una sugerencia */
  onSelect?: (sugerencia: Sugerencia) => void;
  placeholder?: string;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export function SearchAutocomplete({
  onSelect,
  placeholder = 'Buscar medicamento...',
  onQueryChange,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Sugerencia | null>(null);
  const [estrategia, setEstrategia] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(-1);
  // PUNTO 4: estado de error de red
  const [errorRed, setErrorRed] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // PUNTO 4: hook de toasts (sin emojis)
  const { addToast } = useToast();

  // ── Búsqueda con debounce de 300ms ─────────────────────────────────────────
  const buscar = useCallback((texto: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (texto.trim().length < 2) {
      setSugerencias([]);
      setAbierto(false);
      setCargando(false);
      setErrorRed(false);
      return;
    }

    setCargando(true);
    setErrorRed(false);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/sugerencias?q=${encodeURIComponent(texto)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setSugerencias(data.sugerencias);
          setEstrategia(data.estrategiaUsada ?? '');
          setAbierto(true);
        }
      } catch {
        // PUNTO 4: antes era silencioso, ahora avisa
        setSugerencias([]);
        setErrorRed(true);
        setAbierto(true);
        addToast('No se pudo conectar al servidor. Verifica tu conexión.', 'error');
      } finally {
        setCargando(false);
      }
    }, 300); // ← debounce 300ms (igual que antes)
  }, [addToast]);

  useEffect(() => {
    buscar(query);
    setIndiceActivo(-1);
  }, [query, buscar]);

  // ── Cerrar dropdown al hacer click fuera ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSeleccionar = (s: Sugerencia) => {
    setQuery(s.name);
    setSeleccionado(s);
    setSugerencias([]);
    setAbierto(false);
    onSelect?.(s);
    // PUNTO 4: confirmar selección
    addToast(`Seleccionado: ${s.name}`, 'success', 2500);
  };

  // ── Navegación con teclado ─────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!abierto) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo((i) => Math.min(i + 1, sugerencias.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && indiceActivo >= 0) {
      e.preventDefault();
      handleSeleccionar(sugerencias[indiceActivo]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  const limpiar = () => {
    setQuery('');
    setSeleccionado(null);
    setSugerencias([]);
    setAbierto(false);
    setErrorRed(false);
    inputRef.current?.focus();
  };

  // PUNTO 4: etiquetas sin emojis
  const etiquetaEstrategia: Record<string, string> = {
    fuzzy_trgm:           'Búsqueda aproximada',
    fuzzy_js:             'Búsqueda aproximada',
    coincidencia_parcial: 'Nombre',
    por_categoria:        'Categoría',
    similitud_basica:     'Similitud',
  };

  return (
    <div className="search-wrapper" ref={dropdownRef}>
      <div className="search-input-row">
        <div className="search-input-container">
          {/* PUNTO 4: ícono de lupa siempre visible */}
          <span className="search-icon" aria-hidden="true">
            {cargando ? <span className="search-spinner" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )}
          </span>

          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); onQueryChange?.(e.target.value); setSeleccionado(null); }}
            onKeyDown={handleKeyDown}
            onFocus={() => sugerencias.length > 0 && setAbierto(true)}
            autoComplete="off"
            aria-label="Buscar medicamento"
          />
          {query && !cargando && (
            <button className="search-clear" onClick={limpiar} title="Limpiar">
              ✕
            </button>
          )}
        </div>

        {/* PUNTO 4: botón Buscar prominente */}
        <button
          className="search-submit-btn"
          disabled={cargando}
          onClick={() => {
            if (query.trim().length < 2) {
              addToast('Escribe al menos 2 caracteres para buscar.', 'warning');
              inputRef.current?.focus();
              return;
            }
            onQueryChange?.(query);
          }}
        >
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* Hint mínimo de caracteres */}
      {query.length === 1 && (
        <p className="search-hint">Escribe al menos 2 caracteres para buscar</p>
      )}

      {/* Dropdown de sugerencias */}
      {abierto && query.length >= 2 && !cargando && (
        <div className="search-dropdown">
          <div className="search-dropdown-header">
            <span>Sugerencias</span>
            {estrategia && (
              <span className="search-estrategia-badge">
                {etiquetaEstrategia[estrategia] ?? estrategia}
              </span>
            )}
          </div>

          {/* PUNTO 4: error de red sin emoji */}
          {errorRed ? (
            <div className="search-error-state">
              Error de conexión. Intenta de nuevo.
            </div>
          ) : sugerencias.length === 0 ? (
            <div className="search-no-results">
              Sin coincidencias para <strong>"{query}"</strong>
              <span className="search-no-results-tip">Prueba el nombre genérico o el laboratorio</span>
            </div>
          ) : (
            <>
              <ul className="search-list" role="listbox">
                {sugerencias.map((s, i) => (
                  <li
                    key={s._id}
                    className={`search-item ${i === indiceActivo ? 'search-item--active' : ''}`}
                    role="option"
                    aria-selected={i === indiceActivo}
                    onMouseDown={() => handleSeleccionar(s)}
                    onMouseEnter={() => setIndiceActivo(i)}
                  >
                    <div className="search-item-name">{s.name}</div>
                    <div className="search-item-meta">
                      <span>{s.lab}</span>
                      {s.category && (
                        <span className="search-item-category">{s.category}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {/* PUNTO 4: hint de teclado sin emojis */}
              <div className="search-keyboard-hint" aria-hidden="true">
                Flechas para navegar · Enter para seleccionar · Esc para cerrar
              </div>
            </>
          )}
        </div>
      )}

      {/* Tarjeta del medicamento seleccionado */}
      {seleccionado && (
        <div className="search-selected">
          <h3>{seleccionado.name}</h3>
          <p>Laboratorio: <strong>{seleccionado.lab}</strong></p>
          {seleccionado.category && (
            <p>Categoría: <strong>{seleccionado.category}</strong></p>
          )}
          {seleccionado.description && (
            <p className="search-selected-desc">{seleccionado.description}</p>
          )}
          <button className="btn-comparar" onClick={() => onSelect?.(seleccionado)}>
            Ver comparación de precios →
          </button>
        </div>
      )}
    </div>
  );
}
