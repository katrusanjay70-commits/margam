import { useState } from 'react';
import {
  Siren,
  Ambulance,
  Building2,
  TrafficCone,
  Route as RouteIcon,
  Clock,
  Navigation,
  Zap,
  Gauge,
  Timer,
  Activity,
  CheckCircle2,
  Bot,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { Card, CardHeader, Badge, MetricCard } from './ui/Card';

export function EmergencyRoutePanel() {
  const {
    phase,
    rerouted,
    routeCoordinates,
    analyzing,
    heavyTraffic,
    corridor,
    destPoint,
    distanceKm,
    speedKmh,
    setSpeedKmh,
    remainingDistanceKm,
    activeEtaSeconds,
    arrivalClockTime,
    simPace,
    setSimPace,
    progressPercent,
    startRoute,
  } = useSim();

  const [showSpeedControls, setShowSpeedControls] = useState(false);

  const routeStatus =
    phase === 'arrived'
      ? { text: 'ARRIVED', tone: 'green' as const }
      : phase === 'running'
      ? { text: rerouted ? 'REROUTED DETOUR' : 'ACTIVE CORRIDOR', tone: 'green' as const }
      : routeCoordinates && routeCoordinates.length > 0
      ? { text: 'OPTIMIZED', tone: 'blue' as const }
      : analyzing
      ? { text: 'CALCULATING', tone: 'blue' as const }
      : { text: 'STANDBY', tone: 'gray' as const };

  const trafficLabel = heavyTraffic ? 'CONGESTED' : corridor ? 'CLEARED' : 'MODERATE';

  // Format seconds into MM:SS
  const formatStopwatch = (totalSec: number) => {
    if (phase === 'arrived') return { mins: '00', secs: '00' };
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return {
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0'),
    };
  };

  const { mins, secs } = formatStopwatch(activeEtaSeconds);

  // Reasonable urban emergency speeds
  const speedPresets = [
    { label: 'Congested', speed: 22 },
    { label: 'Normal Flow', speed: 34 },
    { label: 'Green Wave', speed: 48 },
    { label: 'Express Priority', speed: 60 },
  ];

  const paceOptions = [
    { label: '1x Smooth', value: 1 },
    { label: '2x Brisk', value: 2 },
    { label: '4x Fast', value: 4 },
  ];

  return (
    <Card id="emergency-route" className="overflow-hidden">
      <CardHeader
        icon={<Siren className="size-5" />}
        title="Emergency Route Operations"
        sub="Live telemetry & clearance coordinator"
        right={
          <Badge tone={routeStatus.tone} dot>
            {routeStatus.text}
          </Badge>
        }
      />

      {/* Primary Estimated Arrival Time (ETA) Live Counter Card */}
      <div className="border-b border-border bg-gradient-to-br from-card via-accent/30 to-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Timer className="size-4 text-primary" />
            <span>Estimated Arrival Time (ETA)</span>
          </div>
          {phase === 'running' ? (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-2 py-0.5 text-[10px] font-extrabold text-accent-foreground">
              <span className="size-2 animate-ping rounded-full bg-primary" />
              LIVE COUNTDOWN
            </span>
          ) : phase === 'arrived' ? (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              DELIVERED
            </span>
          ) : (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              STANDBY
            </span>
          )}
        </div>

        {/* Large Digital Stopwatch Display */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {/* Minutes Box */}
          <div className="flex flex-col items-center">
            <div className="flex min-w-[76px] items-center justify-center rounded-2xl border border-border bg-card px-3 py-2 text-center shadow-inner">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {mins}
              </span>
            </div>
            <span className="mt-1 text-[10px] font-extrabold tracking-widest text-muted-foreground uppercase">
              MINUTES
            </span>
          </div>

          <span className="text-3xl font-black text-primary pb-4 animate-pulse">:</span>

          {/* Seconds Box */}
          <div className="flex flex-col items-center">
            <div className="flex min-w-[76px] items-center justify-center rounded-2xl border border-border bg-card px-3 py-2 text-center shadow-inner">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-primary">
                {secs}
              </span>
            </div>
            <span className="mt-1 text-[10px] font-extrabold tracking-widest text-muted-foreground uppercase">
              SECONDS
            </span>
          </div>
        </div>

        {/* Duration Formula Breakdown based on Active Distance & Speed */}
        <div className="mt-3 rounded-xl border border-border/80 bg-background/80 p-2.5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1 font-semibold">
              <Gauge className="size-3 text-primary" />
              Speed: <b className="text-foreground">{speedKmh} km/h</b>
            </span>
            <span className="flex items-center gap-1 font-semibold">
              <Navigation className="size-3 text-primary" />
              Remaining: <b className="text-foreground">{remainingDistanceKm} km</b>
            </span>
            <span className="flex items-center gap-1 font-semibold">
              <Clock className="size-3 text-primary" />
              Target: <b className="text-foreground font-mono">{arrivalClockTime}</b>
            </span>
          </div>

          {/* Transit Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
              <span>Route Progress</span>
              <span className="font-mono text-primary">{Math.round(progressPercent * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-200 glow-green"
                style={{ width: `${Math.round(progressPercent * 100)}%` }}
              />
            </div>
          </div>

          {/* Formula Explanation */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground">
            <span>
              Model: <code className="font-mono text-foreground font-semibold">{remainingDistanceKm} km @ {speedKmh} km/h + junction buffer</code>
            </span>
            <button
              onClick={() => setShowSpeedControls(!showSpeedControls)}
              className="text-primary font-bold hover:underline cursor-pointer"
            >
              {showSpeedControls ? 'Hide Calibration' : 'Calibrate Speed & Pace'}
            </button>
          </div>
        </div>

        {/* Interactive Speed & Simulation Pace Calibration */}
        {showSpeedControls && (
          <div className="mt-2.5 space-y-2.5 rounded-xl border border-border bg-card p-2.5 text-xs fade-up">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-foreground">
                  Transit Velocity (recalculates realistic ETA):
                </span>
                <span className="text-[10px] font-mono text-primary font-bold">{speedKmh} km/h</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {speedPresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setSpeedKmh(preset.speed)}
                    className={`rounded-lg px-2 py-1.5 text-center text-[11px] font-bold transition cursor-pointer ${
                      speedKmh === preset.speed
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div>{preset.speed} km/h</div>
                    <div className="text-[9px] opacity-80">{preset.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60 pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-foreground">
                  Simulation Playback Pace:
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {simPace === 1 ? 'Realistic ~55s run' : simPace === 2 ? 'Brisk ~28s run' : 'Fast ~14s run'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {paceOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSimPace(opt.value)}
                    className={`rounded-lg px-2 py-1 text-center text-[11px] font-bold transition cursor-pointer ${
                      simPace === opt.value
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Operational Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5 p-4">
        <MetricCard
          label="Unit"
          icon={<Ambulance className="size-3.5" />}
          value="AMBULANCE-01 (ALS)"
        />
        <MetricCard
          label="Hospital Destination"
          icon={<Building2 className="size-3.5" />}
          value={<span className="truncate block" title={destPoint.name}>{destPoint.name}</span>}
        />
        <MetricCard
          label="Corridor Traffic"
          icon={<TrafficCone className="size-3.5" />}
          value={trafficLabel}
          tone={trafficLabel === 'CLEARED' ? 'green' : trafficLabel === 'CONGESTED' ? 'orange' : 'blue'}
        />
        <MetricCard
          label="Corridor State"
          icon={<RouteIcon className="size-3.5" />}
          value={routeStatus.text}
          tone={routeStatus.tone}
        />
        <MetricCard
          label="Total Path"
          icon={<Navigation className="size-3.5" />}
          value={
            <span className="font-mono text-2xl font-bold">
              {distanceKm.toFixed(1)} km
            </span>
          }
        />
        <MetricCard
          label="Active Velocity"
          icon={<Activity className="size-3.5" />}
          value={
            <span className="font-mono text-2xl font-bold text-primary">
              {speedKmh} <span className="text-sm font-normal text-muted-foreground">km/h</span>
            </span>
          }
        />
      </div>

      {/* AI Driver Instruction Teaser */}
      <div className="px-4 pb-3">
        <a
          href="#driver-guidance"
          className="group block rounded-xl border border-primary/30 bg-accent/40 p-3 transition hover:border-primary/60 hover:bg-accent/60"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-primary">
            <span className="flex items-center gap-1.5">
              <Bot className="size-3.5" />
              <span>AI Driver Copilot Guidance</span>
            </span>
            <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>View HUD</span>
              <ArrowRight className="size-3" />
            </span>
          </div>
          <p className="mt-1.5 text-xs font-semibold text-foreground line-clamp-2">
            {rerouted
              ? 'Detour active: execute safe maneuver onto bypass arterial.'
              : corridor
              ? `Hold center corridor at ${speedKmh} km/h. Automated Green Wave engaged.`
              : `Defensive emergency heading toward ${destPoint.name}. Siren active.`}
          </p>
        </a>
      </div>

      {/* Dispatch Trigger Button */}
      <div className="px-4 pb-4">
        <button
          onClick={startRoute}
          disabled={phase === 'running'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-base font-extrabold tracking-wide text-primary-foreground shadow-soft transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          <Zap className="size-5" />
          {phase === 'running'
            ? 'AMBULANCE EN ROUTE'
            : phase === 'arrived'
            ? 'PATIENT TRANSFERRED — RESET'
            : 'ENGAGE EMERGENCY CORRIDOR'}
        </button>
      </div>
    </Card>
  );
}
