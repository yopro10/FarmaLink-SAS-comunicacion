import { useState, useEffect, useRef, useCallback } from 'react';
import type { Sugerencia } from '../../types';
import { PharmacyMap } from '../common/PharmacyMap';
import { useToast } from '../../hooks/useToast';
import { useCart } from '../../hooks/useCart';
import './ProductoDetalle.css';

const GATEWAY = (import.meta as any).env?.VITE_API_URL || '';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface PrecioFarmacia {
  farmaciaId: string;
  farmaciaNombre: string;
  farmaciaAddress: string;
  precio: number;
  fecha: string;
}

// Tipos para historial de precios (gráfica Keepa)
interface PuntoHistorial {
  fecha: string;
  precio: number;
}

interface SerieHistorial {
  farmaciaId: string;
  farmaciaNombre: string;
  farmaciaDireccion: string;
  puntos: PuntoHistorial[];
}

interface ProductoDetalleProps {
  medicamento: Sugerencia;
  assistantPanelTarget?: 'compare' | 'history' | 'map' | null;
  assistantPanelNonce?: number;
  assistantSelectedFarmaciaId?: number | null;
  assistantSelectedFarmaciaNombre?: string | null;
  onBack: () => void;
  onGoHome?: () => void;
  onGoCategory?: (cat: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  analgesico: '#0B7DB8',
  antibiotico: '#8B5CF6',
  antiinflamatorio: '#F59E0B',
  vitamina: '#66B82E',
  suplemento: '#66B82E',
  antiacido: '#06B6D4',
  antihipertensivo: '#EF4444',
  cardiovascular: '#EF4444',
  antidiabetico: '#EC4899',
  respiratorio: '#0EA5E9',
  corticosteroide: '#6366F1',
  psicofarmaco: '#A855F7',
  antialergico: '#22C55E',
  gastrointestinal: '#F97316',
};

const getCategoryColor = (category?: string): string => {
  if (!category) return '#64748b';
  const key = Object.keys(CATEGORY_COLORS).find(k => category.toLowerCase().includes(k));
  return key ? CATEGORY_COLORS[key] : '#64748b';
};

// Normaliza el nombre de la estrategia para mostrarlo limpio
const formatEstrategia = (e: string): string => {
  const map: Record<string, string> = {
    coincidencia_parcial: 'Coincidencia parcial',
    similitud_basica: 'Similitud básica',
    por_categoria: 'Por categoría',
    categoria: 'Por categoría',
  };
  return map[e] ?? e.replace(/_/g, ' ');
};

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
};

// La categoría puede venir en distintos campos según el origen (búsqueda vs categoría)
const getCategory = (med: Sugerencia): string =>
  med.category || med.categoria_nombre || '';

// ── Gráfico de barras SVG (sin dependencias externas) ────────────────────────

