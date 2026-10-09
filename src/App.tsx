/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationProvider } from './context/SimulationContext';
import { Header } from './components/Header';
import { StatusBanner } from './components/StatusBanner';
import { WorkflowProgressBar } from './components/WorkflowProgressBar';
import { LiveCityMap } from './components/LiveCityMap';
import { EmergencyRoutePanel } from './components/EmergencyRoutePanel';
import { StartEmergencyForm } from './components/StartEmergencyForm';
import { SimulationControls } from './components/SimulationControls';
import { EmergencyAlerts } from './components/EmergencyAlerts';
import { VehicleTelemetry } from './components/VehicleTelemetry';
import { LiveTrafficVision } from './components/LiveTrafficVision';
import { AIDriverCopilot } from './components/AIDriverCopilot';
import { SectionHeader } from './components/ui/Card';

function MainContent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-7xl space-y-14 px-4 pb-20 pt-6 sm:px-6">
        {/* Section: Dashboard & Main Overview */}
        <section id="dashboard" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-[0.08em] text-foreground sm:text-5xl">
                MARGAM
              </h1>
              <p className="mt-1 text-xl font-bold text-primary sm:text-2xl">
                The Smarter Path to Every Emergency.
              </p>
              <p className="mt-1 text-base text-muted-foreground">
                Real-world GPS street mapping, dynamic green signal corridors, and instant incident rerouting.
              </p>
            </div>
            <WorkflowProgressBar />
          </div>

          <StatusBanner />

          {/* Real Map + Route & Simulation Controls */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="order-2 lg:order-1">
              <LiveCityMap />
            </div>
            <div className="order-1 space-y-5 lg:order-2">
              <EmergencyRoutePanel />
              <SimulationControls />
            </div>
          </div>

          {/* Route Planning Form + Live Alerts Feed */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <StartEmergencyForm />
            <div className="space-y-5">
              <EmergencyAlerts />
            </div>
          </div>
        </section>

        {/* Section: AI Driver Instruction & Tactical Copilot */}
        <section id="driver-guidance" className="space-y-4">
          <SectionHeader
            eyebrow="Emergency Vehicle Cockpit"
            title="AI Driver Instruction & Tactical Copilot"
            desc="Live turn-by-turn maneuvers, verbal dispatch audio callouts, and medical transit telemetry powered by Gemini 3.8 Flash."
          />
          <AIDriverCopilot />
        </section>

        {/* Section: Traffic Intelligence & Vision */}
        <section id="traffic-intelligence" className="space-y-5">
          <SectionHeader
            eyebrow="Corridor Analytics"
            title="Traffic Intelligence & Vision"
            desc="Optical vehicle flow monitoring and congestion telemetry along arterial road links."
          />
          <VehicleTelemetry />
          <LiveTrafficVision />
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        MARGAM · Intelligent Traffic & Emergency Response Network · Connected to Real-World Road Infrastructure
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <MainContent />
    </SimulationProvider>
  );
}
