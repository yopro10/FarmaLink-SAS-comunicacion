import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PharmacyMap.css';


// Usa el proxy de Vite (relativo) — sin Mixed Content
const GATEWAY = (import.meta as any).env?.VITE_API_URL || '';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom SVG Marker for User Location (Using Brand Blue/Dark with a House Icon)
const createUserIcon = () => {
  const svgTemplate = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
      <!-- Shadow -->
      <path fill="rgba(0,0,0,0.15)" d="M16 38c-8 0-12-4-12-6 0-3 12-6 12-6s12 3 12 6c0 2-4 6-12 6z"/>
      <!-- Main Pin -->
      <path fill="#0B7DB8" d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 24 16 24s16-13.333 16-24C32 7.163 24.837 0 16 0z"/>
      <!-- House Icon -->
      <path fill="#FFFFFF" d="M16 8 l-6 5 v6 h4 v-5 h4 v5 h4 v-6 z" />
    </svg>
  `;
  return L.divIcon({
    html: svgTemplate,
    className: 'custom-svg-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 36],
    popupAnchor: [0, -36]
  });
};

const userIcon = createUserIcon();

interface Pharmacy {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: string | number;
  longitude: string | number;
  distance?: number;
}

interface MapProps {
  onPharmacySelect?: (pharmacy: Pharmacy) => void;
  /** Si se provee, solo muestra las farmacias con esos IDs (para filtrar por producto) */
  filterPharmacyIds?: number[];
}

// Custom SVG Marker for Pharmacies
const createPharmacyIcon = (isActive: boolean, distance?: number) => {
  // Determine color based on distance and active state
  let fillColor = '#A0C689'; // Default inactive

  if (isActive) {
    fillColor = '#8B5CF6'; // Active (Distinct Purple)
  } else if (distance !== undefined) {
    // Distance-based colors using Brand Palette
    if (distance <= 2) {
      fillColor = '#66B82E'; // Very Close (<2km) -> Primary Green
    } else if (distance <= 6) {
      fillColor = '#F59E0B'; // Moderate (2 - 6km) -> Amber Warning
    } else {
      fillColor = '#e74c3c'; // Far (>6km) -> Red Error
    }
  }

  const scale = isActive ? 'scale(1.15)' : 'scale(1)';
  const zIndexOffset = isActive ? 1000 : 0;

  const svgTemplate = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40" style="transform: ${scale}; transform-origin: bottom center; transition: all 0.3s ease;">
      <!-- Shadow -->
      <path fill="rgba(0,0,0,0.15)" d="M16 38c-8 0-12-4-12-6 0-3 12-6 12-6s12 3 12 6c0 2-4 6-12 6z"/>
      <!-- Main Pint -->
      <path fill="${fillColor}" d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 24 16 24s16-13.333 16-24C32 7.163 24.837 0 16 0zm0 22c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"/>
      <path fill="#FFFFFF" d="M14 11h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z"/>
    </svg>
  `;
  return L.divIcon({
    html: svgTemplate,
    className: 'custom-svg-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 36], // Adjusted anchor to fit shadow
    popupAnchor: [0, -36]
  });
};

// Helper component to adjust map view bounds
const AdjustMapView = ({ activePharmacy, userLocation, routeCoords, routeLoading }: { activePharmacy: Pharmacy | null, userLocation: { lat: number, lng: number }, routeCoords: [number, number][] | null, routeLoading: boolean }) => {
  const map = useMap();
  useEffect(() => {
    // Solo ajustamos bounds si hay ruta y NO se está cargando (para evitar saltos intermedios)
    if (activePharmacy && routeCoords && routeCoords.length > 0 && !routeLoading) {
      const bounds = L.latLngBounds(routeCoords);
      map.flyToBounds(bounds, {
        paddingTopLeft: [50, 50],
        paddingBottomRight: [50, 140], // Un poco más de espacio abajo
        duration: 1.5
      });
    } else if (activePharmacy && !routeCoords && !routeLoading) {
      // Si no hay ruta ni se está cargando, centramos en la farmacia
      map.flyTo([Number(activePharmacy.latitude), Number(activePharmacy.longitude)], 17, { duration: 1.5 });
    }
  }, [activePharmacy, routeCoords, routeLoading, map]);
  return null;
};

