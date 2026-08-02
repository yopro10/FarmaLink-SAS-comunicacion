import { useState, FormEvent } from 'react';
import './ValidadorView.css';

type ValType = 'html' | 'css';

interface ValError {
  line: number;
  message: string;
}

export function ValidadorView({ onGoBack }: { onGoBack: () => void }) {
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [htmlErrors, setHtmlErrors] = useState<ValError[] | null>(null);
  const [cssErrors, setCssErrors] = useState<ValError[] | null>(null);

  // === VALIDADOR HTML BÁSICO ===
  const validateHTML = (e: FormEvent) => {
    e.preventDefault();
    if (!htmlCode.trim()) {
      setHtmlErrors([{ line: 1, message: 'El código HTML está vacío.' }]);
      return;
    }

    const errors: ValError[] = [];
    const lines = htmlCode.split('\n');
    let hasHtmlTag = false;
    let hasLangAttr = false;
    let h1Count = 0;
    const idSet = new Set<string>();

    const openTagsStack: { tag: string, line: number }[] = [];
    
    // Autoclose tags
    const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

    lines.forEach((lineStr, idx) => {
      const lineNum = idx + 1;
      const content = lineStr.trim();
      if (!content) return;

      // 1. Validar <html> lang
      if (content.includes('<html')) {
        hasHtmlTag = true;
        if (content.includes('lang=')) hasLangAttr = true;
      }

      // 2. Contar <h1>
      if (content.includes('<h1') && !content.includes('</h1>')) h1Count++;
      else if (content.match(/<h1[^>]*>.*<\/h1>/)) h1Count++;

      // 3. Validar IDs duplicados
      const idMatch = content.match(/id=["']([^"']+)["']/g);
      if (idMatch) {
        idMatch.forEach(match => {
          const id = match.replace(/id=["']|["']/g, '');
          if (idSet.has(id)) {
            errors.push({ line: lineNum, message: `ID duplicado: "${id}"` });
          } else {
            idSet.add(id);
          }
        });
      }

      // 4. Validar alt en imágenes
      if (content.includes('<img ') && !content.includes('alt=')) {
        errors.push({ line: lineNum, message: 'La etiqueta <img> no tiene atributo "alt" (accesibilidad).' });
      }

      // 5. Validar etiquetas de apertura/cierre simples (muy básico)
      // Extraer todas las etiquetas en la línea
      const tags = content.match(/<\/?([a-zA-Z0-9]+)[^>]*>/g) || [];
      
      for (const tagStr of tags) {
        const isClosing = tagStr.startsWith('</');
        const tagNameMatch = tagStr.match(/<\/?([a-zA-Z0-9]+)/);
        if (!tagNameMatch) continue;
        
        const tagName = tagNameMatch[1].toLowerCase();
        
        if (voidElements.has(tagName)) continue;

        if (!isClosing) {
          openTagsStack.push({ tag: tagName, line: lineNum });
        } else {
          if (openTagsStack.length === 0) {
            errors.push({ line: lineNum, message: `Etiqueta de cierre </${tagName}> sin etiqueta de apertura previa.` });
          } else {
            const lastOpen = openTagsStack.pop()!;
            if (lastOpen.tag !== tagName) {
              errors.push({ line: lineNum, message: `Etiqueta de cierre </${tagName}> no coincide con la última apertura <${lastOpen.tag}> (línea ${lastOpen.line}).` });
            }
          }
        }
      }
    });

    if (hasHtmlTag && !hasLangAttr) {
      errors.push({ line: 1, message: 'La etiqueta <html> debe tener el atributo "lang" (ej: lang="es").' });
    }

    if (h1Count > 1) {
      errors.push({ line: 1, message: 'Se detectaron múltiples etiquetas <h1>. Por SEO, solo debería haber una.' });
    } else if (h1Count === 0 && htmlCode.includes('<body')) {
      errors.push({ line: 1, message: 'No se detectó ninguna etiqueta <h1>. Por SEO, debería haber al menos una.' });
    }

    // Verificar etiquetas sin cerrar
    if (openTagsStack.length > 0) {
      openTagsStack.forEach(t => {
        errors.push({ line: t.line, message: `La etiqueta <${t.tag}> no fue cerrada.` });
      });
    }

    setHtmlErrors(errors);
  };

  // === VALIDADOR CSS BÁSICO ===
  const validateCSS = (e: FormEvent) => {
    e.preventDefault();
    if (!cssCode.trim()) {
      setCssErrors([{ line: 1, message: 'El código CSS está vacío.' }]);
      return;
    }

    const errors: ValError[] = [];
    const lines = cssCode.split('\n');
    let openBrackets = 0;
    
    // Lista muy básica de propiedades válidas
    const validProps = new Set([
      'color', 'background', 'background-color', 'font-size', 'font-weight', 'font-family',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'border', 'border-radius', 'display', 'flex', 'flex-direction', 'justify-content', 'align-items',
      'width', 'height', 'max-width', 'min-height', 'position', 'top', 'left', 'right', 'bottom',
      'z-index', 'opacity', 'transition', 'transform', 'box-shadow', 'cursor', 'text-align'
    ]);

    lines.forEach((lineStr, idx) => {
      const lineNum = idx + 1;
      let content = lineStr.trim();
      
      // Ignorar comentarios simples por ahora
      if (content.startsWith('/*') || content.endsWith('*/') || !content) return;

      // 1. Validar llaves
      if (content.includes('{')) openBrackets++;
      if (content.includes('}')) {
        openBrackets--;
        if (openBrackets < 0) {
          errors.push({ line: lineNum, message: 'Llave de cierre "}" sin llave de apertura previa.' });
          openBrackets = 0;
        }
      }

      // 2. Selectores vacíos ({} en la misma línea)
      if (content.match(/\{\s*\}/)) {
        errors.push({ line: lineNum, message: 'Selector vacío. Contiene "{}" sin propiedades.' });
      }

      // 3. Validar propiedades dentro de un bloque
      if (openBrackets > 0 && !content.includes('{') && content.length > 2) {
        if (!content.includes(':') && !content.includes('}')) {
          errors.push({ line: lineNum, message: 'Propiedad inválida. Falta el símbolo ":" (ej: color: red;).' });
        } else if (content.includes(':')) {
          const parts = content.split(':');
          const propName = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          
          if (!val) {
            errors.push({ line: lineNum, message: `La propiedad "${propName}" no tiene un valor asignado.` });
          } else if (!val.endsWith(';') && !content.includes('}')) {
            // Ignorar variables CSS custom (--var)
            if (!propName.startsWith('--')) {
              errors.push({ line: lineNum, message: `Falta el punto y coma ";" al final de la línea.` });
            }
          }

          if (propName && !propName.startsWith('--') && !validProps.has(propName) && !propName.startsWith('-webkit-') && !propName.startsWith('-moz-')) {
            // Es solo una advertencia, pero la mostraremos como error para el ejercicio
            errors.push({ line: lineNum, message: `Propiedad desconocida o no estándar: "${propName}".` });
          }
        }
      }
    });

    if (openBrackets > 0) {
      errors.push({ line: lines.length, message: 'Falta cerrar una o más llaves "}".' });
    }

    setCssErrors(errors);
  };

  const clearHTML = () => { setHtmlCode(''); setHtmlErrors(null); };
  const clearCSS = () => { setCssCode(''); setCssErrors(null); };

  return (
    <div className="val-container">
      <div className="val-header">
        <div className="container">
          <span className="val-header-badge">Herramientas</span>
          <h1 className="val-header-title">Validador de Código</h1>
          <p className="val-header-subtitle">
            Verifica la estructura de tu HTML y la sintaxis de tu CSS para asegurar las mejores prácticas del equipo.
          </p>
          <button className="val-header-back" onClick={onGoBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Volver al Equipo
          </button>
        </div>
      </div>

      <div className="container">
        <div className="val-grid">
          
          {/* =======================
              PANEL HTML
              ======================= */}
          <div className="val-panel">
            <div className="val-panel-header">
              <div className="val-panel-icon val-panel-icon--html">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </div>
              <div>
                <h2 className="val-panel-title">Validador HTML</h2>
                <p className="val-panel-desc">Pega tu código HTML para buscar errores de estructura.</p>
              </div>
            </div>
            
            <form className="val-body" onSubmit={validateHTML}>
              <textarea 
                className="val-textarea"
                placeholder="<html>&#10;  <body>&#10;    <h1>Hola Mundo</h1>&#10;  </body>&#10;</html>"
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                spellCheck="false"
              />
              <div className="val-controls">
                <button type="submit" className="val-btn-validate val-btn-validate--html">
                  Validar HTML
                </button>
                <button type="button" className="val-btn-clear" onClick={clearHTML}>
                  Limpiar
                </button>
              </div>

              {/* Resultados HTML */}
              {htmlErrors !== null && (
                <div className="val-results">
                  <div className="val-results-header">
                    <h3 className="val-results-title">Resultados de Validación</h3>
                    {htmlErrors.length === 0 ? (
                      <span className="val-badge-ok">0 Errores</span>
                    ) : (
                      <span className="val-badge-errors">{htmlErrors.length} Errores</span>
                    )}
                  </div>
                  
                  {htmlErrors.length === 0 ? (
                    <div className="val-result-ok">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      ¡El código HTML parece válido!
                    </div>
                  ) : (
                    <ul className="val-results-list">
                      {htmlErrors.map((err, i) => (
                        <li key={i} className="val-result-item">
                          <span className="val-result-icon">❌</span>
                          <div className="val-result-content">
                            <div className="val-result-msg">{err.message}</div>
                            <div className="val-result-line">Línea {err.line}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* =======================
              PANEL CSS
              ======================= */}
          <div className="val-panel">
            <div className="val-panel-header">
              <div className="val-panel-icon val-panel-icon--css">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 8v4"></path>
                  <path d="M12 16h.01"></path>
                </svg>
              </div>
              <div>
                <h2 className="val-panel-title">Validador CSS</h2>
                <p className="val-panel-desc">Pega tu hoja de estilos para verificar su sintaxis.</p>
              </div>
            </div>
            
            <form className="val-body" onSubmit={validateCSS}>
              <textarea 
                className="val-textarea"
                placeholder=".mi-clase {&#10;  color: #333;&#10;  margin-top: 20px;&#10;}"
                value={cssCode}
                onChange={(e) => setCssCode(e.target.value)}
                spellCheck="false"
              />
              <div className="val-controls">
                <button type="submit" className="val-btn-validate val-btn-validate--css">
                  Validar CSS
                </button>
                <button type="button" className="val-btn-clear" onClick={clearCSS}>
                  Limpiar
                </button>
              </div>

              {/* Resultados CSS */}
              {cssErrors !== null && (
                <div className="val-results">
                  <div className="val-results-header">
                    <h3 className="val-results-title">Resultados de Validación</h3>
                    {cssErrors.length === 0 ? (
                      <span className="val-badge-ok">0 Errores</span>
                    ) : (
                      <span className="val-badge-errors">{cssErrors.length} Errores</span>
                    )}
                  </div>
                  
                  {cssErrors.length === 0 ? (
                    <div className="val-result-ok">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      ¡La hoja de estilos parece válida!
                    </div>
                  ) : (
                    <ul className="val-results-list">
                      {cssErrors.map((err, i) => (
                        <li key={i} className="val-result-item">
                          <span className="val-result-icon">❌</span>
                          <div className="val-result-content">
                            <div className="val-result-msg">{err.message}</div>
                            <div className="val-result-line">Línea {err.line}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ── Reglas comprobadas ── */}
        <section className="val-rules">
          <h2>Reglas que verificamos</h2>
          <div className="val-rules-grid">
            <div className="val-rules-col">
              <h3>
                <span className="val-rule-icon">📄</span> HTML
              </h3>
              <ul>
                <li>Etiquetas abiertas y cerradas correctamente</li>
                <li>Presencia del atributo <code>lang</code> en el HTML</li>
                <li>Evitar IDs duplicados en el mismo documento</li>
                <li>Uso correcto de la etiqueta <code>&lt;h1&gt;</code> (solo una)</li>
                <li>Atributo <code>alt</code> obligatorio en imágenes</li>
              </ul>
            </div>
            <div className="val-rules-col">
              <h3>
                <span className="val-rule-icon">🎨</span> CSS
              </h3>
              <ul>
                <li>Apertura y cierre correcto de llaves <code>&#123; &#125;</code></li>
                <li>Punto y coma al final de cada declaración <code>;</code></li>
                <li>Evitar selectores vacíos</li>
                <li>Uso correcto de los dos puntos <code>:</code></li>
                <li>Detección de propiedades desconocidas o mal escritas</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
