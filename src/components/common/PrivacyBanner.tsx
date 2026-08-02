import React, { useState, useEffect } from 'react';

// @ts-ignore: Vite CSS side-effect import declaration
import './PrivacyBanner.css';

const PRIVACY_KEY = 'privacyAccepted';
const PRIVACY_SETTINGS_KEY = 'privacySettings';
const PRIVACY_VERSION = '1.0';
const MODAL_CLOSE_MS = 140;
const BANNER_CLOSE_MS = 140;

type PrivacySettings = {
  version: string;
  acceptedAt: string;
  necessary: true;
  analytics: boolean;
  personalization: boolean;
};

const PrivacyBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [bannerClosing, setBannerClosing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [configClosing, setConfigClosing] = useState(false);
  const [policyClosing, setPolicyClosing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [personalization, setPersonalization] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(PRIVACY_KEY) === 'true';
    const savedSettings = localStorage.getItem(PRIVACY_SETTINGS_KEY);

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as PrivacySettings;
        if (parsed.version === PRIVACY_VERSION) {
          setAnalytics(Boolean(parsed.analytics));
          setPersonalization(Boolean(parsed.personalization));
        } else {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    }

    if (!accepted) {
      setVisible(true);
    }
  }, []);

  const persistSettings = (next: Pick<PrivacySettings, 'analytics' | 'personalization'>) => {
    const payload: PrivacySettings = {
      version: PRIVACY_VERSION,
      acceptedAt: new Date().toISOString(),
      necessary: true,
      analytics: next.analytics,
      personalization: next.personalization,
    };

    localStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(payload));
    localStorage.setItem(PRIVACY_KEY, 'true');
  };

  const closeBanner = () => {
    setBannerClosing(true);
    window.setTimeout(() => {
      setVisible(false);
      setBannerClosing(false);
    }, BANNER_CLOSE_MS);
  };

  const handleAcceptAll = () => {
    setAnalytics(true);
    setPersonalization(true);
    persistSettings({ analytics: true, personalization: true });
    closeBanner();
  };

  const handleSavePreferences = () => {
    persistSettings({ analytics, personalization });
    setConfigClosing(true);
    window.setTimeout(() => {
      setShowConfig(false);
      setConfigClosing(false);
      closeBanner();
    }, MODAL_CLOSE_MS);
  };

  const openConfig = () => {
    setConfigClosing(false);
    setShowConfig(true);
  };

  const closeConfig = () => {
    setConfigClosing(true);
    window.setTimeout(() => {
      setShowConfig(false);
      setConfigClosing(false);
    }, MODAL_CLOSE_MS);
  };

  const openPolicy = () => {
    setPolicyClosing(false);
    setShowPolicy(true);
  };

  const closePolicy = () => {
    setPolicyClosing(true);
    window.setTimeout(() => {
      setShowPolicy(false);
      setPolicyClosing(false);
    }, MODAL_CLOSE_MS);
  };

  if (!visible) return null;

  return (
    <>
      <div className={`privacy-banner${bannerClosing ? ' is-closing' : ''}`} role="region" aria-label="Aviso de manejo de datos personales">
        <p className="privacy-banner__text">
          Tratamos tus datos personales para autenticar tu cuenta, procesar pedidos y mejorar la
          busqueda de medicamentos. Puedes aceptar todo o configurar tus preferencias.
        </p>

        <div className="privacy-banner__actions">
          <button className="privacy-banner__button privacy-banner__button--ghost" onClick={openPolicy}>
            Ver politica
          </button>
          <button className="privacy-banner__button privacy-banner__button--secondary" onClick={openConfig}>
            Configurar
          </button>
          <button className="privacy-banner__button" onClick={handleAcceptAll}>
            Aceptar
          </button>
        </div>
      </div>

      {showConfig && (
        <div className={`privacy-modal-backdrop${configClosing ? ' is-closing' : ''}`} onClick={closeConfig}>
          <div className={`privacy-modal${configClosing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label="Configurar tratamiento de datos" onClick={(e) => e.stopPropagation()}>
            <button className="privacy-modal__close" aria-label="Cerrar" onClick={closeConfig} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6L18 18M18 6L6 18" />
              </svg>
            </button>
            <h3>Preferencias de privacidad</h3>
            <p className="privacy-modal__intro">
              Puedes elegir que usos de datos opcionales autorizas. Los datos necesarios siempre se usan para el funcionamiento basico.
            </p>

            <div className="privacy-option privacy-option--fixed">
              <div>
                <strong>Datos necesarios</strong>
                <p>Autenticacion, seguridad, carrito y pedidos.</p>
              </div>
              <span className="privacy-option__badge">Siempre activo</span>
            </div>

            <label className="privacy-option">
              <div>
                <strong>Analitica</strong>
                <p>Medicion anonima para mejorar rendimiento y experiencia.</p>
              </div>
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            </label>

            <label className="privacy-option">
              <div>
                <strong>Personalizacion</strong>
                <p>Recomendaciones segun historial de uso y busquedas.</p>
              </div>
              <input type="checkbox" checked={personalization} onChange={(e) => setPersonalization(e.target.checked)} />
            </label>

            <div className="privacy-modal__actions">
              <button className="privacy-banner__button privacy-banner__button--ghost" onClick={closeConfig}>
                Cancelar
              </button>
              <button className="privacy-banner__button privacy-banner__button--secondary" onClick={handleSavePreferences}>
                Guardar preferencias
              </button>
            </div>
          </div>
        </div>
      )}

      {showPolicy && (
        <div className={`privacy-modal-backdrop${policyClosing ? ' is-closing' : ''}`} onClick={closePolicy}>
          <div className={`privacy-modal privacy-modal--policy${policyClosing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label="Politica de manejo de datos" onClick={(e) => e.stopPropagation()}>
            <button className="privacy-modal__close" aria-label="Cerrar" onClick={closePolicy} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6L18 18M18 6L6 18" />
              </svg>
            </button>
            <h3>Politica de manejo de datos personales</h3>
            <ul className="privacy-policy-list">
              <li>Responsable: Farmalink SAS, contacto de privacidad por canales oficiales de soporte.</li>
              <li>Finalidades: registro, autenticacion, gestion de carrito, pedidos, soporte y mejora del servicio.</li>
              <li>Conservacion: los datos se guardan durante el tiempo necesario para prestar el servicio y cumplir obligaciones legales.</li>
              <li>Terceros: se comparte informacion solo con proveedores necesarios para operar la plataforma.</li>
              <li>Derechos: puedes solicitar acceso, actualizacion, correccion o eliminacion de tus datos.</li>
              <li>Version de politica: {PRIVACY_VERSION}</li>
            </ul>
            <div className="privacy-modal__actions">
              <button className="privacy-banner__button" onClick={closePolicy}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PrivacyBanner;
