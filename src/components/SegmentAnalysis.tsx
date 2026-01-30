import { useEffect, useMemo, useState } from 'react';
import { Timer, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { GpsPoint, ChartData } from '../types';
import { formatDuration, formatSpeed, formatDistance } from '../types';

interface Segment {
  index: number;
  startIndex: number;
  endIndex: number;
  distance: number; // meters
  duration: number; // seconds
  avgSpeed: number; // m/s
  avgHR: number | null;
  elevationGain: number;
  elevationLoss: number;
  startTime: string | null;
  endTime: string | null;
  pace: number; // seconds per km
}

interface SegmentAnalysisProps {
  gpsData: GpsPoint[];
  chartData: ChartData | null;
  workoutType?: string | null;
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

function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || !isFinite(secondsPerKm)) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function SegmentAnalysis({ gpsData, chartData, workoutType }: SegmentAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [segmentType, setSegmentType] = useState<'distance' | 'time'>('distance');
  const isBikeRide = useMemo(() => workoutType?.toLowerCase() === 'cycling', [workoutType]);
  const [customDistance, setCustomDistance] = useState(() => (isBikeRide ? 5000 : 1000));

  useEffect(() => {
    setCustomDistance(isBikeRide ? 5000 : 1000);
  }, [isBikeRide]);

  const segments = useMemo((): Segment[] => {
    if (!gpsData || gpsData.length < 2) return [];

    const result: Segment[] = [];
    const targetDistance = segmentType === 'distance' ? customDistance : Infinity;
    const targetDuration = segmentType === 'time' ? 300 : Infinity; // 5 min segments for time-based

    let segmentStartIndex = 0;
    let accumulatedDistance = 0;
    let accumulatedDuration = 0;

    for (let i = 1; i < gpsData.length; i++) {
      const prev = gpsData[i - 1];
      const curr = gpsData[i];

      if (!prev.lat || !prev.lon || !curr.lat || !curr.lon) continue;

      const dist = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      accumulatedDistance += dist;

      if (prev.timestamp && curr.timestamp) {
        const timeDiff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
        accumulatedDuration += timeDiff;
      }

      const shouldSplit = segmentType === 'distance' 
        ? accumulatedDistance >= targetDistance
        : accumulatedDuration >= targetDuration;

      if (shouldSplit) {
        // Calculate segment stats
        const segmentPoints = gpsData.slice(segmentStartIndex, i + 1);
        
        // Calculate elevation
        let elevGain = 0;
        let elevLoss = 0;
        for (let j = 1; j < segmentPoints.length; j++) {
          const prevAlt = segmentPoints[j - 1].altitude;
          const currAlt = segmentPoints[j].altitude;
          if (prevAlt !== null && currAlt !== null) {
            const diff = currAlt - prevAlt;
            if (diff > 0) elevGain += diff;
            else elevLoss += Math.abs(diff);
          }
        }

        // Get HR data for this segment if available
        let avgHR: number | null = null;
        if (chartData && chartData.heart_rate.length > 0) {
          const startTime = gpsData[segmentStartIndex].timestamp;
          const endTime = curr.timestamp;
          
          if (startTime && endTime) {
            const startT = new Date(startTime).getTime();
            const endT = new Date(endTime).getTime();
            
            const hrValues: number[] = [];
            for (let j = 0; j < chartData.timestamps.length; j++) {
              const t = new Date(chartData.timestamps[j]).getTime();
              if (t >= startT && t <= endT && chartData.heart_rate[j] !== null) {
                hrValues.push(chartData.heart_rate[j]!);
              }
            }
            
            if (hrValues.length > 0) {
              avgHR = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length);
            }
          }
        }

        const avgSpeed = accumulatedDuration > 0 ? accumulatedDistance / accumulatedDuration : 0;
        const pace = avgSpeed > 0 ? 1000 / avgSpeed : 0;

        result.push({
          index: result.length + 1,
          startIndex: segmentStartIndex,
          endIndex: i,
          distance: accumulatedDistance,
          duration: accumulatedDuration,
          avgSpeed,
          avgHR,
          elevationGain: Math.round(elevGain),
          elevationLoss: Math.round(elevLoss),
          startTime: gpsData[segmentStartIndex].timestamp,
          endTime: curr.timestamp,
          pace,
        });

        segmentStartIndex = i;
        accumulatedDistance = 0;
        accumulatedDuration = 0;
      }
    }

    // Add final partial segment if significant
    if (accumulatedDistance > targetDistance * 0.1 || result.length === 0) {
      const segmentPoints = gpsData.slice(segmentStartIndex);
      let elevGain = 0;
      let elevLoss = 0;
      for (let j = 1; j < segmentPoints.length; j++) {
        const prevAlt = segmentPoints[j - 1].altitude;
        const currAlt = segmentPoints[j].altitude;
        if (prevAlt !== null && currAlt !== null) {
          const diff = currAlt - prevAlt;
          if (diff > 0) elevGain += diff;
          else elevLoss += Math.abs(diff);
        }
      }

      const avgSpeed = accumulatedDuration > 0 ? accumulatedDistance / accumulatedDuration : 0;
      const pace = avgSpeed > 0 ? 1000 / avgSpeed : 0;

      if (accumulatedDistance > 50) { // Only add if more than 50m
        result.push({
          index: result.length + 1,
          startIndex: segmentStartIndex,
          endIndex: gpsData.length - 1,
          distance: accumulatedDistance,
          duration: accumulatedDuration,
          avgSpeed,
          avgHR: null,
          elevationGain: Math.round(elevGain),
          elevationLoss: Math.round(elevLoss),
          startTime: gpsData[segmentStartIndex].timestamp,
          endTime: gpsData[gpsData.length - 1].timestamp,
          pace,
        });
      }
    }

    return result;
  }, [gpsData, chartData, segmentType, customDistance]);

  // Calculate best/worst segments
  const fastestSegment = useMemo(() => {
    if (segments.length === 0) return null;
    return segments.reduce((best, seg) => seg.pace < best.pace && seg.pace > 0 ? seg : best, segments[0]);
  }, [segments]);

  const slowestSegment = useMemo(() => {
    if (segments.length === 0) return null;
    return segments.reduce((worst, seg) => seg.pace > worst.pace ? seg : worst, segments[0]);
  }, [segments]);

  if (!gpsData || gpsData.length < 2) {
    return null;
  }

  const avgPace = segments.length > 0 
    ? segments.reduce((sum, s) => sum + s.pace, 0) / segments.length 
    : 0;

  return (
    <div className="card p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Segment Analysis
          </h3>
          <span className="text-xs text-[var(--color-text-secondary)]">
            ({segments.length} segments)
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
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--color-text-secondary)]">Split by:</label>
              <select
                value={segmentType}
                onChange={(e) => setSegmentType(e.target.value as 'distance' | 'time')}
                className="text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-primary)]"
              >
                <option value="distance">Distance</option>
                <option value="time">Time (5 min)</option>
              </select>
            </div>
            {segmentType === 'distance' && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--color-text-secondary)]">Segment:</label>
                <select
                  value={customDistance}
                  onChange={(e) => setCustomDistance(Number(e.target.value))}
                  className="text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-primary)]"
                >
                  <option value={400}>400m</option>
                  <option value={500}>500m</option>
                  <option value={1000}>1 km</option>
                  <option value={1609}>1 mile</option>
                  <option value={5000}>5 km</option>
                </select>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {segments.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
                <p className="text-xs text-[var(--color-text-secondary)]">Avg Pace</p>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">
                  {formatPace(avgPace)}/km
                </p>
              </div>
              {fastestSegment && (
                <div className="bg-emerald-900/20 rounded-lg p-2">
                  <p className="text-xs text-emerald-400">Fastest (#{fastestSegment.index})</p>
                  <p className="text-sm font-bold text-emerald-400">
                    {formatPace(fastestSegment.pace)}/km
                  </p>
                </div>
              )}
              {slowestSegment && (
                <div className="bg-orange-900/20 rounded-lg p-2">
                  <p className="text-xs text-orange-400">Slowest (#{slowestSegment.index})</p>
                  <p className="text-sm font-bold text-orange-400">
                    {formatPace(slowestSegment.pace)}/km
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Segments Table */}
          {segments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-1">#</th>
                    <th className="text-right py-2 px-1">Distance</th>
                    <th className="text-right py-2 px-1">Duration</th>
                    <th className="text-right py-2 px-1">Pace</th>
                    <th className="text-right py-2 px-1">Speed</th>
                    <th className="text-right py-2 px-1">HR</th>
                    <th className="text-right py-2 px-1">↑/↓</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((segment) => {
                    const isFastest = fastestSegment?.index === segment.index;
                    const isSlowest = slowestSegment?.index === segment.index;
                    const paceChange = avgPace > 0 ? ((segment.pace - avgPace) / avgPace) * 100 : 0;
                    
                    return (
                      <tr 
                        key={segment.index} 
                        className={`border-b border-[var(--color-border)]/50 ${
                          isFastest ? 'bg-emerald-900/10' : isSlowest ? 'bg-orange-900/10' : ''
                        }`}
                      >
                        <td className="py-2 px-1 text-[var(--color-text-primary)] font-medium">
                          {segment.index}
                        </td>
                        <td className="py-2 px-1 text-right text-[var(--color-text-primary)]">
                          {formatDistance(segment.distance)}
                        </td>
                        <td className="py-2 px-1 text-right text-[var(--color-text-primary)]">
                          {formatDuration(segment.duration)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          <span className={`flex items-center justify-end gap-1 ${
                            isFastest ? 'text-emerald-400' : isSlowest ? 'text-orange-400' : 'text-[var(--color-text-primary)]'
                          }`}>
                            {formatPace(segment.pace)}
                            {Math.abs(paceChange) > 2 && (
                              paceChange > 0 ? (
                                <TrendingDown className="w-3 h-3 text-orange-400" />
                              ) : (
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                              )
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-1 text-right text-[var(--color-text-secondary)]">
                          {formatSpeed(segment.avgSpeed)}
                        </td>
                        <td className="py-2 px-1 text-right text-red-400">
                          {segment.avgHR ? `${segment.avgHR}` : '-'}
                        </td>
                        <td className="py-2 px-1 text-right text-[var(--color-text-secondary)]">
                          <span className="text-emerald-400">+{segment.elevationGain}</span>
                          {' / '}
                          <span className="text-red-400">-{segment.elevationLoss}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {segments.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
              Not enough GPS data for segment analysis
            </p>
          )}
        </div>
      )}
    </div>
  );
}