function PriceChart({ precios }: { precios: PrecioFarmacia[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (precios.length < 2) return null;

  const PAD_L = 16, PAD_R = 16, PAD_T = 28, PAD_B = 68;
  const chartW = width - PAD_L - PAD_R;
  const chartH = 160;
  const svgH = chartH + PAD_T + PAD_B;

  const minP = Math.min(...precios.map(p => p.precio));
  const maxP = Math.max(...precios.map(p => p.precio));
  const base = minP * 0.75;
  const top = maxP * 1.08;
  const avg = precios.reduce((s, p) => s + p.precio, 0) / precios.length;

  const sorted = [...precios].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const n = sorted.length;
  const barW = Math.min(52, (chartW / n) - 12);
  const gap = (chartW - barW * n) / (n + 1);
  const getX = (i: number) => PAD_L + gap + i * (barW + gap) + barW / 2;
  const getBarH = (p: number) => Math.max(4, ((p - base) / (top - base)) * chartH);
  const getY = (p: number) => PAD_T + chartH - getBarH(p);
  const avgY = getY(avg);

  const barColor = (p: number) =>
    p === minP ? '#66B82E' : p === maxP ? '#EF4444' : '#F59E0B';

  return (
    <div ref={containerRef} className="chart-wrap">
      <svg width={width} height={svgH} className="price-chart">
        {/* Líneas de cuadrícula */}
        {[0.25, 0.5, 0.75, 1].map(t => {
          const y = PAD_T + chartH * (1 - t);
          const v = base + (top - base) * t;
          return (
            <g key={t}>
              <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y}
                stroke="#f1f5f9" strokeWidth="1" />
              <text x={PAD_L - 2} y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8">
                ${(v / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}

        {/* Línea promedio */}
        <line x1={PAD_L} y1={avgY} x2={width - PAD_R} y2={avgY}
          stroke="#0B7DB8" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7" />
        <rect x={width - PAD_R - 58} y={avgY - 9} width={58} height={13} rx="3" fill="#EFF6FF" />
        <text x={width - PAD_R - 29} y={avgY + 1} textAnchor="middle" fontSize="8" fill="#0B7DB8" fontWeight="600">
          Prom: {formatPrice(Math.round(avg))}
        </text>

        {/* Barras */}
        {sorted.map((p, i) => {
          const x = getX(i);
          const barH = getBarH(p.precio);
          const y = getY(p.precio);
          const col = barColor(p.precio);

          return (
            <g key={i}>
              <rect x={x - barW / 2} y={y} width={barW} height={barH} rx="4" fill={col} opacity="0.82" />
              <rect x={x - barW / 2} y={y} width={barW} height={Math.min(barH, 7)} rx="4" fill="white" opacity="0.18" />
              <text x={x} y={y - 5} textAnchor="middle" fontSize="9" fill={col} fontWeight="700">
                ${(p.precio / 1000).toFixed(1)}k
              </text>
              <text x={x} y={PAD_T + chartH + 13} textAnchor="end" fontSize="9" fill="#64748b"
                transform={`rotate(-38, ${x}, ${PAD_T + chartH + 13})`}>
                {p.farmaciaNombre.length > 13 ? p.farmaciaNombre.slice(0, 12) + '…' : p.farmaciaNombre}
              </text>
              <text x={x} y={PAD_T + chartH + 44} textAnchor="middle" fontSize="8" fill="#94a3b8">
                {new Date(p.fecha).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
              </text>
            </g>
          );
        })}

        {/* Eje X */}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={width - PAD_R} y2={PAD_T + chartH}
          stroke="#e2e8f0" strokeWidth="1" />
      </svg>

      <div className="chart-legend">
        <span className="chart-leg"><span className="chart-leg-dot" style={{ background: '#66B82E' }} />Precio más bajo</span>
        <span className="chart-leg"><span className="chart-leg-dot" style={{ background: '#F59E0B' }} />Precio intermedio</span>
        <span className="chart-leg"><span className="chart-leg-dot" style={{ background: '#EF4444' }} />Precio más alto</span>
        <span className="chart-leg"><span className="chart-leg-dash" />Precio promedio</span>
      </div>

      <div className="chart-summary">
        <div className="chart-stat">
          <span>Precio más bajo</span>
          <strong style={{ color: '#66B82E' }}>{formatPrice(minP)}</strong>
        </div>
        <div className="chart-stat">
          <span>Promedio</span>
          <strong style={{ color: '#0B7DB8' }}>{formatPrice(Math.round(avg))}</strong>
        </div>
        <div className="chart-stat">
          <span>Precio más alto</span>
          <strong style={{ color: '#EF4444' }}>{formatPrice(maxP)}</strong>
        </div>
        <div className="chart-stat">
          <span>Diferencia</span>
          <strong style={{ color: '#64748b' }}>{formatPrice(maxP - minP)}</strong>
        </div>
      </div>
    </div>
  );
}

// ── Gráfica de historial tipo Keepa (líneas por farmacia, eje X = tiempo) ────

const HISTORY_COLORS = [
  '#0B7DB8', '#66B82E', '#EF4444', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#EC4899', '#10B981', '#F97316', '#6366F1',
];

function PriceHistoryChart({ series }: { series: SerieHistorial[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [crosshair, setCrosshair] = useState<{ x: number; date: number } | null>(null);
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (series.length === 0) return null;

  const rawMaxDate = Math.max(...series.flatMap(s => s.puntos.map(p => new Date(p.fecha).getTime())));
  let minTime = 0;
  if (timeRange === '1W') minTime = rawMaxDate - 7 * 24 * 60 * 60 * 1000;
  if (timeRange === '1M') minTime = rawMaxDate - 30 * 24 * 60 * 60 * 1000;
  if (timeRange === '3M') minTime = rawMaxDate - 90 * 24 * 60 * 60 * 1000;
  if (timeRange === '6M') minTime = rawMaxDate - 180 * 24 * 60 * 60 * 1000;
  if (timeRange === '1Y') minTime = rawMaxDate - 365 * 24 * 60 * 60 * 1000;

  const filteredSeries = series.map(s => {
    const sorted = [...s.puntos].sort((a,b)=> new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const unicos: PuntoHistorial[] = [];
    for (const p of sorted) {
      if (unicos.length === 0) unicos.push(p);
      else if (new Date(unicos[unicos.length - 1].fecha).getTime() === new Date(p.fecha).getTime()) {
        unicos[unicos.length - 1] = p; 
      } else unicos.push(p);
    }
    
    if (minTime === 0) return { ...s, puntos: unicos };
    
    let basePrice: number | null = null;
    let fallbackPrice: number | null = null;
    for (const p of unicos) {
      const dt = new Date(p.fecha).getTime();
      if (dt <= minTime) basePrice = p.precio;
      if (fallbackPrice === null) fallbackPrice = p.precio;
    }
    
    const visiblePoints = unicos.filter(p => new Date(p.fecha).getTime() > minTime);
    if (basePrice !== null) {
       visiblePoints.unshift({ fecha: new Date(minTime).toISOString(), precio: basePrice });
    } else if (visiblePoints.length > 0 && fallbackPrice !== null) {
       visiblePoints.unshift({ fecha: new Date(minTime).toISOString(), precio: fallbackPrice });
    }
    
    return { ...s, puntos: visiblePoints };
  }).filter(s => s.puntos.length > 0);

  if (filteredSeries.length === 0) return null;

  const visibleSeries = filteredSeries.filter(s => !hiddenSeries.has(s.farmaciaId));

  const allDates = Array.from(
    new Set(filteredSeries.flatMap(s => s.puntos.map(p => p.fecha)))
  ).sort();
  if (allDates.length < 2) return null;

  const PAD_L = 62, PAD_R = 34, PAD_T = 28, PAD_B = 52;
  const chartW = Math.max(width - PAD_L - PAD_R, 100);
  const chartH = 180;
  const svgH = chartH + PAD_T + PAD_B;

  const allPrices = visibleSeries.length > 0 ? visibleSeries.flatMap(s => s.puntos.map(p => p.precio)) : [0];
  const minP = visibleSeries.length > 0 ? Math.min(...allPrices) : 0;
  const maxP = visibleSeries.length > 0 ? Math.max(...allPrices) : 1000;
  const pad = (maxP - minP) * 0.15 || maxP * 0.1;
  const yMin = Math.max(0, minP - pad);
  const yMax = maxP + pad;

  const t0 = minTime > 0 ? minTime : new Date(allDates[0]).getTime();
  const t1 = rawMaxDate;
  const tRange = t1 - t0 || 1;

  const toX = (fecha: string) =>
    PAD_L + ((new Date(fecha).getTime() - t0) / tRange) * chartW;
  const toY = (precio: number) =>
    PAD_T + chartH - ((precio - yMin) / (yMax - yMin)) * chartH;

  const buildStepPath = (sorted: PuntoHistorial[]): string => {
    if (sorted.length === 0) return '';
    let d = `M ${toX(sorted[0].fecha).toFixed(1)} ${toY(sorted[0].precio).toFixed(1)}`;
    for (let i = 1; i < sorted.length; i++) {
      const xCurr = toX(sorted[i].fecha);
      const yCurr = toY(sorted[i].precio);
      const yPrev = toY(sorted[i - 1].precio);
      d += ` L ${xCurr.toFixed(1)} ${yPrev.toFixed(1)} L ${xCurr.toFixed(1)} ${yCurr.toFixed(1)}`;
    }
    // Extender línea base hasta el final para simular "precio vigente actual"
    const maxX = PAD_L + chartW;
    const lastX = toX(sorted[sorted.length - 1].fecha);
    if (lastX < maxX) {
      d += ` L ${maxX.toFixed(1)} ${toY(sorted[sorted.length - 1].precio).toFixed(1)}`;
    }
    return d;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => yMin + (yMax - yMin) * t);
  const xTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => t0 + tRange * t);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    if (x < PAD_L) x = PAD_L;
    if (x > PAD_L + chartW) x = PAD_L + chartW;

    const dateHover = t0 + ((x - PAD_L) / chartW) * tRange;
    setCrosshair({ x, date: dateHover });
  };

  return (
    <div ref={containerRef} className="chart-wrap history-chart-wrap">
      {/* ── Barra de herramientas de tiempo ── */}
      <div className="history-toolbar">
        <span className="history-toolbar-title">📈 Evolución de precios</span>
        <div className="history-time-btns">
          {(['1W', '1M', '3M', '6M', '1Y', 'ALL'] as const).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`history-time-btn ${timeRange === r ? 'history-time-btn--active' : ''}`}
            >
              {r === 'ALL' ? 'Todo' : r === '1W' ? '1 Sem' : r === '1M' ? '1 Mes' : r === '1Y' ? '1 Año' : r}
            </button>
          ))}
        </div>
      </div>
      {/* ── Área del SVG con scroll horizontal en mobile ── */}
      <div className="history-svg-area">
      <svg
        width={width}
        height={svgH}
        className="price-chart history-chart"
        style={{ cursor: 'crosshair', userSelect: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCrosshair(null)}
      >
        <defs>
          {series.map((_, si) => (
            <linearGradient key={`grad-${si}`} id={`grad-${si}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={HISTORY_COLORS[si % HISTORY_COLORS.length]} stopOpacity="0.25" />
              <stop offset="100%" stopColor={HISTORY_COLORS[si % HISTORY_COLORS.length]} stopOpacity="0.0" />
            </linearGradient>
          ))}
        </defs>
        {yTicks.map((v, i) => {
          const y = toY(v);
          return (
            <g key={`y-${i}`}>
              <line x1={PAD_L} y1={y} x2={PAD_L + chartW + PAD_R} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
                ${(v / 1000).toFixed(1)}k
              </text>
            </g>
          );
        })}
        
        {/* All-time low marker */}
        {visibleSeries.length > 0 && minP !== Infinity && minP > 0 && (
          <g>
            <line x1={PAD_L} y1={toY(minP)} x2={PAD_L + chartW + PAD_R} y2={toY(minP)} stroke="#10B981" strokeWidth="1" strokeDasharray="4 4" opacity="0.6"/>
            <text x={PAD_L + 6} y={toY(minP) - 6} fontSize="10" fill="#10B981" fontWeight="600" opacity="0.9">
              Mínimo Histórico: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(minP)}
            </text>
          </g>
        )}

        <line x1={PAD_L} y1={PAD_T + chartH} x2={PAD_L + chartW + PAD_R} y2={PAD_T + chartH}
          stroke="#e2e8f0" strokeWidth="1" />
        {xTicks.map((ts, i) => {
          const x = PAD_L + (i * chartW) / 5;
          const label = new Date(ts).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
          return (
            <text key={`x-${i}`} x={x} y={PAD_T + chartH + 16} textAnchor="middle" fontSize="9" fill="#94a3b8">
              {label}
            </text>
          );
        })}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke="#e2e8f0" strokeWidth="1" />

        {visibleSeries.map((serie, si) => {
          const color = HISTORY_COLORS[filteredSeries.findIndex(s => s.farmaciaId === serie.farmaciaId) % HISTORY_COLORS.length];
          const unicos = serie.puntos;
          return (
            <g key={serie.farmaciaId}>
              <path
                d={buildStepPath(unicos) +
                  ` L ${(PAD_L + chartW).toFixed(1)} ${(PAD_T + chartH).toFixed(1)}` +
                  ` L ${toX(unicos[0].fecha).toFixed(1)} ${(PAD_T + chartH).toFixed(1)} Z`}
                fill={`url(#grad-${filteredSeries.findIndex(s => s.farmaciaId === serie.farmaciaId)})`}
              />
              <path d={buildStepPath(unicos)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
              {unicos.map((p, pi) => {
                const x = toX(p.fecha);
                const y = toY(p.precio);
                return (
                  <circle key={pi} cx={x} cy={y} r="2" fill={color} stroke="none" opacity={0.6} />
                );
              })}
            </g>
          );
        })}

        {/* Current price tags on right axis */}
        {visibleSeries.map((serie, si) => {
          const color = HISTORY_COLORS[filteredSeries.findIndex(s => s.farmaciaId === serie.farmaciaId) % HISTORY_COLORS.length];
          const lastPrice = serie.puntos[serie.puntos.length - 1].precio;
          const y = toY(lastPrice);
          return (
            <g key={`tag-${serie.farmaciaId}`}>
              <rect x={PAD_L + chartW} y={y - 8} width={PAD_R} height={16} fill={color} opacity="0.15" rx="2" />
              <text x={PAD_L + chartW + 3} y={y + 3} fontSize="9.5" fill={color} fontWeight="700">
                ${(lastPrice / 1000).toFixed(1)}k
              </text>
            </g>
          );
        })}

        {crosshair && (
          <>
            <line x1={crosshair.x} y1={PAD_T} x2={crosshair.x} y2={PAD_T + chartH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />

            {(() => {
              const formattedDate = new Date(crosshair.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

              const activePrices = visibleSeries.map((s) => {
                const sorted = s.puntos;
                if (sorted.length === 0) return null;
                let price = sorted[0].precio;
                let prevPrice = price;
                for (const p of sorted) {
                  if (new Date(p.fecha).getTime() <= crosshair.date) { 
                    prevPrice = price; // Guardar el anterior para la tendencia
                    price = p.precio; 
                  } else break;
                }
                const diff = price - prevPrice;
                const pct = prevPrice > 0 && diff !== 0 ? (diff / prevPrice) * 100 : 0;
                const actualColor = HISTORY_COLORS[filteredSeries.findIndex(f => f.farmaciaId === s.farmaciaId) % HISTORY_COLORS.length];
                return { name: s.farmaciaNombre, price, pct, y: toY(price), color: actualColor };
              }).filter(Boolean);

              const TW = 225;
              const TH = 28 + activePrices.length * 18;
              const tx = crosshair.x + 15 + TW > PAD_L + chartW ? crosshair.x - TW - 15 : crosshair.x + 15;
              const ty = Math.max(PAD_T, PAD_T + (chartH - TH) / 2); // Center vertically
              return (
                <g>
                  {/* Puntos interactivos sobre cada línea */}
                  {activePrices.map((ap, i) => (
                    <circle key={`dot-${i}`} cx={crosshair.x} cy={ap!.y} r="4.5" fill={ap!.color} stroke="#fff" strokeWidth="1.5" />
                  ))}

                  <rect x={tx} y={ty} width={TW} height={TH} rx="8" fill="#1e293b" opacity="0.95" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))" />
                  <text x={tx + 12} y={ty + 20} fontSize="11" fill="#e2e8f0" fontWeight="600">{formattedDate}</text>
                  {activePrices.map((ap, i) => {
                    const sign = ap!.pct > 0 ? '↑' : ap!.pct < 0 ? '↓' : '';
                    const pctColor = ap!.pct > 0 ? '#ef4444' : ap!.pct < 0 ? '#10b981' : '#cbd5e1';
                    return (
                      <g key={`txt-${i}`}>
                        <text x={tx + 12} y={ty + 40 + i * 18} fontSize="11" fill={ap!.color} fontWeight="500">
                          {ap!.name.length > 13 ? ap!.name.slice(0, 12) + '…' : ap!.name}: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(ap!.price)}
                        </text>
                        {ap!.pct !== 0 && (
                          <text x={tx + 12 + 150} y={ty + 40 + i * 18} fontSize="11" fill={pctColor} fontWeight="600">
                            {sign} {Math.abs(ap!.pct).toFixed(1)}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </>
        )}
      </svg>

      </div>{/* end history-svg-area */}

      {/* ── Leyenda de farmacias clicable ── */}
      <div className="history-legend">
        {filteredSeries.map((serie, si) => (
          <span
            key={serie.farmaciaId}
            className={`history-leg-item ${hiddenSeries.has(serie.farmaciaId) ? 'history-leg-item--hidden' : ''}`}
            onClick={() => {
              const newSet = new Set(hiddenSeries);
              if (newSet.has(serie.farmaciaId)) newSet.delete(serie.farmaciaId);
              else newSet.add(serie.farmaciaId);
              setHiddenSeries(newSet);
            }}
            title={hiddenSeries.has(serie.farmaciaId) ? 'Mostrar' : 'Ocultar'}
          >
            <span className="history-leg-line" style={{ background: HISTORY_COLORS[si % HISTORY_COLORS.length] }} />
            <span className="history-leg-name">
              {serie.farmaciaNombre.length > 26 ? serie.farmaciaNombre.slice(0, 25) + '…' : serie.farmaciaNombre}
            </span>
          </span>
        ))}
      </div>

      {/* ── Estadísticas del historial ── */}
      {visibleSeries.length > 0 && (() => {
        const allPreciosHist = visibleSeries.flatMap(s => s.puntos.map(p => p.precio));
        const minHist  = Math.min(...allPreciosHist);
        const maxHist  = Math.max(...allPreciosHist);
        const avgHist  = allPreciosHist.reduce((a, b) => a + b, 0) / allPreciosHist.length;
        const spread   = maxHist - minHist;
        const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
        return (
          <div className="history-stats">
            <div className="history-stat">
              <span className="history-stat__label">Precio Mín.</span>
              <strong className="history-stat__value history-stat__value--green">{fmt(minHist)}</strong>
            </div>
            <div className="history-stat">
              <span className="history-stat__label">Precio Máx.</span>
              <strong className="history-stat__value history-stat__value--red">{fmt(maxHist)}</strong>
            </div>
            <div className="history-stat">
              <span className="history-stat__label">Promedio</span>
              <strong className="history-stat__value history-stat__value--blue">{fmt(avgHist)}</strong>
            </div>
            <div className="history-stat">
              <span className="history-stat__label">Diferencia</span>
              <strong className="history-stat__value">{fmt(spread)}</strong>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function ProductoDetalle({
  medicamento,
  assistantPanelTarget = null,
  assistantPanelNonce = 0,
  assistantSelectedFarmaciaId = null,
  assistantSelectedFarmaciaNombre = null,
  onBack,
  onGoHome,
  onGoCategory,
}: ProductoDetalleProps) {
  const [precios, setPrecios] = useState<PrecioFarmacia[]>([]);
  const [loadingPrecios, setLoadingPrecios] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historial, setHistorial] = useState<SerieHistorial[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [imgSrc, setImgSrc] = useState(`/medicamentos/${medicamento._id}.png`);
  const [imgTried, setImgTried] = useState<'png' | 'jpg' | 'placeholder'>('png');
  const [selectedFarmacia, setSelectedFarmacia] = useState<PrecioFarmacia | null>(null);
  const chartSectionRef = useRef<HTMLDivElement | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const pricesSectionRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);

  // States para Formulario de Precios
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [farmaciasList, setFarmaciasList] = useState<{id: string|number, name: string}[]>([]);
  const [loadingFarmacias, setLoadingFarmacias] = useState(false);
  const [formFarmaciaId, setFormFarmaciaId] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const isAdmin = !!localStorage.getItem('token');

  const { addToast } = useToast();
  const { addToCart } = useCart();
  const category = getCategory(medicamento);
  const catColor = getCategoryColor(category);
  const farmaciaIds = precios.map(p => Number(p.farmaciaId)).filter(n => !isNaN(n) && n > 0);

  const loadFarmacias = async () => {
    if (farmaciasList.length > 0) return;
    setLoadingFarmacias(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${GATEWAY}/api/farmacias`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        setFarmaciasList(lista);
      }
    } catch {
      addToast('Error cargando lista de farmacias', 'error');
    } finally {
      setLoadingFarmacias(false);
    }
  };

  const handleTogglePriceForm = () => {
    setShowPriceForm(v => {
      const next = !v;
      if (next) loadFarmacias();
      return next;
    });
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFarmaciaId || !formPrecio) {
      addToast('Completa todos los campos obligatorios.', 'error');
      return;
    }
    const precioNum = Number(formPrecio);
    if (isNaN(precioNum) || precioNum <= 0) {
      addToast('El precio debe ser un número válido mayor a 0.', 'error');
      return;
    }

    // Priorizar medicamento.id (número), si no existe usar _id convertido a número
    const medId = medicamento.id ?? Number(medicamento._id);
    if (!medId || isNaN(Number(medId))) {
      addToast('No se pudo identificar el medicamento correctamente.', 'error');
      return;
    }
    
    setSavingPrice(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        medicamento_id: Number(medId),
        farmacia_id: Number(formFarmaciaId),
        precio: precioNum
      };
      const res = await fetch(`${GATEWAY}/api/precios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      const farName = farmaciasList.find(f => String(f.id) === formFarmaciaId)?.name || 'Farmacia';
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        addToast(errData?.message || 'Error al guardar el precio en el servidor.', 'error');
      } else {
        addToast('Precio guardado correctamente.', 'success');
        
        // Actualización reactiva local (solo si el servidor respondió bien)
        setPrecios(prev => {
          const next = [...prev];
          const existIdx = next.findIndex(p => p.farmaciaId === formFarmaciaId);
          const nuevoPrecio = {
            farmaciaId: formFarmaciaId,
            farmaciaNombre: farName,
            farmaciaAddress: '',
            precio: precioNum,
            fecha: new Date().toISOString()
          };
          if (existIdx >= 0) {
            next[existIdx] = nuevoPrecio;
          } else {
            next.push(nuevoPrecio);
          }
          return next;
        });
        
        setFormPrecio('');
      }
    } catch (err) {
      console.error(err);
      addToast('Error al conectar con el servidor.', 'error');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleImgError = () => {
    if (imgTried === 'png') {
      setImgSrc(`/medicamentos/${medicamento._id}.jpg`);
      setImgTried('jpg');
    } else {
      setImgSrc('/medicamentos/placeholder.svg');
      setImgTried('placeholder');
    }
  };

  // Cargar historial de precios (solo bajo demanda)
  const fetchHistorial = useCallback(async () => {
    if (historial.length > 0) return;
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${GATEWAY}/api/precios/historial/${medicamento._id}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.ok) {
        const data = await res.json();
        setHistorial(data.series ?? []);
      }
    } catch (err) {
      console.error('Error historial:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [medicamento._id, historial.length]);

  useEffect(() => {
    setImgSrc(`/medicamentos/${medicamento._id}.png`);
    setImgTried('png');
    setSelectedFarmacia(null);
    setShowChart(false);
    setShowMap(false);
    setShowHistory(false);
    setHistorial([]);

    const fetchPrecios = async () => {
      setLoadingPrecios(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${GATEWAY}/api/precios/comparar/${medicamento._id}?orden=asc`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const data = await res.json();
          const lista = data.listaOrdenada ?? data.data ?? [];
          setPrecios(lista.map((item: any) => ({
            farmaciaId: item.farmaciaId?._id ?? '',
            farmaciaNombre: item.farmaciaNombre ?? item.farmaciaId?.name ?? 'Farmacia',
            farmaciaAddress: item.farmaciaId?.address ?? '',
            precio: item.precio,
            fecha: item.fecha,
          })));
        }
      } catch (err) {
        console.error('Error precios:', err);
        addToast('Error al cargar precios. Verifica tu conexión.', 'error');
      } finally {
        setLoadingPrecios(false);
      }
    };
    fetchPrecios();
  }, [medicamento._id]);

  useEffect(() => {
    if (!assistantPanelTarget) return;

    if (assistantPanelTarget === 'compare') {
      setShowChart(precios.length > 1);
      setShowHistory(false);
      setShowMap(false);
      return;
    }

    if (assistantPanelTarget === 'history') {
      setShowChart(false);
      setShowMap(false);
      setShowHistory(true);
      fetchHistorial();
      return;
    }

    if (assistantPanelTarget === 'map') {
      setShowChart(false);
      setShowHistory(false);
      setShowMap(precios.length > 0);
    }
  }, [assistantPanelTarget, assistantPanelNonce, precios.length, fetchHistorial]);

  useEffect(() => {
    if (!assistantSelectedFarmaciaId && !assistantSelectedFarmaciaNombre) return;
    if (precios.length === 0) return;

    const normalizedName = assistantSelectedFarmaciaNombre?.trim().toLowerCase();
    const match = precios.find((p) => {
      const idMatch =
        assistantSelectedFarmaciaId !== null && Number(p.farmaciaId) === Number(assistantSelectedFarmaciaId);
      const nameMatch =
        !!normalizedName && p.farmaciaNombre.trim().toLowerCase() === normalizedName;
      return idMatch || nameMatch;
    });
    if (match) {
      setSelectedFarmacia(match);
    }
  }, [assistantSelectedFarmaciaId, assistantSelectedFarmaciaNombre, assistantPanelNonce, precios]);

  useEffect(() => {
    const smoothScroll = (target: HTMLDivElement | null) => {
      if (!target) return;
      window.requestAnimationFrame(() => {
        const header = document.getElementById('header');
        const headerHeight = header ? header.getBoundingClientRect().height : 88;
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 22;
        window.scrollTo({
          top: Math.max(0, top),
          behavior: 'smooth',
        });
      });
    };

    if (!assistantPanelTarget && !assistantSelectedFarmaciaId && !assistantSelectedFarmaciaNombre) {
      smoothScroll(heroSectionRef.current);
      return;
    }

    if (assistantPanelTarget === 'compare' && showChart) {
      smoothScroll(chartSectionRef.current);
      return;
    }

    if (assistantPanelTarget === 'history' && showHistory) {
      smoothScroll(historySectionRef.current);
      return;
    }

    if (assistantPanelTarget === 'map' && showMap) {
      smoothScroll(mapSectionRef.current);
      return;
    }

    if (!assistantPanelTarget && selectedFarmacia && (assistantSelectedFarmaciaId || assistantSelectedFarmaciaNombre)) {
      smoothScroll(pricesSectionRef.current);
    }
  }, [
    assistantPanelTarget,
    assistantPanelNonce,
    assistantSelectedFarmaciaId,
    assistantSelectedFarmaciaNombre,
    showChart,
    showHistory,
    showMap,
    selectedFarmacia,
  ]);

  const sorted = [...precios].sort((a, b) => sortOrder === 'asc' ? a.precio - b.precio : b.precio - a.precio);
  const minPrecio = precios.length > 0 ? Math.min(...precios.map(p => p.precio)) : null;
  const maxPrecio = precios.length > 0 ? Math.max(...precios.map(p => p.precio)) : null;
  const heroPrice = selectedFarmacia ? selectedFarmacia.precio : minPrecio;
  const heroSavings = (heroPrice !== null && maxPrecio !== null && maxPrecio !== heroPrice)
    ? Math.round(((maxPrecio - heroPrice) / maxPrecio) * 100) : 0;

  return (
    <div className="pd-view view active">

      {/* ── Breadcrumb ── */}
      <nav className="pd-breadcrumb container" aria-label="Ruta de navegación">
        <button className="pd-crumb-btn" onClick={onGoHome ?? onBack}>Inicio</button>
        <span className="pd-crumb-sep" aria-hidden="true">›</span>
        <button className="pd-crumb-btn" onClick={onBack}>Buscar</button>
        {category && (
          <>
            <span className="pd-crumb-sep" aria-hidden="true">›</span>
            {onGoCategory
              ? <button className="pd-crumb-btn" onClick={() => onGoCategory(category)}>{category}</button>
              : <span className="pd-crumb-inactive">{category}</span>
            }
          </>
        )}
        <span className="pd-crumb-sep" aria-hidden="true">›</span>
        <span className="pd-crumb-current" title={medicamento.name}>{medicamento.name}</span>
      </nav>

      {/* ── Hero ── */}
      <div ref={heroSectionRef} className="container pd-hero">

        {/* Imagen */}
        <div className="pd-img-wrap">
          <img className="pd-img" src={imgSrc} alt={medicamento.name} onError={handleImgError} />
          {category && (
            <span className="pd-img-badge" style={{ background: catColor }}>{category}</span>
          )}
        </div>

        {/* Info */}
        <div className="pd-info">
          <p className="pd-lab">{medicamento.lab}</p>
          <h1 className="pd-name">{medicamento.name}</h1>

          {/* Precio hero */}
          {loadingPrecios && <div className="pd-price-skeleton" />}

          {!loadingPrecios && heroPrice !== null && (
            <div className="pd-price-hero">
              {selectedFarmacia ? (
                <p className="pd-price-context">
                  Precio en <strong>{selectedFarmacia.farmaciaNombre}</strong>
                  <button className="pd-clear-sel" onClick={() => setSelectedFarmacia(null)}>
                    Volver al mejor precio
                  </button>
                </p>
              ) : (
                maxPrecio !== minPrecio && (
                  <span className="pd-old-price">{formatPrice(maxPrecio!)} <em>(precio más alto)</em></span>
                )
              )}
              <div className="pd-price-row">
                <span className={`pd-main-price ${selectedFarmacia ? 'pd-main-price--selected' : ''}`}>
                  {formatPrice(heroPrice)}
                </span>
                {heroSavings > 0 && (
                  <span className="pd-discount-pill">{heroSavings}% menos</span>
                )}
              </div>
            </div>
          )}

          {/* Disponibilidad */}
          {!loadingPrecios && (
            <div className="pd-availability">
              <span className={`pd-avail-dot ${precios.length > 0 ? 'dot-green' : 'dot-gray'}`} />
              {precios.length > 0
                ? <span>Disponible en <strong>{precios.length} farmacia{precios.length !== 1 ? 's' : ''}</strong></span>
                : <span>Sin stock registrado</span>
              }
            </div>
          )}

          <hr className="pd-divider" />

          {/* Descripción */}
          {medicamento.description && (
            <div className="pd-desc-block">
              <h3>Descripción</h3>
              <p>{medicamento.description}</p>
            </div>
          )}

          {/* Ficha técnica */}
          <div className="pd-specs">
            <div className="pd-spec">
              <span className="pd-spec-label">Laboratorio fabricante</span>
              <span className="pd-spec-value">{medicamento.lab}</span>
            </div>
            {category && (
              <div className="pd-spec">
                <span className="pd-spec-label">Categoría terapéutica</span>
                <span className="pd-spec-value">{category}</span>
              </div>
            )}
            <div className="pd-spec">
              <span className="pd-spec-label">Búsqueda realizada con</span>
              <span className="pd-spec-value pd-strategy">
                {formatEstrategia(medicamento.estrategiaUsada)}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pd-action-btns">
            <button 
              className="btn-primary pd-add-cart-btn" 
              disabled={precios.length === 0}
              onClick={() => {
                const targetFarmacia = selectedFarmacia || sorted[0];
                if (targetFarmacia) {
                  addToCart({
                    id: `${medicamento._id}-${targetFarmacia.farmaciaId}`,
                    medicamento: medicamento,
                    farmaciaId: targetFarmacia.farmaciaId,
                    farmaciaNombre: targetFarmacia.farmaciaNombre,
                    precioUnidad: targetFarmacia.precio,
                    cantidad: 1
                  });
                  addToast('Añadido al carrito', 'success');
                }
              }}
              style={{ padding: '0.8rem 1.5rem', width: '100%', marginBottom: '1rem', fontSize: '1.1rem' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Añadir al Carrito
            </button>
            {precios.length > 1 && (
              <button className={`pd-action-btn pd-chart-btn ${showChart ? 'active' : ''}`}
                onClick={() => setShowChart(v => !v)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
                </svg>
                {showChart ? 'Ocultar comparativa' : 'Comparar precios por farmacia'}
              </button>
            )}
            <button
              className={`pd-action-btn pd-history-btn ${showHistory ? 'active' : ''}`}
              onClick={() => {
                const next = !showHistory;
                setShowHistory(next);
                if (next) fetchHistorial();
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {showHistory ? 'Ocultar historial' : 'Ver historial de precios'}
            </button>
            {precios.length > 0 && (
              <button className={`pd-action-btn pd-map-btn ${showMap ? 'active' : ''}`}
                onClick={() => setShowMap(v => !v)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                  <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
                </svg>
                {showMap ? 'Ocultar mapa' : `Ver ${precios.length} farmacias en el mapa`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Gráfico de barras: comparativa actual por farmacia ── */}
      {showChart && precios.length > 1 && (
        <div ref={chartSectionRef} className="container pd-chart-section">
          <div className="pd-section-header">
            <h2>Comparativa de precios por farmacia</h2>
            <p>Precio registrado en cada farmacia disponible</p>
          </div>
          <PriceChart precios={precios} />
        </div>
      )}

      {/* ── Gráfica de historial tipo Keepa (precio vs. tiempo) ── */}
      {showHistory && (
        <div ref={historySectionRef} className="container pd-chart-section">
          <div className="pd-section-header">
            <h2>📈 Historial de precios</h2>
            <p>Evolución del precio a través del tiempo, por farmacia</p>
          </div>
          {loadingHistory && (
            <div className="pd-skeletons">
              {[1, 2].map(i => <div key={i} className="pd-skel" style={{ height: '12px' }} />)}
            </div>
          )}
          {!loadingHistory && historial.length === 0 && (
            <div className="pd-empty">
              <p>No hay historial de cambios de precio registrado aún.</p>
              <small>El historial se irá construyendo cada vez que se actualice un precio.</small>
            </div>
          )}
          {!loadingHistory && historial.length > 0 && (
            <PriceHistoryChart series={historial} />
          )}
        </div>
      )}

      {/* ── Mapa ── */}
      {showMap && (
        <div ref={mapSectionRef} className="container pd-map-section">
          <div className="pd-section-header">
            <h2>Farmacias que venden este medicamento</h2>
            <p>Solo se muestran las {precios.length} farmacias donde puedes comprar este producto</p>
          </div>
          <PharmacyMap filterPharmacyIds={farmaciaIds} />
        </div>
      )}

      {/* ── Tabla de precios ── */}
      <div ref={pricesSectionRef} className="container pd-prices-section">
        <div className="pd-prices-hd">
          <div>
            <h2>
              Comparar precios por farmacia
              {precios.length > 0 && <span className="pd-count-badge">{precios.length}</span>}
            </h2>
            {!selectedFarmacia && precios.length > 0 && (
              <p className="pd-hint">Selecciona una farmacia para ver su precio destacado</p>
            )}
            {selectedFarmacia && (
              <p className="pd-hint">
                Mostrando precio de <strong>{selectedFarmacia.farmaciaNombre}</strong> ·
                <button className="pd-hint-btn" onClick={() => setSelectedFarmacia(null)}>Mostrar mejor precio</button>
              </p>
            )}
          </div>
          {precios.length > 1 && (
            <button className="pd-sort-btn"
              onClick={() => setSortOrder(v => v === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? 'Mayor precio primero' : 'Menor precio primero'}
            </button>
          )}
        </div>


        {loadingPrecios && (
          <div className="pd-skeletons">{[1, 2, 3].map(i => <div key={i} className="pd-skel" />)}</div>
        )}

        {!loadingPrecios && precios.length === 0 && (
          <div className="pd-empty">
            <p>No hay precios registrados para este medicamento.</p>
            <small>Los precios se actualizan periódicamente.</small>
          </div>
        )}

        {!loadingPrecios && sorted.length > 0 && (
          <div className="pd-price-list">
            {sorted.map((p, idx) => {
              const isBest = p.precio === minPrecio;
              const isSelected = selectedFarmacia?.farmaciaId === p.farmaciaId;
              const savings = maxPrecio && maxPrecio !== minPrecio
                ? Math.round(((maxPrecio - p.precio) / maxPrecio) * 100) : 0;

              return (
                <div key={idx}
                  className={`pd-card ${isBest ? 'pd-card--best' : ''} ${isSelected ? 'pd-card--selected' : ''}`}
                  onClick={() => setSelectedFarmacia(prev => prev?.farmaciaId === p.farmaciaId ? null : p)}
                  title="Clic para ver este precio destacado arriba">

                  {isBest && !isSelected && <div className="pd-best-tag">Mejor precio disponible</div>}
                  {isSelected && <div className="pd-best-tag pd-selected-tag">Seleccionada</div>}

                  <div className="pd-card-left">
                    <div className="pd-farm-avatar">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <div className="pd-farm-info">
                      <h4>{p.farmaciaNombre}</h4>
                      {p.farmaciaAddress && (
                        <p className="pd-addr">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {p.farmaciaAddress}
                        </p>
                      )}
                      <p className="pd-date">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Precio registrado el {formatDate(p.fecha)}
                      </p>
                    </div>
                  </div>

                  <div className="pd-card-right">
                    <span className="pd-price">{formatPrice(p.precio)}</span>
                    {isBest && savings > 0 && (
                      <span className="pd-save">Ahorra {savings}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
