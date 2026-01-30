import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker } from 'react-leaflet';
import { Map, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { GpsPoint } from '../types';
import 'leaflet/dist/leaflet.css';

interface HeatmapViewProps {
  gpsData: GpsPoint[];
  allWorkoutsGpsData?: GpsPoint[][]; // For aggregated heatmap across workouts
}

interface HeatPoint {
  lat: number;
  lon: number;
  intensity: number;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = positions.reduce(
        (acc, pos) => ({
          minLat: Math.min(acc.minLat, pos[0]),
          maxLat: Math.max(acc.maxLat, pos[0]),
          minLng: Math.min(acc.minLng, pos[1]),
          maxLng: Math.max(acc.maxLng, pos[1]),
        }),
        { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity }
      );
      
      map.fitBounds([
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng],
      ], { padding: [20, 20] });
    }
  }, [map, positions]);

  return null;
}

function MapResizer() {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// Simple grid-based heatmap calculation
function calculateHeatmap(points: [number, number][], gridSize: number = 0.0005): HeatPoint[] {
  const grid = new window.Map<string, { lat: number; lon: number; count: number }>();
  
  points.forEach(([lat, lon]) => {
    // Round to grid cell
    const gridLat = Math.round(lat / gridSize) * gridSize;
    const gridLon = Math.round(lon / gridSize) * gridSize;
    const key = `${gridLat.toFixed(6)},${gridLon.toFixed(6)}`;
    
    const existing = grid.get(key);
    if (existing) {
      existing.count++;
    } else {
      grid.set(key, { lat: gridLat, lon: gridLon, count: 1 });
    }
  });
  
  // Convert to array and normalize intensity
  const cells = Array.from(grid.values());
  const maxCount = Math.max(...cells.map(c => c.count), 1);
  
  return cells.map(cell => ({
    lat: cell.lat,
    lon: cell.lon,
    intensity: cell.count / maxCount,
  }));
}

function getHeatColor(intensity: number): string {
  // Blue -> Cyan -> Green -> Yellow -> Orange -> Red
  if (intensity < 0.2) return '#3b82f6'; // blue
  if (intensity < 0.4) return '#06b6d4'; // cyan
  if (intensity < 0.6) return '#22c55e'; // green
  if (intensity < 0.8) return '#eab308'; // yellow
  if (intensity < 0.9) return '#f97316'; // orange
  return '#ef4444'; // red
}

export default function HeatmapView({ gpsData, allWorkoutsGpsData }: HeatmapViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [gridSize, setGridSize] = useState<'fine' | 'medium' | 'coarse'>('medium');

  const gridSizeValue = gridSize === 'fine' ? 0.0002 : gridSize === 'medium' ? 0.0005 : 0.001;

  // Combine GPS data based on mode
  const positions: [number, number][] = useMemo(() => {
    if (showAllWorkouts && allWorkoutsGpsData) {
      return allWorkoutsGpsData.flatMap(workout => 
        workout.filter(p => p.lat && p.lon).map(p => [p.lat, p.lon] as [number, number])
      );
    }
    return gpsData.filter(p => p.lat && p.lon).map(p => [p.lat, p.lon] as [number, number]);
  }, [gpsData, allWorkoutsGpsData, showAllWorkouts]);

  // Calculate heatmap points
  const heatPoints = useMemo(() => {
    return calculateHeatmap(positions, gridSizeValue);
  }, [positions, gridSizeValue]);

  if (positions.length === 0) {
    return null;
  }

  const center = positions[Math.floor(positions.length / 2)];
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="card p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Activity Heatmap
          </h3>
          <span className="text-xs text-[var(--color-text-secondary)]">
            ({heatPoints.length} zones)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-[var(--color-text-secondary)]" />
              <label className="text-xs text-[var(--color-text-secondary)]">Grid:</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(e.target.value as 'fine' | 'medium' | 'coarse')}
                className="text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-primary)]"
              >
                <option value="fine">Fine</option>
                <option value="medium">Medium</option>
                <option value="coarse">Coarse</option>
              </select>
            </div>
            {allWorkoutsGpsData && allWorkoutsGpsData.length > 1 && (
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllWorkouts}
                  onChange={(e) => setShowAllWorkouts(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                Show all workouts ({allWorkoutsGpsData.length})
              </label>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--color-text-secondary)]">Intensity:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-[var(--color-text-secondary)]">Low</span>
            </div>
            <div className="flex-1 h-3 rounded-sm" style={{ 
              background: 'linear-gradient(to right, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444)'
            }} />
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-[var(--color-text-secondary)]">High</span>
            </div>
          </div>

          {/* Map */}
          <div className="h-64 rounded-lg overflow-hidden">
            <MapContainer
              center={center}
              zoom={14}
              className="w-full h-full"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={tileUrl}
              />
              
              {/* Render heatmap as circles */}
              {heatPoints.map((point, index) => (
                <CircleMarker
                  key={index}
                  center={[point.lat, point.lon]}
                  radius={gridSize === 'fine' ? 4 : gridSize === 'medium' ? 6 : 10}
                  pathOptions={{
                    color: getHeatColor(point.intensity),
                    fillColor: getHeatColor(point.intensity),
                    fillOpacity: 0.6 + point.intensity * 0.3,
                    weight: 0,
                  }}
                />
              ))}
              
              <FitBounds positions={positions} />
              <MapResizer />
            </MapContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
              <p className="text-xs text-[var(--color-text-secondary)]">Points</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {positions.length.toLocaleString()}
              </p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
              <p className="text-xs text-[var(--color-text-secondary)]">Zones</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {heatPoints.length}
              </p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
              <p className="text-xs text-[var(--color-text-secondary)]">Hot Spots</p>
              <p className="text-sm font-bold text-orange-400">
                {heatPoints.filter(p => p.intensity > 0.7).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
