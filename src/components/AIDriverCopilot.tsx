import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Compass,
  AlertTriangle,
  HeartPulse,
  Navigation,
  RefreshCw,
  Radio,
  Send,
  Loader2,
  ShieldAlert,
  ArrowRight,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  CheckCircle2,
  Mic,
  MicOff,
  Gauge,
  Bot,
  Zap,
  Building2,
  Activity,
  Car,
} from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { Card, CardHeader, Badge } from './ui/Card';

export interface TurnInstruction {
  instruction: string;
  distance: string;
  action: 'depart' | 'straight' | 'turn-left' | 'turn-right' | 'detour' | 'arrive';
}

export interface DriverGuidance {
  primaryDirective: string;
  speedAdvisory: string;
  lanePositioning: string;
  hazardAlert: string;
  patientStabilityNote: string;
  spokenCallout: string;
  turnInstructions?: TurnInstruction[];
  driverAnswer?: string;
}

export function AIDriverCopilot() {
  const {
    startPoint,
    destPoint,
    distanceKm,
    remainingDistanceKm,
    speedKmh,
    etaMin,
    corridor,
    heavyTraffic,
    blocked,
    phase,
    progressPercent,
    soundEnabled,
  } = useSim();

  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [source, setSource] = useState<'gemini' | 'local_engine'>('local_engine');
  const [driverQuery, setDriverQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [guidance, setGuidance] = useState<DriverGuidance>({
    primaryDirective: corridor
      ? `Hold center corridor at ${speedKmh} km/h. Traffic signals ahead preempted green to ${destPoint.name}.`
      : `Proceed defensively on main arterial toward ${destPoint.name}. Siren engaged.`,
    speedAdvisory: `Optimal emergency transit at ${speedKmh} km/h. Green wave active.`,
    lanePositioning: 'Maintain center-left lane for maximum emergency clearance.',
    hazardAlert: heavyTraffic
      ? 'High congestion approaching flyover; watch for civilian vehicles yielding to right.'
      : 'All primary intersections clear. Continue on active heading.',
    patientStabilityNote: 'Maintain smooth linear braking on turns to protect trauma patient IV lines.',
    spokenCallout: `Driver directive: Proceed along active corridor to ${destPoint.name}. Maintain ${speedKmh} kilometers per hour.`,
    turnInstructions: [
      {
        instruction: `Depart origin from ${startPoint.name} with emergency lights active`,
        distance: '200m',
        action: 'depart',
      },
      {
        instruction: 'Pass through Signal Node S-1 with preemption active',
        distance: '850m',
        action: 'straight',
      },
      {
        instruction: 'Maintain corridor alignment through automated Green Wave zone',
        distance: '1.4 km',
        action: 'straight',
      },
      {
        instruction: `Arrive at ${destPoint.name} Trauma Intake Bay 2`,
        distance: '300m',
        action: 'arrive',
      },
    ],
  });

  const [guidanceLog, setGuidanceLog] = useState<Array<{ time: string; text: string; tag: string }>>([
    {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Tactical route established from ${startPoint.name} to ${destPoint.name}.`,
      tag: 'SYSTEM START',
    },
  ]);

  // Voice speech synthesis synthesizer for hands-free audio announcements
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio synthesis fallback
    }
  };

  const fetchDriverGuidance = async (queryType: string = 'tactical_briefing', customQuestion?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/driver-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: startPoint.name,
          destination: destPoint.name,
          distanceKm,
          remainingDistanceKm,
          speedKmh,
          etaMin,
          corridorActive: corridor,
          heavyTraffic,
          blocked,
          queryType,
          driverQuestion: customQuestion,
          currentPhase: phase,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.guidance) {
          setGuidance(data.guidance);
          setSource(data.source || 'gemini');

          const logText = customQuestion && data.guidance.driverAnswer
            ? `Q: "${customQuestion}" → ${data.guidance.driverAnswer}`
            : data.guidance.primaryDirective;

          setGuidanceLog((prev) => [
            {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: logText,
              tag: customQuestion
                ? 'DRIVER Q&A'
                : blocked
                ? 'DETOUR ADVISORY'
                : corridor
                ? 'GREEN CORRIDOR'
                : 'TACTICAL BRIEF',
            },
            ...prev.slice(0, 6),
          ]);

          if (voiceEnabled) {
            const callout = customQuestion && data.guidance.driverAnswer
              ? data.guidance.driverAnswer
              : data.guidance.spokenCallout || data.guidance.primaryDirective;
            speakText(callout);
          }
        }
      }
    } catch (err) {
      console.warn('Driver guidance request fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle custom driver query submit
  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverQuery.trim() || loading) return;
    const q = driverQuery.trim();
    setDriverQuery('');
    fetchDriverGuidance('driver_inquiry', q);
  };

  // Speech recognition for hands-free driver microphone input
  const handleToggleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please type your query in the cockpit box.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setDriverQuery(transcript);
          fetchDriverGuidance('driver_voice_query', transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Voice recognition error:', e);
      setIsListening(false);
    }
  };

  // Automatically refresh tactical guidance when key route events happen
  const prevBlockedRef = useRef(blocked);
  const prevCorridorRef = useRef(corridor);
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (
      prevBlockedRef.current !== blocked ||
      prevCorridorRef.current !== corridor ||
      prevPhaseRef.current !== phase
    ) {
      prevBlockedRef.current = blocked;
      prevCorridorRef.current = corridor;
      prevPhaseRef.current = phase;

      const reason = blocked
        ? 'road_incident_detour'
        : phase === 'arrived'
        ? 'arrival_bay_intake'
        : corridor
        ? 'corridor_update'
        : 'phase_change';

      fetchDriverGuidance(reason);
    }
  }, [blocked, corridor, phase]);

  // Determine active step index based on journey progress
  const steps = guidance.turnInstructions || [];
  const activeStepIdx = Math.min(
    steps.length - 1,
    Math.floor(progressPercent * steps.length)
  );

  return (
    <Card id="driver-guidance" className="overflow-hidden border-primary/30 shadow-md">
      <CardHeader
        icon={<Bot className="size-5 text-primary" />}
        title="AI Driver Instruction & Tactical Copilot"
        sub="In-cockpit real-time emergency navigation directives & voice dispatch"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {/* Hands-Free Voice Dispatch Switcher */}
            <button
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (next) speakText(guidance.spokenCallout);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                voiceEnabled
                  ? 'border-primary/40 bg-accent text-accent-foreground shadow-xs'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
              title={voiceEnabled ? 'Mute voice instructions' : 'Enable hands-free verbal announcements'}
            >
              {voiceEnabled ? <Volume2 className="size-3.5 text-primary" /> : <VolumeX className="size-3.5" />}
              <span>{voiceEnabled ? 'Voice Dispatch: ON' : 'Voice Dispatch: OFF'}</span>
            </button>
            <Badge tone={source === 'gemini' ? 'blue' : 'green'}>
              {source === 'gemini' ? 'Gemini 3.8 Flash' : 'Tactical Edge Engine'}
            </Badge>
          </div>
        }
      />

      <div className="p-5 space-y-5">
        {/* Primary Driver Command HUD Banner */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-gradient-to-r from-accent/90 via-card to-accent/40 p-5 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Navigation className="size-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                    PRIMARY DRIVER DIRECTIVE
                  </span>
                  {phase === 'running' && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 animate-ping rounded-full bg-emerald-500" />
                      LIVE HUD
                    </span>
                  )}
                  {blocked && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-3" />
                      DETOUR ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
                  {guidance.primaryDirective}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-start">
              <button
                onClick={() => fetchDriverGuidance('manual_refresh')}
                disabled={loading}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs transition hover:bg-muted disabled:opacity-50 cursor-pointer"
                title="Refresh AI Driver Instructions"
              >
                <RefreshCw className={`size-4.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* Audio Announcement Quick Play Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-primary/20 pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
              <Radio className="size-3.5 text-primary shrink-0 animate-pulse" />
              <span>“{guidance.spokenCallout}”</span>
            </div>
            <button
              onClick={() => speakText(guidance.spokenCallout)}
              className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-xs hover:bg-muted cursor-pointer"
            >
              <Volume2 className="size-3.5 text-primary" />
              Speak Callout
            </button>
          </div>
        </div>

        {/* Turn-by-Turn Navigational Maneuvers for the Driver */}
        {steps.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                <h4 className="text-sm font-extrabold text-foreground">
                  Turn-by-Turn Emergency Navigation Maneuvers
                </h4>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {steps.length} sequential waypoints
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {steps.map((step, idx) => {
                const isActive = idx === activeStepIdx;
                const isPassed = idx < activeStepIdx;

                const getIcon = () => {
                  switch (step.action) {
                    case 'depart':
                      return <Zap className="size-4 text-primary" />;
                    case 'turn-left':
                      return <CornerUpLeft className="size-4 text-blue-500" />;
                    case 'turn-right':
                      return <CornerUpRight className="size-4 text-blue-500" />;
                    case 'detour':
                      return <AlertTriangle className="size-4 text-amber-500" />;
                    case 'arrive':
                      return <Building2 className="size-4 text-emerald-500" />;
                    default:
                      return <ArrowUp className="size-4 text-primary" />;
                  }
                };

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-3 rounded-xl p-3 border transition-all ${
                      isActive
                        ? 'border-primary bg-accent/60 shadow-xs'
                        : isPassed
                        ? 'border-border/40 bg-muted/30 opacity-70'
                        : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-black'
                            : isPassed
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-card border border-border text-foreground'
                        }`}
                      >
                        {getIcon()}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold leading-snug truncate sm:whitespace-normal ${
                            isActive ? 'text-foreground font-extrabold' : 'text-foreground/90'
                          }`}
                        >
                          {step.instruction}
                        </p>
                        {isActive && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                            CURRENT MANEUVER
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {step.distance}
                      </span>
                      <button
                        onClick={() => speakText(step.instruction)}
                        title="Speak this instruction"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Volume2 className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4-Card Tactical Cockpit Telemetry Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Speed Advisory */}
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Gauge className="size-4 text-primary" />
              <span>Speed Advisory</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground leading-relaxed">
              {guidance.speedAdvisory}
            </p>
          </div>

          {/* Lane Positioning */}
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Compass className="size-4 text-primary" />
              <span>Lane Positioning</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground leading-relaxed">
              {guidance.lanePositioning}
            </p>
          </div>

          {/* Road Hazard Warning */}
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
              <AlertTriangle className="size-4" />
              <span>Choke-Point / Hazard</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground leading-relaxed">
              {guidance.hazardAlert}
            </p>
          </div>

          {/* Patient Comfort & G-force Protocol */}
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
              <HeartPulse className="size-4" />
              <span>Patient Transit Protocol</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground leading-relaxed">
              {guidance.patientStabilityNote}
            </p>
          </div>
        </div>

        {/* Two-Way Driver Radio / Copilot Direct Intercom */}
        <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-background p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-primary" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                Driver Tactical Radio Intercom (Gemini Copilot)
              </h4>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Voice or instant text input
            </span>
          </div>

          {/* Query input form */}
          <form onSubmit={handleQuerySubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={driverQuery}
                onChange={(e) => setDriverQuery(e.target.value)}
                placeholder="Ask Copilot (e.g. 'Is Signal S-2 green?', 'Recommend smoothest lane', 'Check detour time')..."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="button"
              onClick={handleToggleVoiceInput}
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer ${
                isListening
                  ? 'border-rose-500 bg-rose-500 text-white animate-pulse'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
              title={isListening ? 'Stop listening' : 'Press to speak query'}
            >
              {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>

            <button
              type="submit"
              disabled={loading || !driverQuery.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:brightness-105 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              <span className="hidden sm:inline">Transmit</span>
            </button>
          </form>

          {/* Quick Driver Action Buttons */}
          <div className="pt-1">
            <p className="text-[11px] font-bold text-muted-foreground mb-1.5">
              Instant Cockpit Tactical Queries:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '🎙️ Situational Briefing', q: 'full_briefing' },
                { label: '🚦 Scan Signal Preemption', q: 'intersection_hazards' },
                { label: '⚠️ Check Alternate Bypass Detour', q: 'detour_eval' },
                { label: '🏥 Trauma Bay Intake Readiness', q: 'bay_readiness' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => fetchDriverGuidance(btn.q)}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="size-3 animate-spin text-primary" /> : null}
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chronological Directives Log */}
        {guidanceLog.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Recent Cockpit Audio & Directives History:
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {guidanceLog.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-lg bg-card p-2.5 border border-border/70"
                >
                  <span className="font-semibold text-foreground truncate flex-1">
                    {item.text}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                      {item.tag}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {item.time}
                    </span>
                    <button
                      onClick={() => speakText(item.text)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Speak log item"
                    >
                      <Volume2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
