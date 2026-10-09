import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { sounds } from '../audio/sounds';
import { cityPresets, LocationPoint, CityPreset } from '../data/realLocations';
import { fetchRealRoute, generateRealisticRoadFallback, RouteStep } from '../services/routingService';

export type SimPhase = 'idle' | 'emergency' | 'found' | 'running' | 'arrived';
export type AlertLevel = 'critical' | 'warning' | 'info' | 'blockage' | 'success';

export interface AlertItem {
  id: number;
  level: AlertLevel;
  text: string;
  time: string;
}

export interface BannerState {
  text: string;
  tone: 'success' | 'danger' | 'info';
}

export interface AmbulancePos {
  lat: number;
  lng: number;
  angle: number;
  speedKmh: number;
}

export interface RealSignalNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isGreen: boolean;
}

export function formatCurrentTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Compute bearing angle between two lat/lng points in radians
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  return Math.atan2(y, x);
}

// Interpolate position along polyline by index or distance
export function getPositionAlongRealPolyline(
  coords: [number, number][],
  fraction: number
): AmbulancePos {
  if (coords.length === 0) return { lat: 0, lng: 0, angle: 0, speedKmh: 0 };
  if (coords.length === 1) return { lat: coords[0][0], lng: coords[0][1], angle: 0, speedKmh: 0 };

  const totalSegments = coords.length - 1;
  const targetIndex = Math.min(totalSegments - 1, Math.max(0, fraction * totalSegments));
  const baseIndex = Math.floor(targetIndex);
  const segFrac = targetIndex - baseIndex;

  const p1 = coords[baseIndex];
  const p2 = coords[Math.min(coords.length - 1, baseIndex + 1)];

  const lat = p1[0] + (p2[0] - p1[0]) * segFrac;
  const lng = p1[1] + (p2[1] - p1[1]) * segFrac;
  const angle = calculateBearing(p1[0], p1[1], p2[0], p2[1]);

  return { lat, lng, angle, speedKmh: 54 };
}

interface SimulationContextValue {
  currentCity: CityPreset;
  startPoint: LocationPoint;
  destPoint: LocationPoint;
  routeCoordinates: [number, number][] | null;
  routeSteps: RouteStep[];
  phase: SimPhase;
  analyzing: boolean;
  corridor: boolean;
  blocked: boolean;
  blockPos: { lat: number; lng: number; name: string } | null;
  rerouted: boolean;
  heavyTraffic: boolean;
  alerts: AlertItem[];
  banner: BannerState | null;
  ambulance: AmbulancePos | null;
  etaMin: number;
  distanceKm: number;
  speedKmh: number;
  setSpeedKmh: (speed: number) => void;
  remainingDistanceKm: number;
  activeEtaSeconds: number;
  arrivalClockTime: string;
  simPace: number;
  setSimPace: (pace: number) => void;
  signalsOnRoute: RealSignalNode[];
  progressPercent: number;
  soundEnabled: boolean;
  mapCenter: [number, number];
  mapZoom: number;
  setSoundEnabled: (val: boolean) => void;
  selectCity: (cityId: string) => void;
  setStartPoint: (point: LocationPoint) => void;
  setDestPoint: (point: LocationPoint) => void;
  setPinLocation: (mode: 'start' | 'dest', lat: number, lng: number, name?: string) => void;
  swapDirection: () => void;
  setDirection: (origin: LocationPoint, destination: LocationPoint) => Promise<void>;
  startEmergency: () => void;
  findRoute: () => Promise<void>;
  startRoute: () => void;
  activateCorridor: () => void;
  simulateTraffic: () => void;
  createBlockage: () => void;
  optimizeRoute: () => void;
  reset: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const initialCity = cityPresets.hyderabad;
  const initialStart = initialCity.origins[0];
  const initialDest = initialCity.hospitals[0];

  // Immediately generate initial route coordinates so there is ZERO initial buffering
  const initialFallback = generateRealisticRoadFallback(
    initialStart.lat,
    initialStart.lng,
    initialDest.lat,
    initialDest.lng
  );

  const [currentCity, setCurrentCity] = useState<CityPreset>(initialCity);
  const [startPoint, setStartPointState] = useState<LocationPoint>(initialStart);
  const [destPoint, setDestPointState] = useState<LocationPoint>(initialDest);

  const [phase, setPhase] = useState<SimPhase>('found');
  const [analyzing, setAnalyzing] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(initialFallback.coordinates);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>(initialFallback.steps);
  const [progressPercent, setProgressPercent] = useState(0);

