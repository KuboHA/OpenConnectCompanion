import { useMemo, useState } from 'react';
import { Mountain, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { GpsPoint } from '../types';
import { formatDistance } from '../types';

interface ElevationProfileProps {
  gpsData: GpsPoint[];
  onHover?: (index: number | null) => void;
}

interface ElevationPoint {
  distance: number; // cumulative distance in meters
  altitude: number;
  grade: number; // percentage grade
  index: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ElevationProfile({ gpsData, onHover }: ElevationProfileProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Process GPS data into elevation points with distance
  const elevationData = useMemo((): ElevationPoint[] => {
    if (!gpsData || gpsData.length < 2) return [];

    const points: ElevationPoint[] = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < gpsData.length; i++) {
      const point = gpsData[i];
      
      if (point.altitude === null) continue;

      // Calculate cumulative distance
      if (i > 0) {
        const prev = gpsData[i - 1];
        if (prev.lat && prev.lon && point.lat && point.lon) {
          cumulativeDistance += calculateDistance(prev.lat, prev.lon, point.lat, point.lon);
        }
      }

      // Calculate grade (looking ahead for smoothing)
      let grade = 0;
      if (i > 0 && points.length > 0) {
        const prevPoint = points[points.length - 1];
        const distDiff = cumulativeDistance - prevPoint.distance;
        const altDiff = point.altitude - prevPoint.altitude;
        if (distDiff > 0) {
          grade = (altDiff / distDiff) * 100;
        }
      }

      points.push({
        distance: cumulativeDistance,
        altitude: point.altitude,
        grade: Math.round(grade * 10) / 10,
        index: i,
      });
    }

    // Smooth grade values with a moving average
    const smoothWindow = 5;
    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - smoothWindow);
      const end = Math.min(points.length, i + smoothWindow + 1);
      const grades = points.slice(start, end).map(p => p.grade);
      points[i].grade = Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10;
    }

    return points;
  }, [gpsData]);

  // Calculate stats
  const stats = useMemo(() => {
    if (elevationData.length === 0) {
      return { minAlt: 0, maxAlt: 0, totalGain: 0, totalLoss: 0, avgGrade: 0, maxGrade: 0 };
    }

    const altitudes = elevationData.map(p => p.altitude);
    const minAlt = Math.min(...altitudes);
    const maxAlt = Math.max(...altitudes);

    let totalGain = 0;
    let totalLoss = 0;
    for (let i = 1; i < elevationData.length; i++) {
      const diff = elevationData[i].altitude - elevationData[i - 1].altitude;
      if (diff > 0) totalGain += diff;
      else totalLoss += Math.abs(diff);
    }

    const grades = elevationData.map(p => p.grade);
    const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
    const maxGrade = (() => {
      const minWindow = 30; // meters
      const targetWindow = 100; // meters
      let peak = 0;

      for (let i = 0; i < elevationData.length - 1; i++) {
        let j = i + 1;
        while (j < elevationData.length && elevationData[j].distance - elevationData[i].distance < minWindow) {
          j++;
        }
        if (j >= elevationData.length) break;

        let k = j;
        while (k < elevationData.length && elevationData[k].distance - elevationData[i].distance < targetWindow) {
          k++;
        }
        const endIndex = k < elevationData.length ? k : j;
        const distDiff = elevationData[endIndex].distance - elevationData[i].distance;
        if (distDiff > 0) {
          const altDiff = elevationData[endIndex].altitude - elevationData[i].altitude;
          const grade = Math.abs((altDiff / distDiff) * 100);
          if (grade > peak) peak = grade;
        }
      }

      return peak;
    })();

    return {
      minAlt: Math.round(minAlt),
      maxAlt: Math.round(maxAlt),
      totalGain: Math.round(totalGain),
      totalLoss: Math.round(totalLoss),
      avgGrade: Math.round(avgGrade * 10) / 10,
      maxGrade: Math.round(maxGrade * 10) / 10,
    };
  }, [elevationData]);

  const elevationBounds = useMemo(() => {
    const range = stats.maxAlt - stats.minAlt;
    const padding = Math.max(20, Math.round(range * 0.15));
    const rawMin = stats.minAlt - padding;
    const rawMax = stats.maxAlt + padding;

    const roundTo = (value: number, step: number, dir: 'down' | 'up') =>
      dir === 'down' ? Math.floor(value / step) * step : Math.ceil(value / step) * step;

    const step = range > 300 ? 50 : range > 120 ? 25 : 10;
    return {
      min: roundTo(rawMin, step, 'down'),
      max: roundTo(rawMax, step, 'up'),
    };
  }, [stats.maxAlt, stats.minAlt]);

  if (elevationData.length < 2) {
    return null;
  }

  return (
    <div className="card p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Elevation Profile
          </h3>
          <span className="text-xs text-[var(--color-text-secondary)]">
            ({stats.maxAlt - stats.minAlt}m range)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
              <p className="text-xs text-[var(--color-text-secondary)]">Min</p>
              <p className="text-sm font-bold text-blue-400">{stats.minAlt}m</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
              <p className="text-xs text-[var(--color-text-secondary)]">Max</p>
              <p className="text-sm font-bold text-orange-400">{stats.maxAlt}m</p>
            </div>
            <div className="bg-emerald-900/20 rounded-lg p-2">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <p className="text-xs text-emerald-400">Gain</p>
              </div>
              <p className="text-sm font-bold text-emerald-400">+{stats.totalGain}m</p>
            </div>
            <div className="bg-red-900/20 rounded-lg p-2">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="w-3 h-3 text-red-400" />
                <p className="text-xs text-red-400">Loss</p>
              </div>
              <p className="text-sm font-bold text-red-400">-{stats.totalLoss}m</p>
            </div>
          </div>

          {/* Controls */}
          <div className="text-xs text-[var(--color-text-secondary)]">
            Max grade: <span className={`font-medium ${stats.maxGrade > 10 ? 'text-red-400' : stats.maxGrade > 6 ? 'text-orange-400' : 'text-emerald-400'}`}>
              {stats.maxGrade}%
            </span>
          </div>

          {/* Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={elevationData}
                onMouseMove={(e) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const payload = (e as any)?.activePayload;
                  if (payload && payload[0] && onHover) {
                    const point = payload[0].payload as ElevationPoint;
                    onHover(point.index);
                  }
                }}
                onMouseLeave={() => onHover?.(null)}
              >
                <defs>
                  <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="distance"
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}`}
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ 
                    value: 'km', 
                    position: 'right', 
                    offset: -5,
                    style: { fontSize: 10, fill: 'var(--color-text-secondary)' }
                  }}
                />
                <YAxis
                  domain={[elevationBounds.min, elevationBounds.max]}
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickCount={5}
                  tickFormatter={(v) => `${Math.round(Number(v))}m`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => {
                    if (value === undefined) return ['-', name];
                    if (name === 'altitude') return [`${Math.round(value as number)}m`, 'Altitude'];
                    if (name === 'grade') return [`${value}%`, 'Grade'];
                    return [value, name];
                  }}
                  labelFormatter={(value) => `Distance: ${formatDistance(value as number)}`}
                />
                <ReferenceLine
                  y={(stats.minAlt + stats.maxAlt) / 2}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                />
                <Area
                  type="monotone"
                  dataKey="altitude"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#elevationGradient)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: '#6366f1',
                    stroke: 'var(--color-bg-card)',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
