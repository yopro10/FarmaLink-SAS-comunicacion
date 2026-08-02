import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AssistantContext,
  AssistantOption,
  AssistantPresentationPanel,
  AssistantPreviewData,
  AssistantPriceItem,
  AssistantResponsePayload,
  ChatMessage,
} from '../../types/assistant';
import { sendAssistantMessage } from '../../services/aiAssistant';
// @ts-ignore: CSS side-effect import for Vite bundling
import './AssistantChat.css';

interface AssistantChatProps {
  context: AssistantContext;
  onAction: (response: AssistantResponsePayload) => void;
}

const ASSISTANT_ICON_SRC = '/assistant-icon.png';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function actionLabel(action: AssistantResponsePayload['action']): string {
  switch (action) {
    case 'go_home':
      return 'Ir a inicio';
    case 'go_search':
      return 'Ir a busqueda';
    case 'go_product':
      return 'Ver ficha del medicamento';
    case 'go_compare':
      return 'Ver comparador';
    case 'go_history':
      return 'Ver historial de precios';
    case 'go_map':
      return 'Ver mapa de farmacias';
    case 'go_dashboard':
      return 'Ir al dashboard';
    case 'go_category':
      return 'Ver categorias';
    case 'go_cart':
      return 'Ver mi carrito';
    case 'go_developers':
      return 'Ir al equipo';
    case 'go_about':
      return 'Ir a quienes somos';
    case 'go_faq':
      return 'Ir al FAQ';
    default:
      return 'Continuar';
  }
}

function toGuidedOptions(response: AssistantResponsePayload): AssistantOption[] {
  if (Array.isArray(response.options) && response.options.length > 0) {
    return response.options;
  }

  if (response.action === 'none') {
    return [];
  }

  return [
    {
      id: `fallback-${response.action}`,
      label: actionLabel(response.action),
      action: response.action,
      params: response.params,
    },
  ];
}

function parsePreview(response: AssistantResponsePayload): AssistantPreviewData | undefined {
  const data = (response.data || {}) as Record<string, unknown>;
  if (!data || Object.keys(data).length === 0) return undefined;

  const pricesRaw = Array.isArray(data.prices) ? data.prices : [];
  const prices = pricesRaw
    .map((item) => item as AssistantPriceItem)
    .filter((p) => Number.isFinite(Number(p.precio)))
    .sort((a, b) => Number(a.precio) - Number(b.precio));

  return {
    intent: typeof data.intent === 'string' ? data.intent : undefined,
    query: typeof data.query === 'string' ? data.query : undefined,
    primaryMedicine: data.primaryMedicine as AssistantPreviewData['primaryMedicine'],
    matches: Array.isArray(data.matches) ? (data.matches as AssistantPreviewData['matches']) : [],
    prices,
    priceInsights: (data.priceInsights || {}) as AssistantPreviewData['priceInsights'],
    presentationPanels: Array.isArray(data.presentationPanels)
      ? (data.presentationPanels as AssistantPresentationPanel[])
      : [],
  };
}

