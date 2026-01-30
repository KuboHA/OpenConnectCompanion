import { useState } from 'react';
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import type { ChartData } from '../types';

interface WorkoutChartsProps {
  chartData: ChartData;
  onHover?: (timestamp: string | null) => void;
  workoutType?: string;
}

// Maximum number of data points to display in charts
const MAX_CHART_POINTS = 500;

// Downsample data using LTTB (Largest Triangle Three Buckets) algorithm
function downsampleData<T extends Record<string, unknown>>(
  data: T[],
  targetPoints: number,
  valueKey: keyof T
): T[] {
  if (data.length <= targetPoints) return data;
  
  const sampled: T[] = [];
  const bucketSize = (data.length - 2) / (targetPoints - 2);
  
  // Always keep the first point
  sampled.push(data[0]);
  
  for (let i = 0; i < targetPoints - 2; i++) {
    const bucketStart = Math.floor((i) * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
    
    // Calculate average point in next bucket
    let avgX = 0;
    let avgY = 0;
    let count = 0;
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      const val = data[j][valueKey];
      if (typeof val === 'number' && val !== null) {
        avgX += j;
        avgY += val;
        count++;
      }
    }
    if (count > 0) {
      avgX /= count;
      avgY /= count;
    }
    
    // Find point in current bucket with largest triangle area
    let maxArea = -1;
    let maxAreaIndex = bucketStart;
    const prevPoint = sampled[sampled.length - 1];
    const prevX = data.indexOf(prevPoint);
    const prevY = (prevPoint[valueKey] as number) || 0;
    
    for (let j = bucketStart; j < bucketEnd && j < data.length; j++) {
      const val = data[j][valueKey];
      if (typeof val === 'number' && val !== null) {
        const area = Math.abs((prevX - avgX) * (val - prevY) - (prevX - j) * (avgY - prevY)) / 2;
        if (area > maxArea) {
          maxArea = area;
          maxAreaIndex = j;
        }
      }
    }
    
    sampled.push(data[maxAreaIndex]);
  }
  
  // Always keep the last point
  sampled.push(data[data.length - 1]);
  
  return sampled;
}

