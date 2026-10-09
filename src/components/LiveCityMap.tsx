import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Compass,
  Crosshair,
  MapPin,
  Maximize2,
  Minimize2,
  Activity,
  Map as MapIcon,
  Layers,
  Radio,
  ArrowUpDown,
  Navigation,
  KeyRound,
} from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { Card, Badge } from './ui/Card';
import { GoogleMapsView } from './GoogleMapsView';
import { MapsApiKeyModal } from './MapsApiKeyModal';
import { useMapsApiKey, hasValidMapsApiKey } from '../services/mapApiKey';

const tileProviders = {
  streets: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxNativeZoom: 19,
    maxZoom: 19,
  },
  carto: {
    name: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxNativeZoom: 19,
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxNativeZoom: 18,
    maxZoom: 19,
  },
};

export function LiveCityMap() {
  const {
    currentCity,
    startPoint,
    destPoint,
    routeCoordinates,
    ambulance,
    phase,
    corridor,
    blocked,
    blockPos,
    signalsOnRoute,
    heavyTraffic,
    analyzing,
    selectCity,
    setPinLocation,
    swapDirection,
    findRoute,
  } = useSim();

  const { hasKey } = useMapsApiKey();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  // Map Provider Switcher: default to 'google' if key present, else 'osm' for zero-friction readiness
  const [mapEngine, setMapEngine] = useState<'google' | 'osm'>(() =>
    hasValidMapsApiKey() ? 'google' : 'osm'
  );
  const [googleMapType, setGoogleMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [showLiveTraffic, setShowLiveTraffic] = useState(true);

  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const glowPolylineRef = useRef<L.Polyline | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const ambulanceMarkerRef = useRef<L.Marker | null>(null);

  const [activeTile, setActiveTile] = useState<'carto' | 'streets' | 'satellite'>('carto');
  const [pinMode, setPinMode] = useState<'none' | 'start' | 'dest'>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Leaflet map (only when mapEngine === 'osm')
  useEffect(() => {
    if (mapEngine !== 'osm') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: currentCity.center,
      zoom: currentCity.zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const provider = tileProviders[activeTile];
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxNativeZoom: provider.maxNativeZoom,
      maxZoom: provider.maxZoom,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateInterval: 200,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Invalidate size immediately to prevent tile buffering/gray artifacts
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapEngine]);

  // Update map view when currentCity changes in OSM mode
  useEffect(() => {
    if (mapEngine !== 'osm') return;
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(currentCity.center, currentCity.zoom);
  }, [currentCity, mapEngine]);

  // Switch tile provider in OSM mode
  useEffect(() => {
    if (mapEngine !== 'osm') return;
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;
    map.removeLayer(tileLayerRef.current);
    const provider = tileProviders[activeTile];
    const newTile = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxNativeZoom: provider.maxNativeZoom,
      maxZoom: provider.maxZoom,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateInterval: 200,
    }).addTo(map);
    tileLayerRef.current = newTile;
    map.invalidateSize();
  }, [activeTile, mapEngine]);

  // Handle map click for placing custom pins in OSM mode
  useEffect(() => {
    if (mapEngine !== 'osm') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (pinMode === 'none') return;
      const { lat, lng } = e.latlng;
      setPinLocation(pinMode, Number(lat.toFixed(5)), Number(lng.toFixed(5)));
      setPinMode('none');
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [pinMode, setPinLocation, mapEngine]);

  // Draw Route Polyline in OSM mode
  useEffect(() => {
    if (mapEngine !== 'osm') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (glowPolylineRef.current) {
      map.removeLayer(glowPolylineRef.current);
      glowPolylineRef.current = null;
    }

    if (!routeCoordinates || routeCoordinates.length === 0) return;

    const glow = L.polyline(routeCoordinates, {
      color: corridor ? '#10b981' : '#3b82f6',
      weight: corridor ? 14 : 10,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    const core = L.polyline(routeCoordinates, {
      color: corridor ? '#059669' : '#2563eb',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    glowPolylineRef.current = glow;
    routePolylineRef.current = core;

    if (phase !== 'running') {
      map.fitBounds(core.getBounds(), { padding: [40, 40], maxZoom: 15 });
    }
  }, [routeCoordinates, corridor, phase, mapEngine]);

  // Render Static Markers in OSM mode
  useEffect(() => {
    if (mapEngine !== 'osm') return;
    const group = markersLayerRef.current;
    if (!group) return;
    group.clearLayers();

    // Origin
    const originIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="flex items-center gap-1.5 -translate-x-1/2 -translate-y-full cursor-pointer">
          <div class="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg ring-2 ring-white">
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
    L.marker([startPoint.lat, startPoint.lng], { icon: originIcon }).addTo(group);

    // Destination Hospital
    const destIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="relative flex items-center gap-1.5 -translate-x-1/2 -translate-y-full cursor-pointer">
          <span class="absolute -inset-1 animate-ping rounded-full bg-red-500 opacity-60"></span>
          <div class="relative flex size-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-xl ring-2 ring-white font-black text-sm">
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
    L.marker([destPoint.lat, destPoint.lng], { icon: destIcon }).addTo(group);

    // Signals
    signalsOnRoute.forEach((sig) => {
      const sigIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
            <div class="flex flex-col gap-1 rounded-md bg-slate-900 p-1 shadow-md border border-slate-700">
              <div class="size-2 rounded-full ${sig.isGreen ? 'bg-slate-700' : 'bg-red-500'}"></div>
              <div class="size-2 rounded-full ${sig.isGreen ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'}"></div>
            </div>
            <span class="mt-0.5 rounded bg-slate-900/90 px-1 text-[9px] font-bold text-white">${sig.id}</span>
          </div>
        `,
        iconSize: [20, 32],
        iconAnchor: [10, 16],
      });
      L.marker([sig.lat, sig.lng], { icon: sigIcon }).addTo(group);
    });

    // Blockage
    if (blocked && blockPos) {
      const blockIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <span class="absolute size-9 animate-ping rounded-full bg-red-600 opacity-75"></span>
            <div class="relative flex size-8 items-center justify-center rounded-xl bg-red-600 text-white shadow-xl ring-2 ring-white">
              <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([blockPos.lat, blockPos.lng], { icon: blockIcon }).addTo(group);
    }
  }, [startPoint, destPoint, signalsOnRoute, blocked, blockPos, mapEngine]);

  // High-performance Ambulance Marker Tracking in OSM mode (Zero buffering)
  useEffect(() => {
    if (mapEngine !== 'osm') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!ambulance || phase === 'idle') {
      if (ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current.remove();
        ambulanceMarkerRef.current = null;
      }
      return;
    }

    const angleDeg = (ambulance.angle * 180) / Math.PI;

    if (!ambulanceMarkerRef.current) {
      const ambIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <span class="absolute size-11 animate-ping rounded-full bg-red-500 opacity-60"></span>
            <div id="osm-ambulance-chassis" style="transform: rotate(${angleDeg}deg)" class="relative flex h-10 w-6 items-center justify-center rounded-lg border-2 border-red-600 bg-white shadow-2xl transition-transform duration-75">
              <div class="absolute top-1.5 h-2 w-4 rounded-sm bg-sky-500/80"></div>
              <div class="relative flex size-3 items-center justify-center text-red-600 font-black text-xs leading-none">+</div>
              <div class="absolute -top-1 size-2 animate-pulse rounded-full bg-red-600 shadow-[0_0_10px_#ef4444]"></div>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow">
              AMBULANCE-01
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      ambulanceMarkerRef.current = L.marker([ambulance.lat, ambulance.lng], { icon: ambIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      ambulanceMarkerRef.current.setLatLng([ambulance.lat, ambulance.lng]);
      const chassis = document.getElementById('osm-ambulance-chassis');
      if (chassis) {
        chassis.style.transform = `rotate(${angleDeg}deg)`;
      }
    }

    // Smooth viewport centering only when ambulance nears boundary
    if (phase === 'running') {
      const bounds = map.getBounds();
      if (bounds && !bounds.pad(-0.12).contains([ambulance.lat, ambulance.lng])) {
        map.panTo([ambulance.lat, ambulance.lng], { animate: true, duration: 0.3 });
      }
    }
  }, [ambulance, phase, mapEngine]);

  // Clean up Leaflet ambulance marker on engine change or unmount
  useEffect(() => {
    return () => {
      if (ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current.remove();
        ambulanceMarkerRef.current = null;
      }
    };
  }, [mapEngine]);

  const recenterMap = () => {
    if (mapEngine === 'osm') {
      const map = mapInstanceRef.current;
      if (!map) return;
      if (ambulance && phase === 'running') {
        map.setView([ambulance.lat, ambulance.lng], 15);
      } else if (routePolylineRef.current) {
        map.fitBounds(routePolylineRef.current.getBounds(), { padding: [40, 40] });
      } else {
        map.setView(currentCity.center, currentCity.zoom);
      }
    }
  };

  return (
    <Card id="live-map" className={`overflow-hidden transition-all ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''}`}>
      {/* Map Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {/* Engine Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1 text-xs font-bold">
            <button
              onClick={() => setMapEngine('google')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition cursor-pointer ${
                mapEngine === 'google'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapIcon className="size-3.5" />
              Google Maps
            </button>
            <button
              onClick={() => setMapEngine('osm')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition cursor-pointer ${
                mapEngine === 'osm'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="size-3.5" />
              OpenStreetMap
            </button>
          </div>

          {/* City Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1 text-xs font-semibold">
            {Object.values(currentCityPresets).map((city) => (
              <button
                key={city.id}
                onClick={() => selectCity(city.id)}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  currentCity.id === city.id
                    ? 'bg-secondary text-secondary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>

          {/* Quick Swap Direction */}
          <button
            onClick={swapDirection}
            className="flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted cursor-pointer"
            title="Swap Direction"
          >
            <ArrowUpDown className="size-3 text-primary" />
            <span className="hidden sm:inline">Swap Direction</span>
          </button>

          {/* Maps API Key Configuration */}
          <button
            onClick={() => setApiKeyModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              hasKey
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Configure Google Maps Platform API Key"
          >
            <KeyRound className="size-3.5" />
            <span>{hasKey ? 'Maps API: Active' : 'Add Maps API'}</span>
          </button>

          {/* Live Traffic Toggle (For Google Maps) */}
          {mapEngine === 'google' && (
            <button
              onClick={() => setShowLiveTraffic(!showLiveTraffic)}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                showLiveTraffic
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              <Radio className="size-3.5" />
              {showLiveTraffic ? 'Live Traffic: ON' : 'Traffic: OFF'}
            </button>
          )}
        </div>

        {/* Operational Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {phase === 'running' && (
            <Badge tone="green" dot>
              Ambulance En Route
            </Badge>
          )}
          {corridor && (
            <Badge tone="green" dot>
              Green Corridor Active
            </Badge>
          )}
          {analyzing && (
            <Badge tone="blue" dot>
              Calculating Direction…
            </Badge>
          )}
          {blocked && (
            <Badge tone="red" dot>
              Incident Detour Flagged
            </Badge>
          )}
          {heavyTraffic && (
            <Badge tone="orange" dot>
              Congested
            </Badge>
          )}
        </div>
      </div>

      {/* Map Viewport Container */}
      <div className="relative">
        <div style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '520px' }} className="w-full">
          {mapEngine === 'google' ? (
            <GoogleMapsView
              pinMode={pinMode}
              onPinPlaced={() => setPinMode('none')}
              showTraffic={showLiveTraffic}
              mapType={googleMapType}
              onFallbackToOsm={() => setMapEngine('osm')}
            />
          ) : (
            <div ref={mapContainerRef} className="size-full bg-slate-100" />
          )}
        </div>

        {/* Floating Actions Overlay */}
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
          {/* Recenter button (in OSM mode) */}
          {mapEngine === 'osm' && (
            <button
              onClick={recenterMap}
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-md transition hover:bg-muted cursor-pointer"
              title="Recenter Map"
            >
              <Crosshair className="size-4.5" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-md transition hover:bg-muted cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="size-4.5" /> : <Maximize2 className="size-4.5" />}
          </button>

          {/* Map Layer Style Selector */}
          {mapEngine === 'google' ? (
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-1 shadow-md">
              {(['roadmap', 'satellite', 'hybrid', 'terrain'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setGoogleMapType(t)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition cursor-pointer ${
                    googleMapType === t ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-1 shadow-md">
              {(['carto', 'streets', 'satellite'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTile(t)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition cursor-pointer ${
                    activeTile === t ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Click to Set Pin Overlay Banner */}
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card/95 px-3 py-1.5 shadow-md backdrop-blur">
            <span className="text-xs font-semibold text-muted-foreground">Click map to set:</span>
            <button
              onClick={() => setPinMode(pinMode === 'start' ? 'none' : 'start')}
              className={`rounded-lg px-2 py-1 text-xs font-bold transition cursor-pointer ${
                pinMode === 'start' ? 'bg-blue-600 text-white' : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <MapPin className="mr-1 inline size-3" />
              Origin
            </button>
            <button
              onClick={() => setPinMode(pinMode === 'dest' ? 'none' : 'dest')}
              className={`rounded-lg px-2 py-1 text-xs font-bold transition cursor-pointer ${
                pinMode === 'dest' ? 'bg-red-600 text-white' : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <Activity className="mr-1 inline size-3" />
              Hospital
            </button>
          </div>

          {pinMode !== 'none' && (
            <div className="animate-bounce rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground shadow-md">
              Tap anywhere on the map to set {pinMode === 'start' ? 'Origin' : 'Hospital Destination'}
            </div>
          )}
        </div>
      </div>

      {/* Map Legend & Active Direction Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3 text-xs font-medium text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-blue-600" />
            Origin: <strong className="text-foreground">{startPoint.name}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-600" />
            Destination: <strong className="text-foreground">{destPoint.name}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            Green Corridor
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Navigation className="size-3.5 text-primary" />
          <span>Direction Active & Preempted</span>
        </div>
      </div>

      {/* Google Maps API Key Modal */}
      <MapsApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSelectOsm={() => setMapEngine('osm')}
      />
    </Card>
  );
}

const currentCityPresets = {
  hyderabad: { id: 'hyderabad', name: 'Hyderabad' },
  bengaluru: { id: 'bengaluru', name: 'Bengaluru' },
  mumbai: { id: 'mumbai', name: 'Mumbai' },
  newyork: { id: 'newyork', name: 'New York' },
};
