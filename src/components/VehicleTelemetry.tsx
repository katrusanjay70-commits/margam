import { Eye, Car, Bike, Bus, Truck, Gauge } from 'lucide-react';
import { useSim } from '../context/SimulationContext';
import { Card, Badge } from './ui/Card';

export function VehicleTelemetry() {
  const { heavyTraffic, currentCity } = useSim();

  const multiplier = heavyTraffic ? 1.4 : 1;

  const telemetryItems = [
    {
      label: 'Vehicles Detected',
      value: Math.round(34 * multiplier),
      icon: Eye,
    },
    {
      label: 'Cars & SUVs',
      value: Math.round(22 * multiplier),
      icon: Car,
    },
    {
      label: 'Two-Wheelers',
      value: Math.round(9 * multiplier),
      icon: Bike,
    },
    {
      label: 'Public Transit',
      value: 3,
      icon: Bus,
    },
    {
      label: 'Heavy Trucks',
      value: heavyTraffic ? 4 : 1,
      icon: Truck,
    },
    {
      label: 'Corridor Density',
      value: heavyTraffic ? '88%' : '44%',
      icon: Gauge,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {telemetryItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="p-4">
            <Icon className="size-5 text-primary" />
            <div className="mt-2 font-mono text-3xl font-bold text-foreground">{item.value}</div>
            <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
          </Card>
        );
      })}

      <Card className="col-span-2 flex items-center justify-between p-4 sm:col-span-3 lg:col-span-6">
        <span className="text-sm font-semibold text-muted-foreground">
          {currentCity.name} Arterial Traffic Status
        </span>
        <Badge tone={heavyTraffic ? 'orange' : 'green'} dot>
          {heavyTraffic ? 'HEAVY CONGESTION' : 'NORMAL CLEAR FLOW'}
        </Badge>
      </Card>
    </div>
  );
}
