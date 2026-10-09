import { useState } from 'react';
import { Menu, X, Volume2, VolumeX, KeyRound } from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { MapsApiKeyModal } from './MapsApiKeyModal';
import { useMapsApiKey } from '../services/mapApiKey';

const navItems = [
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#live-map', label: 'Live Map' },
  { href: '#emergency-route', label: 'Emergency Route' },
  { href: '#driver-guidance', label: 'AI Driver Copilot' },
  { href: '#traffic-intelligence', label: 'Traffic Intelligence' },
  { href: '#simulation', label: 'Simulation' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const { soundEnabled, setSoundEnabled } = useSim();
  const { hasKey } = useMapsApiKey();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#dashboard" className="flex items-center gap-2.5">
          <img
            src="/assets/margam-logo-CRuc3LF_.png"
            alt="MARGAM logo"
            width={36}
            height={36}
            className="size-9 rounded-lg object-contain shadow-sm"
          />
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-[0.12em] text-foreground">MARGAM</div>
            <div className="hidden text-[11px] font-medium text-muted-foreground sm:block">
              Intelligent Traffic & Emergency Response
            </div>
          </div>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="size-3.5 text-primary" />
                <span className="hidden sm:inline">Audio On</span>
              </>
            ) : (
              <>
                <VolumeX className="size-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Audio Muted</span>
              </>
            )}
          </button>

          {/* Maps API Key Button */}
          <button
            onClick={() => setApiKeyModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              hasKey
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Configure Google Maps API Key"
          >
            <KeyRound className="size-3.5" />
            <span className="hidden sm:inline">{hasKey ? 'Maps API: Active' : 'Maps API'}</span>
          </button>

          {/* System Status */}
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span>SYSTEM ONLINE</span>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-3 lg:hidden">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-3 text-base font-semibold text-foreground hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* API Key Modal */}
      <MapsApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />
    </header>
  );
}