  const [corridor, setCorridor] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockPos, setBlockPos] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [rerouted, setRerouted] = useState(false);
  const [heavyTraffic, setHeavyTraffic] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);

  const [distanceKm, setDistanceKm] = useState(initialFallback.distanceKm);
  const [customSpeed, setCustomSpeed] = useState<number | null>(null);
  const [simPace, setSimPace] = useState<number>(1);

  // Realistic urban emergency speeds:
  // Green Corridor Wave: 48 km/h | Normal Traffic: 34 km/h | Heavy Congestion: 22 km/h | Congested with Corridor: 32 km/h
  const baseSpeed = heavyTraffic ? (corridor ? 32 : 22) : (corridor ? 48 : 34);
  const speedKmh = customSpeed ?? baseSpeed;

  const remainingDistanceKm = useMemo(() => {
    if (phase === 'arrived') return 0;
    const rem = distanceKm * (1 - progressPercent);
    return Math.max(0, Math.round(rem * 10) / 10);
  }, [distanceKm, progressPercent, phase]);

  const activeEtaSeconds = useMemo(() => {
    if (phase === 'arrived') return 0;
    if (speedKmh <= 0 || remainingDistanceKm <= 0) return 0;
    // Calibrated urban emergency transit formula:
    // Cruising travel time at speed + junction/intersection deceleration & clearance buffer (~12s per remaining km)
    const baseSec = (remainingDistanceKm / speedKmh) * 3600;
    const junctionBufferSec = Math.round(remainingDistanceKm * 12);
    return Math.max(15, Math.round(baseSec + junctionBufferSec));
  }, [remainingDistanceKm, speedKmh, phase]);

  const etaMin = useMemo(() => {
    if (phase === 'arrived') return 0;
    return Math.max(1, Math.round(activeEtaSeconds / 60));
  }, [activeEtaSeconds, phase]);

  const arrivalClockTime = useMemo(() => {
    if (phase === 'arrived') return 'ARRIVED';
    return new Date(Date.now() + activeEtaSeconds * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [activeEtaSeconds, phase]);

  // Initial signals
  const [signalsOnRoute, setSignalsOnRoute] = useState<RealSignalNode[]>([
    { id: 'S-1', name: 'Cyber Towers Junction', lat: 17.448, lng: 78.385, isGreen: false },
    { id: 'S-2', name: 'Madhapur Main Interchange', lat: 17.439, lng: 78.395, isGreen: false },
    { id: 'S-3', name: 'Jubilee Hills Road 36', lat: 17.428, lng: 78.405, isGreen: false },
    { id: 'S-4', name: 'Apollo Access Junction', lat: 17.418, lng: 78.411, isGreen: false },
  ]);

  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 0,
      level: 'info',
      text: 'Traffic network online. Direction active from Cyber Towers to Apollo Hospitals.',
      time: '—',
    },
  ]);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const alertIdCounter = useRef(1);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const stateRef = useRef({ phase, routeCoordinates, progressPercent, blocked, rerouted });
  stateRef.current = { phase, routeCoordinates, progressPercent, blocked, rerouted };

  const setSoundEnabled = (val: boolean) => {
    sounds.enabled = val;
    setSoundEnabledState(val);
  };

  const addTimer = (fn: () => void, delayMs: number) => {
    const tid = setTimeout(fn, delayMs);
    timersRef.current.push(tid);
    return tid;
  };

  const pushAlert = useCallback((level: AlertLevel, text: string) => {
    const id = alertIdCounter.current++;
    setAlerts((prev) => [{ id, level, text, time: formatCurrentTime() }, ...prev].slice(0, 8));
  }, []);

  const triggerBanner = useCallback((text: string, tone: 'success' | 'danger' | 'info') => {
    setBanner({ text, tone });
  }, []);

  // Compute intersections/signals along the calculated route
  const generateSignalsForRoute = useCallback((coords: [number, number][], isCorridor: boolean) => {
    if (coords.length < 4) return [];
    const stepCount = Math.min(8, Math.max(3, Math.floor(coords.length / 12)));
    const nodes: RealSignalNode[] = [];
    for (let i = 1; i <= stepCount; i++) {
      const idx = Math.floor((i / (stepCount + 1)) * coords.length);
      const pt = coords[idx];
      nodes.push({
        id: `S-${i}`,
        name: `Interchange ${i}`,
        lat: pt[0],
        lng: pt[1],
        isGreen: isCorridor,
      });
    }
    return nodes;
  }, []);

  // Set direction with guaranteed zero-hang termination
  const setDirection = useCallback(
    async (origin: LocationPoint, destination: LocationPoint) => {
      // 1. Immediately apply synchronous fast route to avoid ANY buffering delay
      const fastResult = generateRealisticRoadFallback(origin.lat, origin.lng, destination.lat, destination.lng);
      setRouteCoordinates(fastResult.coordinates);
      setRouteSteps(fastResult.steps);
      setDistanceKm(fastResult.distanceKm);
      setProgressPercent(0);
      setSignalsOnRoute(generateSignalsForRoute(fastResult.coordinates, corridor));

      setAnalyzing(true);
      triggerBanner(`Setting direction: ${origin.name} → ${destination.name}`, 'info');

      // Watchdog timeout to guarantee analyzing is NEVER stuck on true
      const watchdog = setTimeout(() => {
        setAnalyzing(false);
      }, 2000);

      try {
        const result = await fetchRealRoute(origin.lat, origin.lng, destination.lat, destination.lng);
        clearTimeout(watchdog);
        setRouteCoordinates(result.coordinates);
        setRouteSteps(result.steps);
        setDistanceKm(result.distanceKm);
        setSignalsOnRoute(generateSignalsForRoute(result.coordinates, corridor));
        sounds.playGreenCorridor();
        pushAlert('info', `Direction active: ${result.distanceKm} km to ${destination.name}.`);
        triggerBanner(`Direction active — ${result.distanceKm} km to ${destination.name}`, 'success');
      } catch (err) {
        console.warn('Background route refinement error, keeping baseline route:', err);
      } finally {
        clearTimeout(watchdog);
        setAnalyzing(false);
      }
    },
    [corridor, generateSignalsForRoute, pushAlert, triggerBanner]
  );

  // Switch City
  const selectCity = useCallback(
    (cityId: string) => {
      sounds.playClick();
      const city = cityPresets[cityId] || cityPresets.hyderabad;
      setCurrentCity(city);
      const o = city.origins[0];
      const h = city.hospitals[0];
      setStartPointState(o);
      setDestPointState(h);
      setProgressPercent(0);
      setCorridor(false);
      setBlocked(false);
      setBlockPos(null);
      setRerouted(false);
      setBanner(null);
      pushAlert('info', `Area shifted to ${city.name}. Setting direction to ${h.name}.`);
      setDirection(o, h);
    },
    [pushAlert, setDirection]
  );

  // Swap Direction
  const swapDirection = useCallback(() => {
    sounds.playClick();
    const prevStart = startPoint;
    const prevDest = destPoint;
    setStartPointState(prevDest);
    setDestPointState(prevStart);
    setDirection(prevDest, prevStart);
    pushAlert('info', `Direction swapped: ${prevDest.name} → ${prevStart.name}.`);
  }, [startPoint, destPoint, setDirection, pushAlert]);

  const setStartPoint = useCallback(
    (point: LocationPoint) => {
      setStartPointState(point);
      setDirection(point, destPoint);
    },
    [destPoint, setDirection]
  );

  const setDestPoint = useCallback(
    (point: LocationPoint) => {
      setDestPointState(point);
      setDirection(startPoint, point);
    },
    [startPoint, setDirection]
  );

  const setPinLocation = useCallback(
    (mode: 'start' | 'dest', lat: number, lng: number, name?: string) => {
      sounds.playClick();
      const newPt: LocationPoint = {
        id: `custom-${Date.now()}`,
        name: name || `Selected Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng,
        type: mode === 'start' ? 'origin' : 'hospital',
      };
      if (mode === 'start') {
        setStartPointState(newPt);
        setDirection(newPt, destPoint);
      } else {
        setDestPointState(newPt);
        setDirection(startPoint, newPt);
      }
    },
    [startPoint, destPoint, setDirection]
  );

  // Background refinement of initial route on load
  useEffect(() => {
    fetchRealRoute(initialStart.lat, initialStart.lng, initialDest.lat, initialDest.lng)
      .then((res) => {
        if (res && res.coordinates.length > 2) {
          setRouteCoordinates(res.coordinates);
          setRouteSteps(res.steps);
          setDistanceKm(res.distanceKm);
          setSignalsOnRoute(generateSignalsForRoute(res.coordinates, false));
        }
      })
      .catch(() => {});
  }, []);

  // 1. Start Emergency
  const startEmergency = useCallback(() => {
    sounds.playRadioChirp();
    sounds.playSirenPulse();
    setPhase('emergency');
    pushAlert('critical', `Emergency call received. Ambulance assigned to ${startPoint.name}.`);
    triggerBanner('Emergency dispatch initiated — ambulance on standby', 'danger');
  }, [pushAlert, triggerBanner, startPoint.name]);

  // 2. Find Real Route
  const findRoute = useCallback(async () => {
    await setDirection(startPoint, destPoint);
  }, [setDirection, startPoint, destPoint]);

  // 3. Activate Green Corridor
  const activateCorridor = useCallback(() => {
    sounds.playGreenCorridor();
    setCorridor(true);
    setSignalsOnRoute((prev) => prev.map((s) => ({ ...s, isGreen: true })));
    pushAlert('success', 'Green corridor active. Traffic signals along the route preempted to GREEN.');
    triggerBanner('Green corridor active — all route signals switched to GREEN', 'success');
  }, [pushAlert, triggerBanner]);

  // 4. Start Route Navigation
  const startRoute = useCallback(async () => {
    sounds.playSirenPulse();
    const curr = stateRef.current;
    if (curr.phase !== 'running') {
      if (!curr.routeCoordinates || curr.phase === 'arrived') {
        await setDirection(startPoint, destPoint);
      }
      setPhase('running');
      setCorridor(true);
      pushAlert('critical', `AMBULANCE-01 en route to ${destPoint.name}. Priority: CRITICAL.`);
      triggerBanner('Emergency route ACTIVE — green signal corridor engaged', 'success');
    }
  }, [destPoint.name, setDirection, startPoint, destPoint, pushAlert, triggerBanner]);

  // 5. Simulate Traffic
  const simulateTraffic = useCallback(() => {
    sounds.playAlert();
    setHeavyTraffic((prev) => {
      const next = !prev;
      pushAlert('warning', next ? 'High traffic congestion reported on arterial roads.' : 'Traffic density easing on main avenues.');
      return next;
    });
  }, [pushAlert]);

  // Internal rerouting logic around a blockage
  const executeReroute = useCallback(async (explicitBlockPos?: { lat: number; lng: number }) => {
    if (!routeCoordinates || rerouted) return;
    sounds.playGreenCorridor();

    const currentPos = getPositionAlongRealPolyline(routeCoordinates, progressPercent);
    const avoid = explicitBlockPos || blockPos || undefined;

    const result = await fetchRealRoute(
      currentPos.lat,
      currentPos.lng,
      destPoint.lat,
      destPoint.lng,
      avoid ? { lat: avoid.lat, lng: avoid.lng } : undefined
    );

    const coveredIndex = Math.floor(progressPercent * (routeCoordinates.length - 1));
    const priorPoints = routeCoordinates.slice(0, coveredIndex + 1);
    const combinedRoute = [...priorPoints, ...result.coordinates];

    setRouteCoordinates(combinedRoute);
    setRouteSteps(result.steps);
    setDistanceKm(Math.round((result.distanceKm + (coveredIndex / routeCoordinates.length) * distanceKm) * 10) / 10);
    setRerouted(true);
    setSignalsOnRoute(generateSignalsForRoute(combinedRoute, true));

    pushAlert('info', `Route dynamically recalculated around incident. Detour corridor updated.`);
    triggerBanner('Dynamic Reroute Active — ambulance rerouted to clear corridor', 'success');
  }, [routeCoordinates, rerouted, progressPercent, blockPos, destPoint, distanceKm, generateSignalsForRoute, pushAlert, triggerBanner]);

  // 6. Create Blockage along active road
  const createBlockage = useCallback(() => {
    sounds.playAlert();
    if (blocked || !routeCoordinates || routeCoordinates.length === 0) return;

    const aheadIndex = Math.min(
      routeCoordinates.length - 1,
      Math.floor((progressPercent + 0.28) * (routeCoordinates.length - 1))
    );
    const targetPoint = routeCoordinates[aheadIndex];
    const newBlockPos = {
      lat: targetPoint[0],
      lng: targetPoint[1],
      name: `Accident / Road Closure ahead`,
    };

    setBlocked(true);
    setBlockPos(newBlockPos);

    pushAlert('blockage', `Incident detected on active path. Lane blocked ahead.`);
    triggerBanner('Road blockage detected on active path — computing reroute…', 'danger');

    addTimer(() => {
      executeReroute(newBlockPos);
    }, 1200);
  }, [blocked, routeCoordinates, progressPercent, pushAlert, triggerBanner, executeReroute]);

  // 7. Optimize Route
  const optimizeRoute = useCallback(() => {
    sounds.playClick();
    if (blocked && !rerouted) {
      executeReroute();
    } else if (routeCoordinates) {
      pushAlert('info', 'Route is already optimized for current road conditions.');
      triggerBanner('Route is optimal for current traffic', 'info');
    } else {
      findRoute();
    }
  }, [blocked, rerouted, routeCoordinates, executeReroute, findRoute, pushAlert, triggerBanner]);

  // 8. Reset
  const reset = useCallback(() => {
    sounds.playClick();
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('idle');
    setAnalyzing(false);
    setProgressPercent(0);
    setCorridor(false);
    setBlocked(false);
    setBlockPos(null);
    setRerouted(false);
    setHeavyTraffic(false);
    setBanner(null);
    setDirection(startPoint, destPoint);
    setAlerts([
      {
        id: alertIdCounter.current++,
        level: 'info',
        text: 'System reset. Direction set from origin to hospital.',
        time: formatCurrentTime(),
      },
    ]);
  }, [setDirection, startPoint, destPoint]);

  // Animation movement tick loop
  useEffect(() => {
    if (phase !== 'running' || !routeCoordinates || routeCoordinates.length === 0) return;

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        // Base step calibrated to smooth 50-55s realistic demo trip, multiplied by simPace (1x, 2x, 4x)
        const step = 0.0018 * simPace;
        const next = prev + step;
        if (next >= 1) {
          clearInterval(interval);
          setPhase('arrived');
          sounds.playGreenCorridor();
          pushAlert('success', `AMBULANCE-01 arrived at ${destPoint.name}. Patient transferred.`);
          triggerBanner(`Patient delivered to ${destPoint.name} emergency bay`, 'success');
          return 1;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, routeCoordinates, destPoint.name, pushAlert, triggerBanner, simPace]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const ambulance = useMemo(() => {
    if (phase === 'idle') return null;
    if (routeCoordinates && routeCoordinates.length > 0) {
      return getPositionAlongRealPolyline(routeCoordinates, progressPercent);
    }
    return { lat: startPoint.lat, lng: startPoint.lng, angle: 0, speedKmh: 0 };
  }, [phase, routeCoordinates, progressPercent, startPoint.lat, startPoint.lng]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (ambulance && phase === 'running') {
      return [ambulance.lat, ambulance.lng];
    }
    if (routeCoordinates && routeCoordinates.length > 0) {
      const mid = routeCoordinates[Math.floor(routeCoordinates.length / 2)];
      return [mid[0], mid[1]];
    }
    return [
      (startPoint.lat + destPoint.lat) / 2,
      (startPoint.lng + destPoint.lng) / 2,
    ];
  }, [ambulance, phase, routeCoordinates, startPoint, destPoint]);

  const mapZoom = currentCity.zoom;

  const value = useMemo(
    () => ({
      currentCity,
      startPoint,
      destPoint,
      routeCoordinates,
      routeSteps,
      phase,
      analyzing,
      corridor,
      blocked,
      blockPos,
      rerouted,
      heavyTraffic,
      alerts,
      banner,
      ambulance,
      etaMin,
      distanceKm,
      speedKmh,
      setSpeedKmh: setCustomSpeed,
      remainingDistanceKm,
      activeEtaSeconds,
      arrivalClockTime,
      simPace,
      setSimPace,
      signalsOnRoute,
      progressPercent,
      soundEnabled,
      mapCenter,
      mapZoom,
      setSoundEnabled,
      selectCity,
      setStartPoint,
      setDestPoint,
      setPinLocation,
      swapDirection,
      setDirection,
      startEmergency,
      findRoute,
      startRoute,
      activateCorridor,
      simulateTraffic,
      createBlockage,
      optimizeRoute,
      reset,
    }),
    [
      currentCity,
      startPoint,
      destPoint,
      routeCoordinates,
      routeSteps,
      phase,
      analyzing,
      corridor,
      blocked,
      blockPos,
      rerouted,
      heavyTraffic,
      alerts,
      banner,
      ambulance,
      etaMin,
      distanceKm,
      speedKmh,
      remainingDistanceKm,
      activeEtaSeconds,
      arrivalClockTime,
      simPace,
      signalsOnRoute,
      progressPercent,
      soundEnabled,
      mapCenter,
      mapZoom,
      selectCity,
      setStartPoint,
      setDestPoint,
      setPinLocation,
      swapDirection,
      setDirection,
      startEmergency,
      findRoute,
      startRoute,
      activateCorridor,
      simulateTraffic,
      createBlockage,
      optimizeRoute,
      reset,
    ]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSim() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSim must be used inside SimulationProvider');
  }
  return context;
}