// Formateador de duración (minutos o horas + minutos)
const formatDuration = (seconds: number) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs}h ${remainingMins}min` : `${hrs}h`;
};

// Cálculo de hora de llegada
const calculateArrival = (seconds: number) => {
  const arrival = new Date(Date.now() + seconds * 1000);
  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Componente para el botón de "Volver a mi ubicación" (Dinámico)
const RecenterButton = ({ userLocation }: { userLocation: { lat: number, lng: number } }) => {
  const [isVisible, setIsVisible] = useState(false);
  const map = useMap();

  // Detectar movimientos del mapa
  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const distance = map.distance(center, [userLocation.lat, userLocation.lng]);
      // Mostrar solo si el centro está a más de 100 metros de la ubicación del usuario
      setIsVisible(distance > 100);
    },
  });

  const handleRecenter = () => {
    map.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 1.5 });
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleRecenter}
          className="recenter-pill-btn fade-in"
          title="Volver a mi ubicación"
        >
          <span className="recenter-pin" aria-hidden="true">•</span>
          <span className="recenter-text">Volver a mi ubicación</span>
        </button>
      </div>
    </div>
  );
};

export const PharmacyMap: React.FC<MapProps> = ({ onPharmacySelect, filterPharmacyIds }) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePharmacy, setActivePharmacy] = useState<Pharmacy | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ duration: number; distance: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking' | 'bus' | null>(null);

  // Refs para la lista de farmacias para hacer scroll suave
  const listRef = React.useRef<HTMLUListElement>(null);
  // Refs para cada item de la lista
  const itemRefs = React.useRef<{ [key: number]: HTMLLIElement | null }>({});
  // Refs para los marcadores del mapa para abrir/cerrar popups programáticamente
  const markerRefs = React.useRef<{ [key: number]: L.Marker | null }>({});

  // Sincronizar popups cuando cambie la farmacia activa
  useEffect(() => {
    // Bloqueo total: NO abrir popups si hay ruta activa o se está cargando una
    // Esto previene que al cambiar de modo o farmacia con ruteo, se abran ventanas blancas
    if (routeCoords || routeLoading || !activePharmacy) return;

    const marker = markerRefs.current[activePharmacy.id];
    if (marker) {
      marker.openPopup();
    }
  }, [activePharmacy, routeCoords, routeLoading]);

  // Limpiar ruta automáticamente cuando no hay farmacia activa
  useEffect(() => {
    if (!activePharmacy) {
      setRouteCoords(null);
      setRouteInfo(null);
      setTransportMode(null);
    }
  }, [activePharmacy]);

  useEffect(() => {
    // Get user geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          fetchNearbyPharmacies(lat, lng);
        },
        (err) => {
          console.error("Error getting location: ", err);
          setError("No se pudo obtener tu ubicación original. Esto suele ocurrir porque tu navegador bloquea la geolocalización en sitios sin HTTPS.");
          setLoading(false);
        }
      );
    } else {
      setError("La geolocalización no es compatible con este navegador.");
      setLoading(false);
    }
  }, []);

  const handlePharmacySelect = (pharmacy: Pharmacy) => {
    const wasRouteActive = routeCoords !== null;

    // Si ya había una farmacia y es distinta, limpiamos ruta previa 
    // pero solo si no vamos a auto-actualizarla.
    // También cerramos cualquier ruta si cambiamos de farmacia sin que sea una auto-actualización.
    if (activePharmacy?.id !== pharmacy.id && !wasRouteActive) {
      setRouteCoords(null);
      setRouteInfo(null);
    }

    setActivePharmacy(pharmacy);
    if (onPharmacySelect) onPharmacySelect(pharmacy);

    // Solo auto-actualizamos si ya había una ruta activa y un modo seleccionado
    if (wasRouteActive && userLocation && transportMode) {
      fetchRoute(userLocation.lat, userLocation.lng, Number(pharmacy.latitude), Number(pharmacy.longitude), transportMode);
    }

    // Smooth scroll the sidebar list to the selected item
    // Agregamos un pequeño delay para asegurar que el DOM se haya actualizado si es necesario
    setTimeout(() => {
      if (itemRefs.current[pharmacy.id]) {
        itemRefs.current[pharmacy.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }, 100);
  };

  const handleTriggerRoute = (pharmacy: Pharmacy, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Primero: cerramos cualquier popup existente
    if (markerRefs.current[pharmacy.id]) {
      markerRefs.current[pharmacy.id]?.closePopup();
    }

    // Segundo: establecemos que se está cargando ANTES de limpiar lo anterior
    // Esto ayuda a los effects a saber que no deben abrir popups
    setRouteLoading(true);
    setRouteCoords(null);
    setRouteInfo(null);

    // Tercero: Actualizamos farmacia activa y disparamos búsqueda
    setActivePharmacy(pharmacy);
    if (onPharmacySelect) onPharmacySelect(pharmacy);

    if (userLocation) {
      const mode = transportMode || 'driving';
      if (!transportMode) setTransportMode('driving');
      fetchRoute(userLocation.lat, userLocation.lng, Number(pharmacy.latitude), Number(pharmacy.longitude), mode);
    }
  };

  const changeRouteMode = (mode: 'driving' | 'walking' | 'bus') => {
    setTransportMode(mode);
    if (userLocation && activePharmacy) {
      fetchRoute(userLocation.lat, userLocation.lng, Number(activePharmacy.latitude), Number(activePharmacy.longitude), mode);
    }
  };

  const fetchRoute = async (originLat: number, originLng: number, destLat: number, destLng: number, mode: 'driving' | 'walking' | 'bus') => {
    setRouteLoading(true);
    try {
      // Usamos los servidores de ruteo de OSM Alemania (FOSSGIS), que son m\u00e1s estables que el demo de OSRM
      // walking -> routed-foot
      // driving/bus -> routed-car
      const baseService = mode === 'walking' ? 'routed-foot' : 'routed-car';
      const profile = mode === 'walking' ? 'foot' : 'driving';

      const res = await fetch(`https://routing.openstreetmap.de/${baseService}/route/v1/${profile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        setRouteCoords(coords);

        // Diferenciación de tiempos realista y garantizada
        let simulatedDuration = route.duration;

        if (mode === 'walking') {
          // A pie: Velocidad promedio de 1.3 m/s (~4.7 km/h)
          // Calculamos basado en la distancia real para evitar errores de perfiles de OSRM
          simulatedDuration = route.distance / 1.3;
        } else if (mode === 'bus') {
          // Bus: Basado en tiempo de conducción + paradas y esperas (aprox 2.5x)
          simulatedDuration = route.duration * 2.5;
        } else {
          // Auto: El tiempo de OSRM driving suele ser fiel
          simulatedDuration = route.duration;
        }

        setRouteInfo({ duration: simulatedDuration, distance: route.distance });
      }
    } catch (err) {
      console.error("Error fetching route:", err);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleUseMockLocation = () => {
    // Default location: Bogotá, Colombia (Chapinero area)
    const mockLat = 4.6450;
    const mockLng = -74.0503;
    setError(null);
    setUserLocation({ lat: mockLat, lng: mockLng });
    fetchNearbyPharmacies(mockLat, mockLng);
  };

  const fetchNearbyPharmacies = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const res = await fetch(`${GATEWAY}/api/farmacias/cercanas?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.success) {
        const allPharmacies = data.data;
        // Si hay filtro activo, mostrar solo las farmacias que venden el producto
        if (filterPharmacyIds && filterPharmacyIds.length > 0) {
          setPharmacies(allPharmacies.filter((f: any) => filterPharmacyIds.includes(Number(f.id))));
        } else {
          setPharmacies(allPharmacies);
        }
      } else {
        setError("Error al cargar las farmacias cercanas");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="map-loading-state">Buscando tu ubicación y farmacias cercanas...</div>;
  if (error) {
    return (
      <div className="map-error-state" style={{ flexDirection: 'column', gap: '15px' }}>
        <p>{error}</p>
        <button
          onClick={handleUseMockLocation}
          className="mock-location-btn"
        >
          Usar Ubicación de Prueba (Bogotá)
        </button>
      </div>
    );
  }
  if (!userLocation) return null;

  return (
    <div className="pharmacy-map-section">
      <div className="pharmacy-global-legend">
        <span className="legend-title">Simbología de Distancia:</span>
        <div className="legend-grid-horizontal">
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#0B7DB8' }}></span>
            <span> Tu ubicación</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#66B82E' }}></span>
            <span>Muy cerca (&lt; 2km)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#F59E0B' }}></span>
            <span>Distancia Media (2km - 6km)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#e74c3c' }}></span>
            <span>Lejana (&gt; 6km)</span>
          </div>
        </div>
      </div>

      <div className="pharmacy-map-container">
        <div className="pharmacy-map-sidebar">
          <div className="pharmacy-sidebar-header">
            <h3>Farmacias más cercanas a ti</h3>
          </div>

          {pharmacies.length === 0 ? (
            <p style={{ padding: '0 20px', color: 'var(--text-2)' }}>No se encontraron farmacias cerca.</p>
          ) : (
            <ul className="pharmacy-list" ref={listRef}>
              {pharmacies.map((pharmacy) => {
                let badgeColor = 'var(--primary)';
                if (pharmacy.distance !== undefined) {
                  if (pharmacy.distance <= 2) badgeColor = 'var(--primary)';
                  else if (pharmacy.distance <= 6) badgeColor = 'var(--amber)';
                  else badgeColor = '#e74c3c';
                }

                return (
                  <li
                    key={pharmacy.id}
                    ref={(el) => { itemRefs.current[pharmacy.id] = el; }}
                    className={`pharmacy-card ${activePharmacy?.id === pharmacy.id ? 'active-item' : ''}`}
                    onClick={() => handlePharmacySelect(pharmacy)}
                    style={{ borderLeftColor: activePharmacy?.id === pharmacy.id ? 'var(--blue)' : badgeColor }}
                  >
                    <div className="pharmacy-info-header">
                      <h4>{pharmacy.name}</h4>
                    </div>
                    <div className="pharmacy-info-body">
                      <p><span className="info-icon" aria-hidden="true">•</span> {pharmacy.address}</p>
                      <p><span className="info-icon"></span> {pharmacy.phone}</p>
                    </div>
                    <div className="pharmacy-actions">
                      <button
                        className={`btn-directions ${routeCoords && activePharmacy?.id === pharmacy.id ? 'btn-active' : ''} ${routeLoading && activePharmacy?.id === pharmacy.id ? 'btn-loading' : ''}`}
                        onClick={(e) => handleTriggerRoute(pharmacy, e)}
                        disabled={routeLoading && activePharmacy?.id === pharmacy.id}
                      >
                        {routeLoading && activePharmacy?.id === pharmacy.id
                          ? 'Calculando...'
                          : routeCoords && activePharmacy?.id === pharmacy.id
                            ? 'Actualizar Ruta'
                            : 'Cómo llegar'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="pharmacy-map-wrapper">
          {activePharmacy && (
            <div className="route-controls">
              <div className="route-info-bar">
                <span className="route-pharmacy-name">{activePharmacy.name}</span>
                {routeLoading && <span className="route-status-msg"> · Calculando...</span>}
                {routeInfo && !routeLoading && routeCoords && (
                  <div className="route-stats-details">
                    <span className="route-stats-time">{formatDuration(routeInfo.duration)}</span>
                    <span className="route-stats-arrival">Llegada: {calculateArrival(routeInfo.duration)}</span>
                  </div>
                )}
              </div>
              <div className="route-modes-row">
                <button
                  className={`route-mode-btn mode-driving ${transportMode === 'driving' ? 'active' : ''}`}
                  onClick={() => changeRouteMode('driving')}
                  title="Auto"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
                  Auto
                </button>
                <button
                  className={`route-mode-btn mode-bus ${transportMode === 'bus' ? 'active' : ''}`}
                  onClick={() => changeRouteMode('bus')}
                  title="Bus"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" /><path d="M18 18h3s.5-1.5.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 5.9 18.2 5 16 5H8c-2.2 0-4.1.9-5.4 2.8L1.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.3.8 2.8.8 2.8h3" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="16.5" cy="18.5" r="2.5" /></svg>
                  Bus
                </button>
                <button
                  className={`route-mode-btn mode-walking ${transportMode === 'walking' ? 'active' : ''}`}
                  onClick={() => changeRouteMode('walking')}
                  title="A pie"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" /><path d="m14 7-1.5 6 3 4M10 13l-1.5 8M14 7l-3-2-2 2-2-1M10 13l1-4-2-2" /></svg>
                  A pie
                </button>
                <button
                  className="close-route-btn"
                  onClick={() => {
                    setActivePharmacy(null);
                    setRouteCoords(null);
                    setRouteInfo(null);
                    // Sincronizar: Cerrar también los popups del mapa
                    Object.values(markerRefs.current).forEach((marker: any) => {
                      if (marker && marker.isPopupOpen && marker.isPopupOpen()) {
                        marker.closePopup();
                      }
                    });
                  }}
                  title="Cerrar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
          )}
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={15}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* Automatically adjust bounds to fit both points and route */}
            <AdjustMapView
              activePharmacy={activePharmacy}
              userLocation={userLocation}
              routeCoords={routeCoords}
              routeLoading={routeLoading}
            />

            {/* Render Route Polyline depending on transport mode */}
            {routeCoords && (
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: transportMode === 'driving' ? '#0B7DB8' : (transportMode === 'bus' ? '#8B5CF6' : '#22C55E'),
                  weight: transportMode === 'bus' ? 6 : 5,
                  opacity: 0.9,
                  dashArray: transportMode === 'walking' ? '5, 8' : (transportMode === 'bus' ? '12, 12' : undefined),
                  lineCap: transportMode === 'walking' ? 'round' : 'butt'
                }}
              />
            )}

            {/* Botón de Recentrar */}
            <RecenterButton userLocation={userLocation} />

            {/* User Marker */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup className="user-location-popup" closeButton={false}>
                <div className="user-popup-content">
                  <div className="user-popup-header">
                    <span className="user-home-icon"></span>
                    <strong>Tu Ubicación</strong>
                  </div>
                  <p className="user-popup-status">Estás aquí actualmente</p>
                </div>
              </Popup>
            </Marker>

            {/* Pharmacy Markers */}
            {pharmacies.map((pharmacy) => (
              <Marker
                key={pharmacy.id}
                ref={(el) => { markerRefs.current[pharmacy.id] = el; }}
                position={[Number(pharmacy.latitude), Number(pharmacy.longitude)]}
                icon={createPharmacyIcon(activePharmacy?.id === pharmacy.id, pharmacy.distance)}
                zIndexOffset={activePharmacy?.id === pharmacy.id ? 1000 : 0}
                eventHandlers={{
                  click: () => handlePharmacySelect(pharmacy),
                }}
              >
                <Popup
                  className="custom-map-popup"
                  autoPanPadding={[50, 50]}
                  closeButton={false}
                  eventHandlers={{
                    remove: () => {
                      // Solo limpiamos si la farmacia que se cierra es la activa
                      // Y NO hay una ruta activa o cargándose (de lo contrario, 
                      // el panel de abajo desaparece al cerrar el popup para ver la vía)
                      setActivePharmacy(prev => (prev?.id === pharmacy.id && !routeCoords && !routeLoading ? null : prev));
                    }
                  }}
                >
                  <div className="popup-content-inner">
                    <h4 className="popup-title">{pharmacy.name}</h4>
                    <div className="popup-details">
                      <p><span className="icon" aria-hidden="true">•</span> {pharmacy.address}</p>
                      <p><span className="icon"></span> {pharmacy.phone}</p>
                    </div>
                    <button
                      className="popup-route-btn"
                      onClick={(e) => {
                        handleTriggerRoute(pharmacy, e);
                      }}
                    >
                      {routeCoords && activePharmacy?.id === pharmacy.id ? ' Actualizar' : ' Trazar Ruta Ahora'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
