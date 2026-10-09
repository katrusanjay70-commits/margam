import { Bell, Siren, TriangleAlert, Info, Octagon, CircleCheck } from 'lucide-react';
import { useSim, AlertLevel } from '../context/SimulationContext';
import { Card, CardHeader, Badge } from './ui/Card';
import { cn } from '../lib/utils';

const levelMeta: Record<
  AlertLevel,
  {
    tone: 'red' | 'orange' | 'blue' | 'green';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  critical: { tone: 'red', label: 'Critical', icon: Siren },
  warning: { tone: 'orange', label: 'Warning', icon: TriangleAlert },
  info: { tone: 'blue', label: 'Info', icon: Info },
  blockage: { tone: 'red', label: 'Road blockage', icon: Octagon },
  success: { tone: 'green', label: 'Success', icon: CircleCheck },
};

export function EmergencyAlerts() {
  const { alerts } = useSim();

  return (
    <Card>
      <CardHeader
        icon={<Bell className="size-5" />}
        title="Emergency Alerts"
        right={<Badge tone="gray">{alerts.length}</Badge>}
      />

      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {alerts.map((item) => {
          const meta = levelMeta[item.level] || levelMeta.info;
          const Icon = meta.icon;

          return (
            <li key={item.id} className="fade-up flex gap-3 px-5 py-3">
              <Icon
                className={cn(
                  'mt-0.5 size-5 shrink-0',
                  meta.tone === 'red'
                    ? 'text-destructive'
                    : meta.tone === 'orange'
                    ? 'text-warning'
                    : meta.tone === 'green'
                    ? 'text-primary'
                    : 'text-info'
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{item.time}</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
