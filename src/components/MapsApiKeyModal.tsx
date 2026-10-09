import { useState } from 'react';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Layers,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useMapsApiKey, validateMapsApiKey } from '../services/mapApiKey';

interface MapsApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOsm?: () => void;
}

export function MapsApiKeyModal({ isOpen, onClose, onSelectOsm }: MapsApiKeyModalProps) {
  const { apiKey, hasKey, setKey, clearKey } = useMapsApiKey();
  const [inputKey, setInputKey] = useState(apiKey);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputKey.trim();

    if (!trimmed) {
      clearKey();
      setFeedback({ type: 'info', message: 'API key cleared. Using OpenStreetMap engine.' });
      return;
    }

    setTesting(true);
    setFeedback(null);

    const result = await validateMapsApiKey(trimmed);
    setTesting(false);

    if (result.valid) {
      setKey(trimmed);
      setFeedback({
        type: 'success',
        message: 'Google Maps API Key verified and saved successfully! Live Maps & Traffic are now enabled.',
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setFeedback({
        type: 'error',
        message: result.message || 'Verification failed. Please check the key and Google Cloud billing.',
      });
    }
  };

  const handleClear = () => {
    clearKey();
    setInputKey('');
    setFeedback({ type: 'info', message: 'API key removed. Map defaulted to OpenStreetMap.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Google Maps Platform API Key</h2>
            <p className="text-xs text-muted-foreground">
              Configure your API key to activate Google Maps & live traffic routing
            </p>
          </div>
        </div>

        {/* Active Key Status Badge */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-muted-foreground">Current Status:</span>
          {hasKey ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
              API Key Configured & Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-4" />
              No Google Maps Key (Using OpenStreetMap)
            </span>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Google Maps API Key (Maps JS & Routes API)
            </label>
            <div className="mt-1.5 relative">
              <input
                type="text"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Requires <strong>Maps JavaScript API</strong> and <strong>Routes API</strong> enabled in your Google Cloud Console.
            </p>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs font-semibold ${
                feedback.type === 'success'
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : feedback.type === 'error'
                  ? 'border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                  : 'border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
              ) : (
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              {hasKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-500/10 cursor-pointer"
                  title="Remove saved API key"
                >
                  <Trash2 className="size-3.5" />
                  Remove Key
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={testing}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {testing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Testing Key…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Save & Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Free OpenStreetMap Alternative Note */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Don't have an API key?</span>
            <button
              type="button"
              onClick={() => {
                if (onSelectOsm) onSelectOsm();
                onClose();
              }}
              className="flex items-center gap-1.5 font-bold text-primary hover:underline cursor-pointer"
            >
              <Layers className="size-3.5" />
              Use Free OpenStreetMap Engine
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            OpenStreetMap requires no API key or billing, with 3 high-res satellite and street tile layers.
          </p>
        </div>

        {/* Link to Google Cloud Console */}
        <div className="mt-3 text-center">
          <a
            href="https://console.cloud.google.com/google/maps-apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            <span>Get an API key from Google Cloud Console</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
