import React, { useEffect, useRef, useState, Component, ErrorInfo, ReactNode } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useSim } from '../context/SimulationContext';
import { useMapsApiKey, validateMapsApiKey } from '../services/mapApiKey';
import { AlertCircle, Layers, KeyRound, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GoogleMapsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Google Maps caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

interface GoogleMapsInnerProps {
  pinMode: 'none' | 'start' | 'dest';
  onPinPlaced: () => void;
  showTraffic: boolean;
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}

function GoogleMapsInner({
  pinMode,
  onPinPlaced,
  showTraffic,
  mapType,
}: GoogleMapsInnerProps) {
  const map = useMap();

  const {
    startPoint,
    destPoint,
    routeCoordinates,
    ambulance,
    phase,
    corridor,
    blocked,
    blockPos,
    signalsOnRoute,
    setPinLocation,
  } = useSim();

  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const glowPolylineRef = useRef<google.maps.Polyline | null>(null);
  const staticMarkersRef = useRef<google.maps.Marker[]>([]);
  const ambulanceMarkerRef = useRef<google.maps.Marker | null>(null);

  // Configure Map Type
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;
    try {
      const resolved =
        mapType === 'satellite'
          ? google.maps.MapTypeId.SATELLITE
          : mapType === 'hybrid'
          ? google.maps.MapTypeId.HYBRID
          : mapType === 'terrain'
          ? google.maps.MapTypeId.TERRAIN
          : google.maps.MapTypeId.ROADMAP;
      map.setMapTypeId(resolved);
    } catch {
      // Ignore
    }
  }, [map, mapType]);

  // Traffic Layer Toggle
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;
    try {
      if (showTraffic) {
        if (!trafficLayerRef.current) {
          trafficLayerRef.current = new google.maps.TrafficLayer();
        }
        trafficLayerRef.current.setMap(map);
      } else {
        trafficLayerRef.current?.setMap(null);
      }
    } catch {
      // Ignore
    }
    return () => {
      try {
        trafficLayerRef.current?.setMap(null);
      } catch {
        // Ignore
      }
    };
  }, [map, showTraffic]);

  // Map Click for placing pins
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (pinMode === 'none' || !e.latLng) return;
      const lat = Number(e.latLng.lat().toFixed(5));
      const lng = Number(e.latLng.lng().toFixed(5));
      setPinLocation(pinMode, lat, lng);
      onPinPlaced();
    });

    return () => {
      if (listener && typeof google !== 'undefined' && google.maps && google.maps.event) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [map, pinMode, onPinPlaced, setPinLocation]);

  // Draw Emergency Corridor Polyline
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    if (!routeCoordinates || routeCoordinates.length === 0) {
      routePolylineRef.current?.setMap(null);
      glowPolylineRef.current?.setMap(null);
      return;
    }

    try {
      const path = routeCoordinates.map((c) => ({ lat: c[0], lng: c[1] }));

      routePolylineRef.current?.setMap(null);
      glowPolylineRef.current?.setMap(null);

      glowPolylineRef.current = new google.maps.Polyline({
        path,
        strokeColor: corridor ? '#10b981' : '#3b82f6',
        strokeOpacity: 0.35,
        strokeWeight: corridor ? 14 : 10,
        map,
      });

      routePolylineRef.current = new google.maps.Polyline({
        path,
        strokeColor: corridor ? '#059669' : '#2563eb',
        strokeOpacity: 0.95,
        strokeWeight: 5,
        map,
      });

      if (phase !== 'running') {
        const bounds = new google.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 50);
      }
    } catch {
      // Ignore
    }

    return () => {
      try {
        routePolylineRef.current?.setMap(null);
        glowPolylineRef.current?.setMap(null);
      } catch {
        // Ignore
      }
    };
  }, [map, routeCoordinates, corridor, phase]);

  // 1. Render Static Overlays (Origin, Hospital, Signals, Blockage)
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    try {
      staticMarkersRef.current.forEach((m) => m.setMap(null));
      staticMarkersRef.current = [];

      // Origin Marker
      const originMarker = new google.maps.Marker({
        position: { lat: startPoint.lat, lng: startPoint.lng },
        map,
        title: `Origin: ${startPoint.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        label: {
          text: 'START',
          color: '#ffffff',
          fontSize: '9px',
          fontWeight: 'bold',
        },
      });
      staticMarkersRef.current.push(originMarker);

      // Hospital Destination Marker
      const destMarker = new google.maps.Marker({
        position: { lat: destPoint.lat, lng: destPoint.lng },
        map,
        title: `Hospital: ${destPoint.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#dc2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        label: {
          text: 'H',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 'black',
        },
      });
      staticMarkersRef.current.push(destMarker);

      // Traffic Signals along Corridor
      signalsOnRoute.forEach((sig) => {
        const sigMarker = new google.maps.Marker({
          position: { lat: sig.lat, lng: sig.lng },
          map,
          title: `Signal ${sig.id}: ${sig.isGreen ? 'PREEMPTED GREEN' : 'Normal'}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: sig.isGreen ? '#10b981' : '#ef4444',
            fillOpacity: 1,
            strokeColor: '#1e293b',
            strokeWeight: 2,
          },
        });
        staticMarkersRef.current.push(sigMarker);
      });

      // Incident / Blockage Marker
      if (blocked && blockPos) {
        const blockMarker = new google.maps.Marker({
          position: { lat: blockPos.lat, lng: blockPos.lng },
          map,
          title: `Road Incident: ${blockPos.name}`,
          icon: {
            path: 'M -4,-4 L 4,4 M 4,-4 L -4,4',
            scale: 3,
            strokeColor: '#dc2626',
            strokeWeight: 4,
          },
        });
        staticMarkersRef.current.push(blockMarker);
      }
    } catch {
      // Ignore
    }

    return () => {
      try {
        staticMarkersRef.current.forEach((m) => m.setMap(null));
        staticMarkersRef.current = [];
      } catch {
        // Ignore
      }
    };
  }, [map, startPoint, destPoint, signalsOnRoute, blocked, blockPos]);

  // 2. High-performance Ambulance Marker & Smooth Viewport Tracking (Zero Satellite Buffering)
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    if (!ambulance || phase === 'idle') {
      if (ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current.setMap(null);
        ambulanceMarkerRef.current = null;
      }
      return;
    }

    try {
      const headingDeg = (ambulance.angle * 180) / Math.PI;

      if (!ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current = new google.maps.Marker({
          position: { lat: ambulance.lat, lng: ambulance.lng },
          map,
          zIndex: 1000,
          title: 'AMBULANCE-01 (Priority: CRITICAL)',
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: headingDeg,
          },
        });
      } else {
        ambulanceMarkerRef.current.setPosition({ lat: ambulance.lat, lng: ambulance.lng });
        ambulanceMarkerRef.current.setIcon({
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#dc2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: headingDeg,
        });
      }

      // Smooth camera follow without thrashing satellite tiles on every tick
      if (phase === 'running') {
        const bounds = map.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          const latMargin = (ne.lat() - sw.lat()) * 0.12;
          const lngMargin = (ne.lng() - sw.lng()) * 0.12;
          const isComfortablyInside =
            ambulance.lat >= sw.lat() + latMargin &&
            ambulance.lat <= ne.lat() - latMargin &&
            ambulance.lng >= sw.lng() + lngMargin &&
            ambulance.lng <= ne.lng() - lngMargin;

          if (!isComfortablyInside) {
            map.panTo({ lat: ambulance.lat, lng: ambulance.lng });
          }
        }
      }
    } catch {
      // Ignore
    }
  }, [map, ambulance, phase]);

  // Clean up ambulance marker on unmount
  useEffect(() => {
    return () => {
      if (ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current.setMap(null);
        ambulanceMarkerRef.current = null;
      }
    };
  }, []);

  return null;
}

interface GoogleMapsViewProps {
  pinMode: 'none' | 'start' | 'dest';
  onPinPlaced: () => void;
  showTraffic: boolean;
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  onFallbackToOsm?: () => void;
}

export function GoogleMapsView({
  pinMode,
  onPinPlaced,
  showTraffic,
  mapType,
  onFallbackToOsm,
}: GoogleMapsViewProps) {
  const { mapCenter, mapZoom } = useSim();
  const { apiKey, hasKey, setKey } = useMapsApiKey();
  const [authError, setAuthError] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [inputError, setInputError] = useState('');

  // Intercept Google Maps Authentication errors if project billing isn't linked
  useEffect(() => {
    const originalAuthFailure = (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      console.warn('Google Maps authentication failure detected on key.');
      setAuthError(true);
      if (originalAuthFailure) originalAuthFailure();
    };

    return () => {
      (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = originalAuthFailure;
    };
  }, []);

  const handleApplyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKeyInput.trim()) return;
    setValidating(true);
    setInputError('');

    const res = await validateMapsApiKey(customKeyInput.trim());
    setValidating(false);

    if (res.valid) {
      setKey(customKeyInput.trim());
      setAuthError(false);
    } else {
      setInputError(res.message);
    }
  };

  // If no API key configured, show intuitive onboarding card directly inside map viewport
  if (!hasKey || authError) {
    return (
      <div className="flex size-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/20 text-primary mb-3">
          <KeyRound className="size-6" />
        </div>
        <h3 className="text-base font-bold">
          {authError ? 'Google Maps Authorization Error' : 'Configure Google Maps API Key'}
        </h3>
        <p className="mt-1.5 max-w-md text-xs text-slate-300">
          {authError
            ? 'The current key encountered an authorization error (billing or API quota). You can paste a new key or switch to OpenStreetMap.'
            : 'To view Google Maps with live traffic layers, enter your Google Maps Platform API key below.'}
        </p>

        {/* Inline Key Input Form */}
        <form onSubmit={handleApplyKey} className="mt-4 w-full max-w-sm space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste Google Maps API key (AIzaSy…)"
              value={customKeyInput}
              onChange={(e) => setCustomKeyInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={validating || !customKeyInput.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {validating ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Save
            </button>
          </div>
          {inputError && (
            <p className="text-left text-[11px] font-semibold text-rose-400">{inputError}</p>
          )}
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onFallbackToOsm}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-700 cursor-pointer"
          >
            <Layers className="size-4 text-emerald-400" />
            Switch to OpenStreetMap Engine (Free & Ready)
          </button>
        </div>

        <a
          href="https://console.cloud.google.com/google/maps-apis/credentials"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 hover:underline"
        >
          <span>Get an API key with Maps JavaScript & Routes API</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  return (
    <GoogleMapsErrorBoundary
      fallback={(err) => (
        <div className="flex h-full flex-col items-center justify-center bg-slate-900 p-6 text-center text-white">
          <AlertCircle className="size-8 text-amber-400 mb-2" />
          <p className="text-xs text-slate-300">{err.message}</p>
          <button
            onClick={onFallbackToOsm}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground cursor-pointer"
          >
            <Layers className="size-3.5" />
            Switch to OpenStreetMap Engine
          </button>
        </div>
      )}
    >
      <APIProvider apiKey={apiKey} solutionChannel="gmp_mcp_codeassist_v1_aistudio">
        <Map
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          mapTypeId={mapType === 'satellite' ? 'hybrid' : mapType}
          center={{ lat: mapCenter[0], lng: mapCenter[1] }}
          zoom={mapZoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="size-full"
        >
          <GoogleMapsInner
            pinMode={pinMode}
            onPinPlaced={onPinPlaced}
            showTraffic={showTraffic}
            mapType={mapType}
          />
        </Map>
      </APIProvider>
    </GoogleMapsErrorBoundary>
  );
}
