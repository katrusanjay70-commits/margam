import { Play, Siren, TrafficCone, Ban, Sparkles, Waypoints, RotateCcw, CircleCheck } from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { Card, CardHeader } from './ui/Card';
import { cn } from '../lib/utils';

export function SimulationControls() {
  const {
    phase,
    heavyTraffic,
    blocked,
    corridor,
    startEmergency,
    simulateTraffic,
    createBlockage,
    optimizeRoute,
    activateCorridor,
    reset,
  } = useSim();

  const buttons = [
    {
      label: 'Dispatch Emergency',
      icon: Siren,
      onClick: startEmergency,
      done: phase !== 'idle',
      cls: 'bg-destructive text-destructive-foreground hover:brightness-110',
    },
    {
      label: 'Toggle Congestion',
      icon: TrafficCone,
      onClick: simulateTraffic,
      done: heavyTraffic,
      cls: 'bg-warning text-warning-foreground hover:brightness-105',
    },
    {
      label: 'Report Road Blockage',
      icon: Ban,
      onClick: createBlockage,
      done: blocked,
      cls: 'bg-secondary text-secondary-foreground hover:opacity-90',
    },
    {
      label: 'Optimize / Detour',
      icon: Sparkles,
      onClick: optimizeRoute,
      done: false,
      cls: 'bg-info text-primary-foreground hover:brightness-110',
    },
    {
      label: 'Preempt Green Corridor',
      icon: Waypoints,
      onClick: activateCorridor,
      done: corridor,
      cls: 'bg-primary text-primary-foreground hover:brightness-105',
    },
    {
      label: 'Reset Dispatch',
      icon: RotateCcw,
      onClick: reset,
      done: false,
      cls: 'border border-border bg-card text-foreground hover:bg-muted',
    },
  ];

  return (
    <Card id="simulation">
      <CardHeader
        icon={<Play className="size-5" />}
        title="Emergency Operations Console"
        sub="Test live dispatch, incident handling & signal preemption"
      />

      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3">
        {buttons.map((b) => {
          const Icon = b.icon;
          return (
            <button
              key={b.label}
              onClick={b.onClick}
              className={cn(
                'relative flex flex-col items-center justify-center gap-2 rounded-xl p-3.5 text-center text-xs font-bold shadow-sm transition active:scale-[0.98] cursor-pointer',
                b.cls
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="leading-tight">{b.label}</span>
              {b.done && (
                <CircleCheck className="absolute right-2 top-2 size-4 opacity-80" />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