function formatCop(value: number): string {
  return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

function toImageSrc(medicamentoId?: number): string {
  if (!medicamentoId) return '/medicamentos/placeholder.svg';
  return `/medicamentos/${medicamentoId}.png`;
}

function extractDoseLabel(name?: string): string | null {
  if (!name) return null;
  const match = name.match(/\b\d+\s?(mg|ml|mcg|g)(?:\s*\/\s*\d+\s?ml)?\b/i);
  return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}

export function AssistantChat({ context, onAction }: AssistantChatProps) {
  const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
  const clampAnchor = (left: number, bottom: number): { left: number; bottom: number } => {
    if (typeof window === 'undefined') {
      return { left, bottom };
    }

    const maxLeft = Math.max(0, window.innerWidth - 84);
    const maxBottom = Math.max(0, window.innerHeight - 84);

    return {
      left: clamp(left, 0, maxLeft),
      bottom: clamp(bottom, 0, maxBottom),
    };
  };

  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectPending, setRedirectPending] = useState(false);
  const [toggleIconError, setToggleIconError] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; bottom: number }>({ left: 8, bottom: 0 });
  const [panelRect, setPanelRect] = useState<{ top: number; left: number; width: number; height: number }>({
    top: 84,
    left: 14,
    width: 430,
    height: 580,
  });
  const [pendingRedirect, setPendingRedirect] = useState<{
    option: AssistantOption;
    traceId?: string;
    mergedParams: Record<string, unknown>;
  } | null>(null);
  const [selectedPresentationByMessage, setSelectedPresentationByMessage] = useState<Record<string, number>>({});
  const closeTimerRef = useRef<number | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const layoutRafRef = useRef<number | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startBottom: number;
    moved: boolean;
  } | null>(null);
  const suppressToggleRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId('assistant'),
      role: 'assistant',
      content:
        'Hola, puedo ayudarte a encontrar medicamentos, comparar precios, ver historial y abrir el mapa de farmacias.',
      policy: 'allowed',
    },
  ]);

  const sessionId = useMemo(() => makeId('session'), []);

  useEffect(() => {
    return () => {
      if (layoutRafRef.current !== null) {
        window.cancelAnimationFrame(layoutRafRef.current);
      }
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
      }
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePanelLayout = () => {
      const toggleEl = toggleButtonRef.current;
      if (!toggleEl) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const safeMargin = 12;
      const gap = -8;
      const minComfortableHeight = 260;

      const toggleRect = toggleEl.getBoundingClientRect();
      const panelWidth = Math.min(430, Math.floor(viewportWidth * 0.94));
      const maxLeft = Math.max(safeMargin, viewportWidth - panelWidth - safeMargin);
      const left = clamp(Math.round(toggleRect.left), safeMargin, maxLeft);

      const availableAbove = Math.max(180, Math.floor(toggleRect.top - safeMargin - gap));
      const availableBelow = Math.max(180, Math.floor(viewportHeight - toggleRect.bottom - safeMargin - gap));
      const placeAbove = availableAbove >= minComfortableHeight || availableAbove >= availableBelow;
      const height = Math.max(180, Math.min(580, placeAbove ? availableAbove : availableBelow));
      const top = placeAbove
        ? Math.max(safeMargin, Math.round(toggleRect.top - gap - height))
        : Math.min(viewportHeight - safeMargin - height, Math.round(toggleRect.bottom + gap));

      setPanelRect({ top, left, width: panelWidth, height });
    };

    layoutRafRef.current = window.requestAnimationFrame(updatePanelLayout);

    const onResize = () => {
      if (layoutRafRef.current !== null) {
        window.cancelAnimationFrame(layoutRafRef.current);
      }
      layoutRafRef.current = window.requestAnimationFrame(updatePanelLayout);
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (layoutRafRef.current !== null) {
        window.cancelAnimationFrame(layoutRafRef.current);
        layoutRafRef.current = null;
      }
    };
  }, [anchor.bottom, anchor.left, open]);

  useEffect(() => {
    const onResize = () => {
      setAnchor((prev) => clampAnchor(prev.left, prev.bottom));
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!pendingRedirect) return;

    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    redirectTimerRef.current = window.setTimeout(() => {
      try {
        onAction({
          success: true,
          policy: 'allowed',
          message: `Accion confirmada: ${pendingRedirect.option.label}`,
          action: pendingRedirect.option.action,
          params: pendingRedirect.mergedParams,
          traceId: pendingRedirect.traceId || 'assistant-option-confirmed',
        });
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId('assistant'),
            role: 'assistant',
            content: 'No pude completar la redireccion. Intenta de nuevo con el boton.',
            policy: 'blocked',
          },
        ]);
      } finally {
        setRedirectPending(false);
        setPendingRedirect(null);
        redirectTimerRef.current = null;
      }
    }, 5000);

    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [onAction, pendingRedirect]);

  const openChat = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setOpen(true);
  };

  const closeChat = () => {
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 220);
  };

  const handleTogglePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: anchor.left,
      startBottom: anchor.bottom,
      moved: false,
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (!drag.moved && Math.hypot(dx, dy) > 6) {
        drag.moved = true;
      }

      if (!drag.moved) return;

      const next = clampAnchor(drag.startLeft + dx, drag.startBottom - dy);
      setAnchor(next);
    };

    const stopDragging = (event?: PointerEvent) => {
      if (!dragCleanupRef.current) return;

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      dragCleanupRef.current = null;

      const drag = dragRef.current;
      if (drag && (!event || drag.pointerId === event.pointerId) && drag.moved) {
        suppressToggleRef.current = true;
        window.setTimeout(() => {
          suppressToggleRef.current = false;
        }, 0);
      }

      dragRef.current = null;
    };

    const onPointerUp = (event: PointerEvent) => {
      stopDragging(event);
    };

    const onPointerCancel = (event: PointerEvent) => {
      stopDragging(event);
    };

    if (dragCleanupRef.current) {
      dragCleanupRef.current();
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  };

  const handleToggleClick = () => {
    if (suppressToggleRef.current) return;

    if (open) {
      closeChat();
      return;
    }

    openChat();
  };

  const handleOptionClick = (
    option: AssistantOption,
    traceId?: string,
    forcedParams?: Record<string, unknown>,
    source: 'user' | 'auto' = 'user',
  ) => {
    if (option.action === 'none' || redirectPending) return;

    const mergedParams = {
      ...(option.params || {}),
      ...(forcedParams || {}),
    };

    const isMedicationScoped = Boolean(mergedParams.medicamento || mergedParams.medicamentoId);
    const delayedActions: Array<AssistantResponsePayload['action']> = [
      'go_home',
      'go_search',
      'go_compare',
      'go_dashboard',
      'go_category',
      'go_cart',
      'go_developers',
      'go_about',
      'go_faq',
    ];
    const shouldDelay = delayedActions.includes(option.action) || (option.action === 'go_map' && !isMedicationScoped);

    if (shouldDelay) {
      setRedirectPending(true);
      if (source === 'user') {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId('user'),
            role: 'user',
            content: `Elegi: ${option.label}`,
          },
          {
            id: makeId('assistant'),
            role: 'assistant',
            content: 'Sera redirigido en 5 segundos...',
            policy: 'allowed',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId('assistant'),
            role: 'assistant',
            content: 'Sera redirigido en 5 segundos...',
            policy: 'allowed',
          },
        ]);
      }
      setPendingRedirect({ option, traceId, mergedParams });

      return;
    }

    if (source === 'user') {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId('user'),
          role: 'user',
          content: `Elegi: ${option.label}`,
        },
        {
          id: makeId('assistant'),
          role: 'assistant',
          content: `Perfecto. Te estoy redirigiendo a: ${option.label}.`,
          policy: 'allowed',
        },
      ]);
    }

    onAction({
      success: true,
      policy: 'allowed',
      message: `Accion confirmada: ${option.label}`,
      action: option.action,
      params: mergedParams,
      traceId: traceId || 'assistant-option-confirmed',
    });
  };

  const handleTopPharmacyClick = (
    message: ChatMessage,
    medicine: AssistantPresentationPanel['medicine'],
    price: AssistantPriceItem,
    rank: number,
  ) => {
    if (!medicine) return;

    setMessages((prev) => [
      ...prev,
      {
        id: makeId('user'),
        role: 'user',
        content: `Quiero la opcion #${rank}: ${price.farmaciaNombre}`,
      },
      {
        id: makeId('assistant'),
        role: 'assistant',
        content: `Perfecto. Cargando ${medicine.name} con ${price.farmaciaNombre}.`,
        policy: 'allowed',
      },
    ]);

    onAction({
      success: true,
      policy: 'allowed',
      message: `Farmacia seleccionada: ${price.farmaciaNombre}`,
      action: 'go_product',
      params: {
        medicamento: medicine,
        farmaciaId: price.farmaciaId,
        farmaciaNombre: price.farmaciaNombre,
      },
      data: {
        primaryMedicine: medicine,
      },
      traceId: message.traceId || `assistant-top-pharmacy-${price.farmaciaId}`,
    });
  };

  const handleMedicineOptionClick = (message: ChatMessage, medicineIndex: number) => {
    const medicine = message.preview?.matches?.[medicineIndex];
    if (!medicine) return;

    setMessages((prev) => [
      ...prev,
      {
        id: makeId('user'),
        role: 'user',
        content: `Quiero ver: ${medicine.name}`,
      },
      {
        id: makeId('assistant'),
        role: 'assistant',
        content: `Perfecto. Abriendo la ficha de ${medicine.name}.`,
        policy: 'allowed',
      },
    ]);

    onAction({
      success: true,
      policy: 'allowed',
      message: `Medicamento seleccionado: ${medicine.name}`,
      action: 'go_product',
      params: {
        medicamento: medicine,
      },
      data: {
        primaryMedicine: medicine,
      },
      traceId: message.traceId || `assistant-match-${medicine.id || medicine._id}`,
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);

    const userMessage: ChatMessage = {
      id: makeId('user'),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);

    const response = await sendAssistantMessage({
      sessionId,
      message: text,
      context,
    });

    const guidedOptions = response.policy === 'allowed' ? toGuidedOptions(response) : [];

    const assistantMessage: ChatMessage = {
      id: makeId('assistant'),
      role: 'assistant',
      content: response.message,
      policy: response.policy,
      options: guidedOptions,
      traceId: response.traceId,
      preview: response.policy === 'allowed' ? parsePreview(response) : undefined,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    if (response.policy === 'allowed' && response.action !== 'none') {
      const autoOption = (Array.isArray(response.options) ? response.options : []).find(
        (item) => item.action === response.action
      ) || {
        id: `auto-${response.action}`,
        label: actionLabel(response.action),
        action: response.action,
        params: response.params,
      };

      handleOptionClick(autoOption, response.traceId, response.params, 'auto');
    }

    setLoading(false);
  };

  return (
    <div
      className={`assistant-chat-root ${open ? 'assistant-chat-root--open' : ''}`}
      aria-live="polite"
      style={{ left: `${anchor.left}px`, bottom: `${anchor.bottom}px`, right: 'auto' }}
    >
      {open && (
        <section
          className={`assistant-chat-panel ${isClosing ? 'assistant-chat-panel--closing' : ''}`}
          aria-label="Asistente IA"
          style={{
            top: `${panelRect.top}px`,
            left: `${panelRect.left}px`,
            width: `${panelRect.width}px`,
            height: `${panelRect.height}px`,
            maxHeight: `${panelRect.height}px`,
          }}
        >
          <header className="assistant-chat-header">
            <div>
              <strong>Asistente IA</strong>
              <p>Busqueda guiada de medicamentos</p>
            </div>
            <button type="button" onClick={closeChat} aria-label="Cerrar chat">
              x
            </button>
          </header>

          <div className="assistant-chat-messages">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`assistant-bubble assistant-bubble--${msg.role} ${
                  msg.policy === 'blocked' ? 'assistant-bubble--blocked' : ''
                }`}
              >
                {!(msg.role === 'assistant' && (msg.preview?.primaryMedicine || (msg.preview?.presentationPanels || []).length > 0)) && msg.content}

                {msg.role === 'assistant' && Array.isArray(msg.preview?.presentationPanels) && msg.preview!.presentationPanels.length > 0 && (() => {
                  const panels = msg.preview!.presentationPanels;
                  const selectedIndex = Number.isFinite(selectedPresentationByMessage[msg.id])
                    ? selectedPresentationByMessage[msg.id]
                    : -1;
                  const selectedPanel = selectedIndex >= 0 ? panels[selectedIndex] : null;

                  return (
                    <section className="assistant-presentation-stack" aria-label="Paneles por presentacion">
                      <div className="assistant-presentation-selector">
                        <p className="assistant-table-title">Selecciona una presentacion</p>
                        <div className="assistant-presentation-buttons" role="group" aria-label="Botones de presentaciones">
                          {panels.map((panel, panelIndex) => (
                            <button
                              key={`${msg.id}-select-${panel.medicine.id || panel.medicine._id}-${panelIndex}`}
                              type="button"
                              className={`assistant-presentation-btn ${selectedIndex === panelIndex ? 'assistant-presentation-btn--active' : ''}`}
                              onClick={() =>
                                setSelectedPresentationByMessage((prev) => ({
                                  ...prev,
                                  [msg.id]: prev[msg.id] === panelIndex ? -1 : panelIndex,
                                }))
                              }
                              disabled={loading || redirectPending}
                            >
                              <img
                                src={toImageSrc(panel.medicine.id)}
                                alt={panel.medicine.name}
                                className="assistant-presentation-thumb"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.src = '/medicamentos/placeholder.svg';
                                }}
                              />
                              <span className="assistant-presentation-text">
                                <strong>{panel.medicine.name}</strong>
                                <small>{panel.medicine.lab}</small>
                              </span>
                              {extractDoseLabel(panel.medicine.name) && (
                                <span className="assistant-dose-badge">{extractDoseLabel(panel.medicine.name)}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedPanel && (
                        <section
                          key={`${msg.id}-panel-${selectedPanel.medicine.id || selectedPanel.medicine._id}-${selectedIndex}`}
                          className="assistant-preview-card assistant-preview-card--presentation"
                        >
                          <div className="assistant-preview-top">
                            <img
                              src={toImageSrc(selectedPanel.medicine.id)}
                              alt={selectedPanel.medicine.name}
                              className="assistant-med-image"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.src = '/medicamentos/placeholder.svg';
                              }}
                            />
                            <div className="assistant-preview-headings">
                              <p className="assistant-preview-kicker">Presentacion #{selectedIndex + 1}</p>
                              <h4>{selectedPanel.medicine.name}</h4>
                              <p>{selectedPanel.medicine.lab}</p>
                            </div>
                          </div>

                          {selectedPanel.medicine.description && (
                            <p className="assistant-preview-description">{selectedPanel.medicine.description}</p>
                          )}

                          <div className="assistant-metrics-grid">
                            <article>
                              <span>Mejor precio</span>
                              <strong>
                                {selectedPanel.priceInsights?.bestPrice?.precio
                                  ? formatCop(Number(selectedPanel.priceInsights.bestPrice.precio))
                                  : 'N/D'}
                              </strong>
                              <small>{selectedPanel.priceInsights?.bestPrice?.farmaciaNombre || 'Sin farmacia'}</small>
                            </article>
                            <article>
                              <span>Ahorro estimado</span>
                              <strong>
                                {Number.isFinite(Number(selectedPanel.priceInsights?.savings || 0))
                                  ? formatCop(Number(selectedPanel.priceInsights?.savings || 0))
                                  : 'N/D'}
                              </strong>
                              <small>vs precio mas alto</small>
                            </article>
                          </div>

                          {Array.isArray(selectedPanel.topPharmacies) && selectedPanel.topPharmacies.length > 0 && (
                            <div className="assistant-price-table-wrap">
                              <p className="assistant-table-title">Top farmacia</p>
                              <ul className="assistant-price-list">
                                {selectedPanel.topPharmacies.slice(0, 3).map((price, index) => (
                                  <li key={`${msg.id}-panel-${selectedIndex}-price-${price.precioId}-${index}`}>
                                    <span className="assistant-rank">#{index + 1}</span>
                                    <button
                                      type="button"
                                      className="assistant-pharmacy-select"
                                      onClick={() => handleTopPharmacyClick(msg, selectedPanel.medicine, price, index + 1)}
                                      disabled={loading || redirectPending}
                                    >
                                      <div className="assistant-pharmacy-info">
                                        <strong>{price.farmaciaNombre}</strong>
                                        <small>{price.farmaciaDireccion || 'Direccion no disponible'}</small>
                                      </div>
                                    </button>
                                    <strong className="assistant-price-value">{formatCop(Number(price.precio))}</strong>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {Array.isArray(selectedPanel.options) && selectedPanel.options.length > 0 && (
                            <div className="assistant-options" role="group" aria-label="Acciones por presentacion">
                              {selectedPanel.options.map((option) => (
                                <button
                                  key={`${msg.id}-${selectedIndex}-${option.id}`}
                                  type="button"
                                  className="assistant-option-btn"
                                  onClick={() =>
                                    handleOptionClick(option, msg.traceId, {
                                      medicamento: selectedPanel.medicine,
                                      medicamentoId: selectedPanel.medicine.id,
                                    })
                                  }
                                  disabled={loading || redirectPending}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </section>
                      )}
                    </section>
                  );
                })()}

                {msg.role === 'assistant' && msg.preview?.primaryMedicine && (!msg.preview?.presentationPanels || msg.preview.presentationPanels.length === 0) && (
                  <section className="assistant-preview-card" aria-label="Resumen de medicamento">
                    <div className="assistant-preview-top">
                      <img
                        src={toImageSrc(msg.preview.primaryMedicine.id)}
                        alt={msg.preview.primaryMedicine.name}
                        className="assistant-med-image"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.src = '/medicamentos/placeholder.svg';
                        }}
                      />
                      <div className="assistant-preview-headings">
                        <p className="assistant-preview-kicker">
                          {msg.preview.intent ? `Intencion: ${msg.preview.intent}` : 'Resultado recomendado'}
                        </p>
                        <h4>{msg.preview.primaryMedicine.name}</h4>
                        <p>{msg.preview.primaryMedicine.lab}</p>
                      </div>
                    </div>

                    {msg.preview.query && (
                      <p className="assistant-preview-query">Busqueda: {msg.preview.query}</p>
                    )}

                    {msg.preview.primaryMedicine.description && (
                      <p className="assistant-preview-description">{msg.preview.primaryMedicine.description}</p>
                    )}

                    {Array.isArray(msg.preview.matches) && msg.preview.matches.length > 1 && (
                      <div className="assistant-matches-wrap">
                        <p className="assistant-table-title">Presentaciones encontradas</p>
                        <div className="assistant-matches-list">
                          {msg.preview.matches.slice(0, 5).map((medicine, index) => (
                            <button
                              key={`${msg.id}-match-${medicine.id || medicine._id}-${index}`}
                              type="button"
                              className="assistant-match-btn"
                              onClick={() => handleMedicineOptionClick(msg, index)}
                              disabled={loading || redirectPending}
                            >
                              <strong>{medicine.name}</strong>
                              <span>{medicine.lab}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {msg.role === 'assistant' && msg.options && msg.options.length > 0 && (!msg.preview?.presentationPanels || msg.preview.presentationPanels.length === 0) && (
                  <div className="assistant-options" role="group" aria-label="Acciones sugeridas por el asistente">
                    {msg.options.map((option) => (
                      <button
                        key={`${msg.id}-${option.id}`}
                        type="button"
                        className="assistant-option-btn"
                        onClick={() => handleOptionClick(option, msg.traceId)}
                        disabled={loading || redirectPending}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {loading && (
              <article className="assistant-bubble assistant-bubble--assistant">
                <div className="assistant-thinking">
                  <span>Pensando</span>
                  <span className="assistant-thinking-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </article>
            )}
          </div>

          <footer className="assistant-chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Ej: Quiero ver acetaminofen de 500mg"
              disabled={loading || redirectPending}
            />
            <button type="button" onClick={handleSend} disabled={loading || redirectPending}>
              Enviar
            </button>
          </footer>
        </section>
      )}

      <button
        ref={toggleButtonRef}
        type="button"
        className="assistant-chat-toggle"
        onPointerDown={handleTogglePointerDown}
        onClick={handleToggleClick}
        aria-label="Abrir asistente"
      >
        {!toggleIconError ? (
          <img
            src={ASSISTANT_ICON_SRC}
            alt="Asistente IA"
            className="assistant-chat-toggle-icon"
            draggable={false}
            onError={() => setToggleIconError(true)}
          />
        ) : (
          <span className="assistant-chat-toggle-fallback">IA</span>
        )}
      </button>
    </div>
  );
}
