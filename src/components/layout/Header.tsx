import { useState, useEffect, useRef } from 'react';
import type { View, Categoria } from '../../types';
import logoFarmalink from '../../assets/logo-farmalink.png';
import { useCart } from '../../hooks/useCart';
import './Header.css';

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isAuthenticated: boolean;
  userRole: string;
  onLogout: () => void;
  onCategorySelect: (categoria: string) => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export function Header({ currentView, onViewChange, isAuthenticated, userRole, onLogout, onCategorySelect }: HeaderProps) {
  const { cartCount } = useCart();
  const headerRef = useRef<HTMLElement>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const a11yRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/categorias`)
      .then(r => r.json())
      .then(d => { if (d.success) setCategorias(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (a11yRef.current && !a11yRef.current.contains(e.target as Node)) {
        setA11yOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Bloquear scroll del body cuando el menú mobile está abierto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Aplicar modo oscuro al body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Aplicar tamaño de fuente
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  // Sincroniza la altura real del header para posicionar correctamente el breadcrumb.
  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const applyHeaderHeight = () => {
      const h = Math.ceil(headerEl.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    };

    applyHeaderHeight();
    const observer = new ResizeObserver(applyHeaderHeight);
    observer.observe(headerEl);
    window.addEventListener('resize', applyHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', applyHeaderHeight);
    };
  }, []);

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 12));

  const handleNavClick = (view: View) => {
    onViewChange(view);
    setMobileOpen(false);
    setDropdownOpen(false);
  };

  const handleCategoryClick = (nombre: string) => {
    setDropdownOpen(false);
    setMobileOpen(false);
    onCategorySelect(nombre);
    onViewChange('categoria');
  };

  return (
    <>
      <header className="header" id="header" ref={headerRef}>
        <nav className="navbar">
          <div className="container navbar-container">
            <a
              className="logo"
              href="#"
              onClick={(e) => { e.preventDefault(); handleNavClick('home'); }}
            >
              <img src={logoFarmalink} alt="FarmaLink" className="logo-img" />
            </a>

            <button
              className={`mobile-menu-btn ${mobileOpen ? 'open' : ''}`}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMobileOpen(prev => !prev)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            <ul className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
              <li>
                <a onClick={() => handleNavClick('home')} className={currentView === 'home' ? 'active' : ''}>
                  Inicio
                </a>
              </li>
              <li>
                <a onClick={() => handleNavClick('buscar')} className={currentView === 'buscar' ? 'active' : ''}>
                  Buscar
                </a>
              </li>

              <li
                className={`nav-dropdown-wrapper ${currentView === 'categoria' ? 'active-parent' : ''}`}
                ref={dropdownRef}
              >
                <a
                  className={`nav-dropdown-trigger ${currentView === 'categoria' ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(prev => !prev)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  Categorías
                  <span className={`nav-dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>▾</span>
                </a>

                {dropdownOpen && (
                  <div className="nav-dropdown" role="menu">
                    <div className="nav-dropdown-header">Categorías de medicamentos</div>
                    <ul>
                      {categorias.length === 0 ? (
                        <li className="nav-dropdown-loading">Cargando...</li>
                      ) : (
                        <>
                          <li>
                            <button
                              className="nav-dropdown-item"
                              onClick={() => handleCategoryClick('')}
                              role="menuitem"
                            >
                              Todos
                            </button>
                          </li>
                          {categorias.map(cat => (
                            <li key={cat.id}>
                              <button
                                className="nav-dropdown-item"
                                onClick={() => handleCategoryClick(cat.nombre)}
                                role="menuitem"
                              >
                                {cat.nombre}
                              </button>
                            </li>
                          ))}
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </li>

              <li>
                <a onClick={() => handleNavClick('mapa')} className={currentView === 'mapa' ? 'active' : ''}>
                  Mapa
                </a>
              </li>
              <li>
                <a onClick={() => handleNavClick('dashboard')} className={currentView === 'dashboard' ? 'active' : ''}>
                  Dashboard
                </a>
              </li>
              <li>
                <a onClick={() => handleNavClick('quienes-somos')} className={currentView === 'quienes-somos' ? 'active' : ''}>
                  Quiénes Somos
                </a>
              </li>
              <li>
                <a onClick={() => handleNavClick('desarrolladores')} className={currentView === 'desarrolladores' ? 'active' : ''}>
                  Equipo
                </a>
              </li>
              <li>
                <a onClick={() => handleNavClick('faq')} className={currentView === 'faq' ? 'active' : ''}>
                  FAQ
                </a>
              </li>
              {userRole === 'admin' && (
                <li>
                  <a onClick={() => handleNavClick('admin')} className={currentView === 'admin' ? 'active' : ''}>
                    Admin
                  </a>
                </li>
              )}
              <li className="nav-cart-item">
                <a 
                  className={`nav-cart-link ${currentView === 'cart' || currentView === 'checkout' ? 'active' : ''}`}
                  onClick={() => handleNavClick('cart')}
                  aria-label="Ver carrito"
                  title="Carrito de Compras"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
                </a>
              </li>
              <li className="nav-cta-item">
                {isAuthenticated ? (
                  <>
                    <a onClick={() => handleNavClick('settings')} className={`nav-mi-cuenta ${currentView === 'settings' ? 'active' : ''}`} title="Mi cuenta">
                      Mi cuenta
                    </a>
                    <button className="nav-logout" onClick={() => { onLogout(); setMobileOpen(false); }}>
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <a className="nav-cta" onClick={() => handleNavClick('login')}>
                    Iniciar Sesión
                  </a>
                )}
              </li>
            </ul>
          </div>
        </nav>
      </header>

      {/* ── Botón de Accesibilidad Flotante ── */}
      <div className="a11y-widget" ref={a11yRef}>
        <button
          className="a11y-trigger"
          aria-label="Opciones de accesibilidad"
          onClick={() => setA11yOpen(prev => !prev)}
          title="Accesibilidad"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.5"/>
            <path d="M12 7v6M9 10l-3 3M15 10l3 3M10 20l2-7 2 7"/>
          </svg>
        </button>

        {a11yOpen && (
          <div className="a11y-panel" role="dialog" aria-label="Panel de accesibilidad">
            {/* ── Cabecera ── */}
            <div className="a11y-panel-header">
              <div className="a11y-header-left">
                {/* Ícono SVG – sin emoji */}
                <svg className="a11y-header-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="1.8"/>
                  <path d="M12 8v5M9 11l-2.5 3M15 11l2.5 3M10.5 19l1.5-5 1.5 5"/>
                </svg>
                <span>Accesibilidad</span>
              </div>
              {/* X perfectamente circular */}
              <button className="a11y-close" onClick={() => setA11yOpen(false)} aria-label="Cerrar panel">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="9" y2="9"/>
                  <line x1="9" y1="1" x2="1" y2="9"/>
                </svg>
              </button>
            </div>

            <div className="a11y-panel-body">
              {/* ── Modo Oscuro ── */}
              <div className="a11y-option">
                <div className="a11y-option-info">
                  {/* Ícono SVG luna/sol – sin emoji */}
                  <span className="a11y-option-icon">
                    {darkMode ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                      </svg>
                    )}
                  </span>
                  <span className="a11y-option-label">Modo Oscuro</span>
                </div>
                <button
                  className={`a11y-toggle ${darkMode ? 'active' : ''}`}
                  onClick={() => setDarkMode(prev => !prev)}
                  aria-pressed={darkMode}
                >
                  <span className="a11y-toggle-knob"></span>
                </button>
              </div>

              {/* ── Tamaño de letra ── */}
              <div className="a11y-option a11y-option--full">
                <div className="a11y-option-info">
                  {/* Ícono SVG "T" – sin emoji */}
                  <span className="a11y-option-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7"/>
                      <line x1="9" y1="20" x2="15" y2="20"/>
                      <line x1="12" y1="4" x2="12" y2="20"/>
                    </svg>
                  </span>
                  <span className="a11y-option-label">Tamaño de letra</span>
                </div>
                <div className="a11y-font-controls">
                  <button
                    className="a11y-font-btn"
                    onClick={decreaseFontSize}
                    disabled={fontSize <= 12}
                    aria-label="Disminuir tamaño de letra"
                  >
                    A−
                  </button>
                  <span className="a11y-font-size">{fontSize}px</span>
                  <button
                    className="a11y-font-btn"
                    onClick={increaseFontSize}
                    disabled={fontSize >= 24}
                    aria-label="Aumentar tamaño de letra"
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Reset */}
              <button
                className="a11y-reset"
                onClick={() => { setDarkMode(false); setFontSize(16); }}
              >
                ↺ Restablecer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay para cerrar menú mobile */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
    </>
  );
}
