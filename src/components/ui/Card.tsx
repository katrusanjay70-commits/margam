import React from 'react';
import { cn } from '../../lib/utils';

export function Card({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-2xl border border-border bg-card shadow-soft transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  right,
  sub,
}: {
  icon?: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
          {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export type BadgeTone = 'green' | 'red' | 'orange' | 'blue' | 'gray' | 'navy';

const badgeToneStyles: Record<BadgeTone, string> = {
  green: 'bg-accent text-accent-foreground border-primary/30',
  red: 'bg-destructive/10 text-destructive border-destructive/30',
  orange: 'bg-warning/15 text-warning-foreground border-warning/40',
  blue: 'bg-info/10 text-info border-info/30',
  gray: 'bg-muted text-muted-foreground border-border',
  navy: 'bg-secondary text-secondary-foreground border-secondary',
};

export function Badge({
  tone = 'gray',
  children,
  dot,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
        badgeToneStyles[tone]
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-6 max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {desc && <p className="mt-2 text-base text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  tone?: BadgeTone;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-foreground">
        {tone ? <Badge tone={tone}>{value}</Badge> : value}
      </div>
    </div>
  );
}
