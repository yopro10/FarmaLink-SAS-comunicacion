import { useState, useRef, useEffect, useCallback } from 'react';
import { FiltrosBusqueda } from './FiltrosBusqueda';
import type { Sugerencia } from '../../types';
import { useToast } from '../../hooks/useToast';
// @ts-ignore: CSS import requires custom declaration
import './SearchSection.css';

interface SearchSectionProps {
  onSelect?: (medicamento: Sugerencia) => void;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export function SearchSection({ onSelect, isAuthenticated = false, onLoginRequired }: SearchSectionProps) {
  const [inputValue, setInputValue]   = useState('');
  const [queryActivo, setQueryActivo] = useState('');

  // ── Autocomplete state ─────────────────────────────────────────────────────
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [cargandoAuto, setCargandoAuto] = useState(false);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToast } = useToast();

  // ── Fetch sugerencias con debounce ─────────────────────────────────────────
  const fetchSugerencias = useCallback((texto: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (texto.trim().length < 2) {
      setSugerencias([]);
      setDropdownAbierto(false);
      setCargandoAuto(false);
      return;
    }
    setCargandoAuto(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sugerencias?q=${encodeURIComponent(texto)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setSugerencias(data.sugerencias ?? []);
          setDropdownAbierto(true);
        }
      } catch {
        setSugerencias([]);
      } finally {
        setCargandoAuto(false);
      }
    }, 280);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setIndiceActivo(-1);
    if (!val.trim()) { setQueryActivo(''); setSugerencias([]); setDropdownAbierto(false); return; }
    fetchSugerencias(val);
  };

  const handleSeleccionar = (s: Sugerencia) => {
    setInputValue(s.name);
    setSugerencias([]);
    setDropdownAbierto(false);
    setQueryActivo(s.name);
    onSelect?.(s);
  };

  const handleBuscar = () => {
    if (!isAuthenticated) {
      addToast('Necesitas iniciar sesión para buscar y comparar precios.', 'warning');
      onLoginRequired?.();
      return;
    }
    if (inputValue.trim().length < 2) {
      addToast('Escribe al menos 2 caracteres para buscar.', 'warning');
      inputRef.current?.focus();
      return;
    }
    setDropdownAbierto(false);
    setQueryActivo(inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (indiceActivo >= 0 && sugerencias[indiceActivo]) {
        handleSeleccionar(sugerencias[indiceActivo]);
      } else {
        handleBuscar();
      }
      return;
    }
    if (!dropdownAbierto || sugerencias.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceActivo(i => Math.min(i + 1, sugerencias.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIndiceActivo(i => Math.max(i - 1, 0)); }
    if (e.key === 'Escape')    { setDropdownAbierto(false); setIndiceActivo(-1); }
  };

  const handleLimpiar = () => {
    setInputValue(''); setQueryActivo('');
    setSugerencias([]); setDropdownAbierto(false);
    inputRef.current?.focus();
  };

  return (
    <div className="view active search-section">
      <div className="search-hero">
        <div className="container">
          <div className="section-tag">Búsqueda inteligente</div>
          <h1 className="search-section-title">¿Qué medicamento<br />estás buscando?</h1>
          <p className="section-desc">
            Escribe el nombre del medicamento y presiona Buscar.
            Puedes filtrar por categoría, laboratorio y rango de precios.
          </p>

          {!isAuthenticated ? (
            <div className="search-restricted-card" role="region" aria-label="Acceso restringido">
              <div className="search-restricted-icon" aria-hidden="true">
                <span className="search-restricted-icon-lock">🔒</span>
              </div>
              <div className="search-restricted-title">Acceso restringido</div>
              <div className="search-restricted-desc">
                Necesitas iniciar sesión para acceder a <strong>Búsqueda</strong>.
              </div>
              <div className="search-restricted-actions">
                <button
                  className="search-restricted-btn-login"
                  onClick={() => onLoginRequired?.()}
                  type="button"
                >
                  Iniciar Sesión
                </button>
                <button
                  className="search-restricted-btn-home"
                  onClick={() => window.location.assign('/')}
                  type="button"
                >
                  Volver al Inicio
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Barra de búsqueda con autocomplete integrado */}
              <div className="search-bar-wrapper" ref={dropdownRef}>
                <div className="search-bar-input-wrap">
                  <span className="search-bar-icon" aria-hidden="true">
                    {cargandoAuto
                      ? <span className="search-bar-spinner" />
                      : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                      )
                    }
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    className="search-bar-input"
                    placeholder="Ej: Acetaminofén, Ibuprofeno, Bayer..."
                    value={inputValue}
                    onChange={e => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => sugerencias.length > 0 && setDropdownAbierto(true)}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Buscar medicamento"
                    aria-haspopup="listbox"
                    aria-expanded={dropdownAbierto}
                    aria-autocomplete="list"
                  />
                  {inputValue && (
                    <button className="search-bar-clear" onClick={handleLimpiar} aria-label="Limpiar búsqueda">✕</button>
                  )}

                  {/* Dropdown de sugerencias */}
                  {dropdownAbierto && inputValue.length >= 2 && (
                    <div className="search-autocomplete-dropdown" role="listbox" aria-label="Sugerencias de medicamentos">
                      {sugerencias.length === 0 && !cargandoAuto ? (
                        <div className="search-auto-empty">
                          Sin coincidencias para <strong>"{inputValue}"</strong>
                          <span>Prueba el nombre genérico o el laboratorio</span>
                        </div>
                      ) : (
                        <>
                          <div className="search-auto-header">Sugerencias</div>
                          <ul className="search-auto-list">
                            {sugerencias.map((s, i) => (
                              <li
                                key={s._id}
                                role="option"
                                aria-selected={i === indiceActivo}
                                className={`search-auto-item ${i === indiceActivo ? 'search-auto-item--active' : ''}`}
                                onMouseDown={() => handleSeleccionar(s)}
                                onMouseEnter={() => setIndiceActivo(i)}
                              >
                                <div className="search-auto-name">{s.name}</div>
                                <div className="search-auto-meta">
                                  <span>{s.lab}</span>
                                  {s.category && <span className="search-auto-cat">{s.category}</span>}
                                </div>
                              </li>
                            ))}
                          </ul>
                          <div className="search-auto-hint" aria-hidden="true">
                            ↑↓ navegar · Enter seleccionar · Esc cerrar
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button className="search-bar-btn" onClick={handleBuscar} aria-label="Buscar medicamento">
                  Buscar
                </button>
              </div>

              <FiltrosBusqueda
                query={queryActivo}
                onSelect={med => { onSelect?.(med); }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
