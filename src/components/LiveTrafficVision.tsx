import { Camera } from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { Card, CardHeader, Badge } from './ui/Card';

const visionDetections = [
  { x: 70, y: 150, w: 54, h: 30, label: 'SEDAN 98%', kind: 'car' },
  { x: 270, y: 182, w: 54, h: 30, label: 'SUV 97%', kind: 'car' },
  { x: 190, y: 40, w: 22, h: 34, label: 'MOTO 95%', kind: 'bike' },
  { x: 330, y: 138, w: 86, h: 34, label: 'TRANSIT BUS 96%', kind: 'bus' },
  { x: 176, y: 230, w: 30, h: 52, label: 'VAN 94%', kind: 'carv' },
];

export function LiveTrafficVision() {
  const { currentCity } = useSim();

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<Camera className="size-5" />}
        title="Live Traffic Vision Stream"
        sub={`Active CCTV Feed · ${currentCity.name} Central Arterial`}
        right={
          <Badge tone="green" dot>
            LIVE · 30 FPS
          </Badge>
        }
      />

      <div className="relative bg-slate-950">
        <svg viewBox="0 0 460 300" className="block w-full select-none" role="img" aria-label="Camera detection view">
          {/* Street asphalt base */}
          <rect width={460} height={300} fill="#0f172a" />
          {/* Horizontal road lane */}
          <rect x={0} y={130} width={460} height={95} fill="#334155" opacity={0.6} />
          {/* Vertical road lane */}
          <rect x={160} y={0} width={70} height={300} fill="#334155" opacity={0.6} />

          {/* Lane markings */}
          <line
            x1={0}
            y1={177}
            x2={460}
            y2={177}
            stroke="#fbbf24"
            strokeDasharray="12 10"
            strokeWidth={2}
            opacity={0.8}
          />
          <line
            x1={195}
            y1={0}
            x2={195}
            y2={300}
            stroke="#ffffff"
            strokeDasharray="12 10"
            strokeWidth={2}
            opacity={0.6}
          />

          {/* YOLO-style bounding boxes */}
          {visionDetections.map((det) => {
            const vehicleColor =
              det.kind === 'bus'
                ? '#f59e0b'
                : det.kind === 'bike'
                ? '#e2e8f0'
                : '#38bdf8';

            return (
              <g key={det.label + det.x}>
                {/* Vehicle silhouette */}
                <rect
                  x={det.x + 3}
                  y={det.y + 3}
                  width={det.w - 6}
                  height={det.h - 6}
                  rx={4}
                  fill={vehicleColor}
                  opacity={0.9}
                />
                {/* Bounding box outline */}
                <rect
                  x={det.x}
                  y={det.y}
                  width={det.w}
                  height={det.h}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={2}
                />
                {/* Label badge */}
                <rect
                  x={det.x}
                  y={det.y - 16}
                  width={det.label.length * 6.6 + 8}
                  height={16}
                  fill="#34d399"
                />
                <text
                  x={det.x + 4}
                  y={det.y - 4}
                  fontSize={10}
                  fontWeight={800}
                  fill="#0f172a"
                  fontFamily="monospace"
                >
                  {det.label}
                </text>
              </g>
            );
          })}

          {/* Live Recording HUD badge */}
          <circle cx={20} cy={20} r={5} fill="#ef4444">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <text
            x={32}
            y={24}
            fontSize={12}
            fontWeight={700}
            fill="#ffffff"
            fontFamily="monospace"
          >
            REC · {currentCity.name.toUpperCase()}-CAM-01
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>Optical density estimation with automated clearance verification</span>
        <span className="font-mono font-bold text-primary">Latency: 28ms</span>
      </div>
    </Card>
  );
}
