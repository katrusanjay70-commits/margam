import { useSim } from '../context/SimulationContext';
import { cn } from '../lib/utils';

const workflowSteps = [
  'Start Emergency',
  'Find Smart Route',
  'Green Corridor',
  'Road Blockage',
  'Auto Reroute',
  'Arrived',
];

export function WorkflowProgressBar() {
  const { phase, rerouted, blocked, corridor, routeCoordinates } = useSim();

  const activeIndex =
    phase === 'arrived'
      ? 6
      : rerouted
      ? 5
      : blocked
      ? 4
      : corridor
      ? 3
      : routeCoordinates && routeCoordinates.length > 0
      ? 2
      : phase === 'idle'
      ? 0
      : 1;

  return (
    <ol className="flex flex-wrap gap-2">
      {workflowSteps.map((step, idx) => {
        const isCompleted = idx < activeIndex;
        const isCurrent = idx === activeIndex;

        return (
          <li
            key={step}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200',
              isCompleted
                ? 'border-primary/40 bg-accent text-accent-foreground'
                : isCurrent
                ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground'
            )}
          >
            <span className="font-mono text-xs">
              {isCompleted ? '✓' : idx + 1}
            </span>
            <span>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
