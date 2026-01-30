import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import { useWorkoutStore } from '../stores/workoutStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { HRZoneTime } from '../types';

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function HRZonesCard() {
  const chartData = useWorkoutStore((state) => state.chartData);
  const getEstimatedMaxHR = useSettingsStore((state) => state.getEstimatedMaxHR);
  const hrZones = useSettingsStore((state) => state.hrZones);
  const openSettings = useSettingsStore((state) => state.openSettings);

  const zoneData = useMemo((): HRZoneTime[] => {
    if (!chartData || !chartData.heart_rate) {
      return [];
    }

    const maxHR = getEstimatedMaxHR();
    const timestamps = chartData.timestamps;
    const heartRates = chartData.heart_rate;

    // Calculate time spent in each zone
    const zoneTimes: number[] = new Array(hrZones.length).fill(0);
    let totalValidTime = 0;

    for (let i = 1; i < timestamps.length; i++) {
      const hr = heartRates[i];
      if (hr === null || hr === undefined) continue;

      // Calculate time delta in seconds
      const prevTime = new Date(timestamps[i - 1]).getTime();
      const currTime = new Date(timestamps[i]).getTime();
      const deltaSeconds = (currTime - prevTime) / 1000;

      // Skip unreasonable time gaps (more than 60 seconds between points)
      if (deltaSeconds > 60 || deltaSeconds < 0) continue;

      // Determine which zone this HR falls into
      const percentage = (hr / maxHR) * 100;
      
      for (let z = 0; z < hrZones.length; z++) {
        const zone = hrZones[z];
        if (percentage >= zone.min && percentage < zone.max) {
          zoneTimes[z] += deltaSeconds;
          totalValidTime += deltaSeconds;
          break;
        }
        // Handle values above the highest zone
        if (z === hrZones.length - 1 && percentage >= zone.max) {
          zoneTimes[z] += deltaSeconds;
          totalValidTime += deltaSeconds;
        }
      }
    }

    // Convert to HRZoneTime array
    return hrZones.map((zone, index) => ({
      zoneName: zone.name,
      zoneIndex: index + 1,
      timeSeconds: Math.round(zoneTimes[index]),
      percentage: totalValidTime > 0 ? (zoneTimes[index] / totalValidTime) * 100 : 0,
      color: zone.color,
    }));
  }, [chartData, getEstimatedMaxHR, hrZones]);

  const totalTime = zoneData.reduce((sum, z) => sum + z.timeSeconds, 0);

  if (!chartData || zoneData.length === 0 || totalTime === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
              <Heart className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">HR Zones</h3>
          </div>
          <button
            onClick={openSettings}
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            Configure
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Select a workout with heart rate data to view zone distribution.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
            <Heart className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">HR Zones</h3>
        </div>
        <button
          onClick={openSettings}
          className="text-xs text-[var(--color-accent)] hover:underline"
        >
          Configure
        </button>
      </div>

      <div className="space-y-2">
        {/* Stacked bar visualization */}
        <div className="h-4 rounded-full overflow-hidden flex bg-[var(--color-bg-secondary)]">
          {zoneData.map((zone, idx) => (
            zone.percentage > 0 && (
              <div
                key={idx}
                className="h-full transition-all"
                style={{
                  width: `${zone.percentage}%`,
                  backgroundColor: zone.color,
                }}
                title={`${zone.zoneName}: ${formatTime(zone.timeSeconds)} (${zone.percentage.toFixed(1)}%)`}
              />
            )
          ))}
        </div>

        {/* Zone breakdown */}
        <div className="space-y-1.5 mt-3">
          {zoneData.map((zone, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: zone.color }}
              />
              <span className="text-[var(--color-text-secondary)] flex-1 truncate">
                Z{zone.zoneIndex}
              </span>
              <span className="text-[var(--color-text-primary)] font-medium">
                {formatTime(zone.timeSeconds)}
              </span>
              <span className="text-[var(--color-text-secondary)] w-10 text-right">
                {zone.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-[var(--color-border)] mt-2">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Total: {formatTime(totalTime)} · Max HR: {getEstimatedMaxHR()} bpm
          </p>
        </div>
      </div>
    </div>
  );
}
