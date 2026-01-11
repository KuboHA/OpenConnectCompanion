export interface Workout {
  id: number;
  file_hash: string;
  filename: string;
  name: string | null;
  tags: string | null;
  workout_type: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  total_calories: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_power_watts: number | null;
  max_power_watts: number | null;
  avg_cadence: number | null;
  max_cadence: number | null;
  avg_speed_mps: number | null;
  max_speed_mps: number | null;
  elevation_gain_meters: number | null;
  elevation_loss_meters: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSummary {
  id: number;
  name: string | null;
  workout_type: string | null;
  start_time: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  total_calories: number | null;
  avg_heart_rate: number | null;
  tags: string | null;
}

export interface WorkoutsResponse {
  workouts: WorkoutSummary[];
  total: number;
  page: number;
  per_page: number;
}

export interface Stats {
  total_workouts: number;
  total_distance_km: number;
  total_duration_hours: number;
  total_calories: number;
}

export interface MonthlyStats {
  workouts: number;
  distance_km: number;
  duration_seconds: number;
  calories: number;
}

export interface StreakInfo {
  current_streak: number;
  active_days: number;
}

export interface PersonalRecords {
  max_distance_km: number;
  max_duration_hours: number;
  max_heart_rate: number;
  max_speed_kmh: number;
  max_elevation_gain: number;
  max_calories: number;
}

export interface ContributionDay {
  date: string;
  count: number;
  workout_types: string[];
}

export interface WeeklySummary {
  week: string;
  count: number;
}

export interface ActivityBreakdown {
  name: string;
  count: number;
}

export interface GpsPoint {
  timestamp: string | null;
  lat: number;
  lon: number;
  altitude: number | null;
}

export interface ChartData {
  timestamps: string[];
  heart_rate: (number | null)[];
  power: (number | null)[];
  cadence: (number | null)[];
  speed: (number | null)[];
  altitude: (number | null)[];
}

export interface UploadResult {
  success: boolean;
  message: string;
  workout_id: number | null;
  duplicate: boolean;
}

// Activity type colors for charts and UI
export const ACTIVITY_COLORS: Record<string, string> = {
  cycling: '#6366f1',
  running: '#f97316',
  swimming: '#06b6d4',
  walking: '#10b981',
  hiking: '#15803d',
  strength_training: '#ef4444',
  yoga: '#a855f7',
  generic: '#6b7280',
  fitness_equipment: '#8b5cf6',
  training: '#ec4899',
  rowing: '#0891b2',
  mountaineering: '#059669',
  paddling: '#0d9488',
  alpine_skiing: '#2563eb',
  snowboarding: '#7c3aed',
  cross_country_skiing: '#4f46e5',
};

export function getActivityColor(type: string | null): string {
  if (!type) return ACTIVITY_COLORS.generic;
  return ACTIVITY_COLORS[type.toLowerCase()] || ACTIVITY_COLORS.generic;
}

// Format helpers
export function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatDistance(meters: number | null): string {
  if (!meters) return '0 km';
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(2)} km` : `${km.toFixed(1)} km`;
}

export function formatSpeed(mps: number | null): string {
  if (!mps) return '0 km/h';
  const kmh = mps * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

export function capitalizeWorkoutType(type: string | null): string {
  if (!type) return 'Unknown';
  // Special case for training -> Weight Training
  if (type.toLowerCase() === 'training') return 'Weight Training';
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
