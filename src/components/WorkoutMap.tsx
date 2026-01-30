import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import type { GpsPoint } from '../types';
import 'leaflet/dist/leaflet.css';

interface WorkoutMapProps {
  gpsData: GpsPoint[];
  highlightedIndex?: number | null;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = positions.reduce(
        (acc, pos) => {
          return {
            minLat: Math.min(acc.minLat, pos[0]),
            maxLat: Math.max(acc.maxLat, pos[0]),
            minLng: Math.min(acc.minLng, pos[1]),
            maxLng: Math.max(acc.maxLng, pos[1]),
          };
        },
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
    // Invalidate size when container might have changed
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function WorkoutMap({ gpsData, highlightedIndex }: WorkoutMapProps) {
  const positions: [number, number][] = gpsData
    .filter((p) => p.lat && p.lon)
    .map((p) => [p.lat, p.lon]);

  if (positions.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-secondary)] rounded-lg">
        <p className="text-[var(--color-text-secondary)]">No GPS data available</p>
      </div>
    );
  }

  const startPosition = positions[0];
  const endPosition = positions[positions.length - 1];
  const center = positions[Math.floor(positions.length / 2)];
  
  // Get highlighted position if available
  const highlightedPosition = highlightedIndex !== null && highlightedIndex !== undefined && positions[highlightedIndex]
    ? positions[highlightedIndex]
    : null;

  // Custom dark theme tiles optimized for route visibility
  const baseTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
  const labelTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';
  const lineColor = '#38bdf8';

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-full rounded-lg activity-map"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={baseTileUrl}
      />
      <TileLayer
        attribution=""
        url={labelTileUrl}
      />
      {/* Route glow */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#0ea5e9',
          weight: 8,
          opacity: 0.25,
        }}
      />
      <Polyline
        positions={positions}
        pathOptions={{
          color: lineColor,
          weight: 4,
          opacity: 0.9,
        }}
      />
      {/* Start marker - green */}
      <CircleMarker
        center={startPosition}
        radius={8}
        pathOptions={{
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 1,
          weight: 2,
        }}
      />
      {/* End marker - red */}
      <CircleMarker
        center={endPosition}
        radius={8}
        pathOptions={{
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 1,
          weight: 2,
        }}
      />
      {/* Highlighted marker - yellow */}
      {highlightedPosition && (
        <CircleMarker
          center={highlightedPosition}
          radius={10}
          pathOptions={{
            color: '#fbbf24',
            fillColor: '#fbbf24',
            fillOpacity: 1,
            weight: 3,
          }}
        />
      )}
      <FitBounds positions={positions} />
      <MapResizer />
    </MapContainer>
  );
}
