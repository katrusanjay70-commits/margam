import { useState } from 'react';
import {
  MapPin,
  Navigation,
  LoaderCircle,
  CircleCheck,
  Search,
  Building2,
  ArrowUpDown,
  Milestone,
  Compass,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { Card, CardHeader } from './ui/Card';
import { searchAddressOSM } from '../services/routingService';

const selectClass =
  'mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export function StartEmergencyForm() {
  const {
    currentCity,
    startPoint,
    destPoint,
    analyzing,
    routeCoordinates,
    routeSteps,
    signalsOnRoute,
    corridor,
    blocked,
    distanceKm,
    etaMin,
    phase,
    setStartPoint,
    setDestPoint,
    swapDirection,
    setDirection,
    startRoute,
  } = useSim();

  const [emergencyType, setEmergencyType] = useState('Ambulance');
  const [priority, setPriority] = useState('Critical');
  const [showSteps, setShowSteps] = useState(false);

  // Address search query states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchAddressOSM(`${searchQuery}, ${currentCity.name}`);
    setSearchResults(results);
    setIsSearching(false);
  };

  const hasRoute = !!routeCoordinates && routeCoordinates.length > 0;

  return (
    <Card>
      <CardHeader
        icon={<Compass className="size-5" />}
        title="Emergency Routing & Set Direction"
        sub="Compute and customize real road transit directions"
      />

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="space-y-3">
          {/* Origin and Destination with Swap button */}
          <div className="relative space-y-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Origin Station
              </label>
              <select
                className={selectClass}
                value={startPoint.id}
                onChange={(e) => {
                  const found = currentCity.origins.find((o) => o.id === e.target.value);
                  if (found) setStartPoint(found);
                }}
              >
                {currentCity.origins.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
                {!currentCity.origins.some((o) => o.id === startPoint.id) && (
                  <option value={startPoint.id}>{startPoint.name} (Custom Pin)</option>
                )}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={swapDirection}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground cursor-pointer"
                title="Swap Direction"
              >
                <ArrowUpDown className="size-3 text-primary" />
                <span>Swap Direction</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Destination Hospital / Trauma Center
              </label>
              <select
                className={selectClass}
                value={destPoint.id}
                onChange={(e) => {
                  const found = currentCity.hospitals.find((h) => h.id === e.target.value);
                  if (found) setDestPoint(found);
                }}
              >
                {currentCity.hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                {!currentCity.hospitals.some((h) => h.id === destPoint.id) && (
                  <option value={destPoint.id}>{destPoint.name} (Custom Pin)</option>
                )}
              </select>
            </div>
          </div>

          {/* Quick Search Geocoder */}
          <form onSubmit={handleSearch} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Search custom street/address in ${currentCity.name}…`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:opacity-90 cursor-pointer"
              >
                {isSearching ? '…' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setStartPoint({
                        id: `search-${Date.now()}`,
                        name: res.name,
                        lat: res.lat,
                        lng: res.lng,
                        type: 'origin',
                      });
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    className="block w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    {res.name}
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Vehicle and Priority */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Emergency Vehicle
              <select
                className={selectClass}
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
              >
                <option>Ambulance (ALS)</option>
                <option>Trauma Response Unit</option>
                <option>Fire Engine</option>
                <option>Police Escort</option>
              </select>
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Priority Tier
              <select
                className={selectClass}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option>Critical (Code Red)</option>
                <option>High (Code Amber)</option>
                <option>Standard Response</option>
              </select>
            </label>
          </div>

          {/* Explicit Set Direction Action Button */}
          <button
            onClick={() => setDirection(startPoint, destPoint)}
            disabled={analyzing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3.5 text-sm font-bold text-secondary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {analyzing ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Navigation className="size-5 text-primary" />
            )}
            {analyzing ? 'COMPUTING DIRECTION…' : 'SET DIRECTION & RECALCULATE'}
          </button>
        </div>

        {/* Right Preview Card */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-background/60 p-4">
          {hasRoute ? (
            <div className="fade-up space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <CircleCheck className="size-5" />
                  <span className="text-xs font-extrabold uppercase tracking-wide">
                    Direction Active
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {routeSteps.length} Turns
                </span>
              </div>

              <div className="rounded-lg bg-card p-2.5 text-xs text-muted-foreground">
                <div className="font-bold text-foreground truncate">
                  <span className="text-blue-600 font-extrabold mr-1">FROM:</span>
                  {startPoint.name}
                </div>
                <div className="font-bold text-foreground truncate mt-1">
                  <span className="text-red-600 font-extrabold mr-1">TO:</span>
                  {destPoint.name}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Total Distance', `${distanceKm} km`],
                  ['Travel Time', `${String(etaMin).padStart(2, '0')} min`],
                  ['Signal Preemption', corridor ? 'Active Green' : 'Standby'],
                  ['Road Status', blocked ? 'Detour Active' : 'Clear'],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-lg bg-card p-2">
                    <dt className="text-[10px] text-muted-foreground font-semibold">{label}</dt>
                    <dd className="font-mono text-sm font-bold text-foreground">{val}</dd>
                  </div>
                ))}
              </dl>

              {/* Turn-by-Turn Expandable Steps */}
              {routeSteps.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowSteps(!showSteps)}
                    className="flex w-full items-center justify-between font-bold text-foreground cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Milestone className="size-3.5 text-primary" />
                      Turn-by-Turn Directions ({routeSteps.length} steps)
                    </span>
                    {showSteps ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>

                  {showSteps ? (
                    <ol className="mt-2 max-h-36 divide-y divide-border overflow-y-auto pr-1 text-[11px] text-muted-foreground space-y-1">
                      {routeSteps.map((step, idx) => (
                        <li key={idx} className="pt-1.5 pb-1 flex items-start gap-1.5">
                          <span className="font-mono font-bold text-primary shrink-0">{idx + 1}.</span>
                          <span className="flex-1">{step.instruction}</span>
                          <span className="font-mono text-[10px] shrink-0 text-foreground">
                            {step.distanceMeters > 1000
                              ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                              : `${step.distanceMeters} m`}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1 text-muted-foreground truncate text-[11px]">
                      {routeSteps[0]?.instruction || 'Proceed onto main arterial'}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={startRoute}
                disabled={phase === 'running'}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-soft transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {phase === 'running' ? 'AMBULANCE EN ROUTE' : 'DISPATCH AMBULANCE ON THIS DIRECTION'}
              </button>
            </div>
          ) : (
            <div className="grid h-full place-items-center py-6 text-center">
              <div>
                <Building2 className="mx-auto size-9 text-muted-foreground opacity-60" />
                <p className="mt-2 text-sm font-bold text-foreground">
                  Computing initial direction…
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
