import { CircleCheck, OctagonAlert, Info } from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { cn } from '../lib/utils';

export function StatusBanner() {
  const { banner } = useSim();

  if (!banner) return null;

  const Icon =
    banner.tone === 'success' ? CircleCheck : banner.tone === 'danger' ? OctagonAlert : Info;

  return (
    <div
      role="status"
      className={cn(
        'fade-up flex items-center gap-3 rounded-xl border px-4 py-3 text-base font-bold shadow-soft transition-all duration-300',
        banner.tone === 'success' && 'border-primary/40 bg-accent text-accent-foreground',
        banner.tone === 'danger' && 'border-destructive/40 bg-destructive/10 text-destructive',
        banner.tone === 'info' && 'border-info/30 bg-info/10 text-info'
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span>{banner.text}</span>
    </div>
  );
}