export default function WorkoutCharts({ chartData, onHover, workoutType }: WorkoutChartsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isCycling = workoutType?.toLowerCase() === 'cycling';

  // Process data to include Time (seconds) and Distance (meters)
  let accumulatedDistance = 0;
  const startTime = new Date(chartData.timestamps[0]).getTime();

  // Prepare data with real time
  const fullData = chartData.timestamps.map((ts, i) => {
    const timeInSeconds = Math.floor((new Date(ts).getTime() - startTime) / 1000);
    
    // Calculate distance for cycling if speed is available
    if (isCycling && i > 0 && chartData.speed[i] !== null && chartData.speed[i] !== undefined) {
      const prevTime = Math.floor((new Date(chartData.timestamps[i-1]).getTime() - startTime) / 1000);
      const timeDiff = timeInSeconds - prevTime;
      // speed is m/s. distance = speed * time
      accumulatedDistance += (chartData.speed[i]! * timeDiff);
    }

    return {
      index: i,
      originalIndex: i,
      timestamp: ts,
      timeSeconds: timeInSeconds, 
      distanceKm: accumulatedDistance / 1000,
      heartRate: chartData.heart_rate[i],
      speed: chartData.speed[i] ? chartData.speed[i]! * 3.6 : null, // Convert to km/h
      power: chartData.power[i],
      cadence: chartData.cadence[i],
      altitude: chartData.altitude[i],
    };
  });
  
  // Downsample data if needed
  const data = fullData.length > MAX_CHART_POINTS 
    ? downsampleData(fullData, MAX_CHART_POINTS, 'heartRate')
    : fullData;
  
  // Determine X-Axis data key
  const xAxisKey = isCycling ? 'distanceKm' : 'timeSeconds';
  const xAxisLabel = isCycling ? 'Distance (km)' : 'Time';

  const hasHeartRate = chartData.heart_rate.some((v) => v !== null);
  const hasSpeed = chartData.speed.some((v) => v !== null);
  const hasPower = chartData.power.some((v) => v !== null);
  const hasCadence = chartData.cadence.some((v) => v !== null);

  // Calculate min/max for each data type from FULL data (not downsampled)
  const getMinMax = (key: keyof typeof fullData[0]) => {
    const values = fullData.map(d => d[key]).filter((v): v is number => v !== null && typeof v === 'number');
    if (values.length === 0) return { min: 0, max: 100 };
    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    const padding = Math.max(5, Math.round((max - min) * 0.1));
    return { min: Math.max(0, min - padding), max: max + padding };
  };

  const chartConfig = [
    {
      key: 'heartRate',
      title: 'Heart Rate',
      color: '#ef4444',
      unit: 'bpm',
      yLabel: 'BPM',
      show: hasHeartRate,
      domain: getMinMax('heartRate'),
    },
    {
      key: 'speed',
      title: 'Speed',
      color: '#10b981',
      unit: 'km/h',
      yLabel: 'km/h',
      show: hasSpeed,
      domain: getMinMax('speed'),
    },
    {
      key: 'power',
      title: 'Power',
      color: '#f59e0b',
      unit: 'W',
      yLabel: 'Watts',
      show: hasPower,
      domain: getMinMax('power'),
    },
    {
      key: 'cadence',
      title: 'Cadence',
      color: '#3b82f6',
      unit: 'rpm',
      yLabel: 'RPM',
      show: hasCadence,
      domain: getMinMax('cadence'),
    },
  ].filter((c) => c.show);

  if (chartConfig.length === 0) {
    return null;
  }

  const metricCount = chartConfig.length;
  const statsGridClass = metricCount === 3
    ? 'grid grid-cols-2 sm:grid-cols-3 gap-2'
    : 'grid grid-cols-2 sm:grid-cols-4 gap-2';
  const chartsGridClass = metricCount === 3
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'
    : 'grid grid-cols-1 sm:grid-cols-2 gap-4';

  const handleMouseMove = (state: any) => {
    if (onHover && state?.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
       const point = data[state.activeTooltipIndex];
       if (point) {
         onHover(point.timestamp);
       }
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  // Format time for X axis
  const formatXAxis = (value: number) => {
    if (isCycling) {
      return `${value.toFixed(1)} km`;
    }
    const totalSeconds = value;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="card p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-900/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Performance Charts</h3>
          <span className="text-xs text-[var(--color-text-secondary)]">
            ({chartConfig.length} metrics)
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
          {/* Stats row */}
          <div className={statsGridClass}>
            {chartConfig.map((config) => {
              const values = fullData.map(d => d[config.key as keyof typeof fullData[0]]).filter((v): v is number => v !== null && typeof v === 'number');
              const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
              const max = values.length > 0 ? Math.round(Math.max(...values)) : 0;
              return (
                <div key={config.key} className="bg-[var(--color-bg-secondary)] rounded-lg p-2 text-center">
                  <p className="text-xs text-[var(--color-text-secondary)]">{config.title}</p>
                  <p className="text-sm font-bold" style={{ color: config.color }}>{avg} <span className="text-xs font-normal">avg</span></p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{max} max</p>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className={chartsGridClass}>
            {chartConfig.map((config) => (
              <div key={config.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}></div>
                  <span className="text-xs text-[var(--color-text-secondary)]">{config.title}</span>
                </div>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={data}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      <defs>
                        <linearGradient id={`gradient-${config.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={config.color} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={config.color} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey={xAxisKey}
                        type="number" 
                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                        tickFormatter={formatXAxis}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        domain={['dataMin', 'dataMax']}
                        label={{ 
                          value: xAxisLabel, 
                          position: 'right', 
                          offset: -5,
                          style: { fontSize: 10, fill: 'var(--color-text-secondary)' }
                        }}
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                        domain={[config.domain.min, config.domain.max]}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        tickCount={5}
                        tickFormatter={(v) => `${Math.round(Number(v))}${config.unit === 'bpm' ? '' : config.unit === 'W' ? '' : ''}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-bg-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        itemStyle={{
                          color: 'var(--color-text-primary)',
                        }}
                        formatter={(value) => [
                          `${Number(value)?.toFixed(1)} ${config.unit}`,
                          config.title,
                        ]}
                        labelFormatter={(label) => formatXAxis(label)}
                      />
                      <Area
                        type="monotone"
                        dataKey={config.key}
                        stroke={config.color}
                        strokeWidth={2}
                        fill={`url(#gradient-${config.key})`}
                        dot={false}
                        connectNulls
                        activeDot={{
                          r: 6,
                          fill: config.color,
                          stroke: 'var(--color-bg-card)',
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
