import { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Heart,
  Zap,
  Activity,
  MapPin,
  Flame,
  Mountain,
  Tag,
  Plus,
  Check,
  Maximize2,
  Minimize2,
  Clock, 
} from 'lucide-react';
import { useWorkoutStore } from '../stores/workoutStore';
import { useToastStore } from '../stores/toastStore';
import {
  formatDuration,
  formatDistance,
  formatSpeed,
  formatDateTime,
  capitalizeWorkoutType,
  getActivityColor,
} from '../types';
import WorkoutMap from './WorkoutMap';
import WorkoutCharts from './WorkoutCharts';

export default function WorkoutModal() {
  const {
    selectedWorkout,
    chartData,
    gpsData,
    closeModal,
    deleteWorkout,
    renameWorkout,
    updateTags,
  } = useWorkoutStore();
  const addToast = useToastStore((state) => state.addToast);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(selectedWorkout?.name || '');
  const [newTag, setNewTag] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [highlightedChartIndex, setHighlightedChartIndex] = useState<number | null>(null);

  // Reset map expanded state when modal opens/closes
  useEffect(() => {
    setIsMapExpanded(false);
    setHighlightedChartIndex(null);
  }, [selectedWorkout?.id]);

  if (!selectedWorkout) return null;

  const tags: string[] = selectedWorkout.tags ? JSON.parse(selectedWorkout.tags) : [];

  const handleSaveName = async () => {
    if (editName.trim()) {
      const success = await renameWorkout(selectedWorkout.id, editName.trim());
      if (success) {
        addToast('Workout renamed successfully', 'success');
        setIsEditing(false);
      } else {
        addToast('Failed to rename workout', 'error');
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this workout?')) {
      const success = await deleteWorkout(selectedWorkout.id);
      if (success) {
        addToast('Workout deleted successfully', 'success');
      } else {
        addToast('Failed to delete workout', 'error');
      }
    }
  };

  const handleAddTag = async () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const success = await updateTags(selectedWorkout.id, [...tags, newTag.trim()]);
      if (success) {
        setNewTag('');
        addToast('Tag added successfully', 'success');
      } else {
        addToast('Failed to add tag', 'error');
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const success = await updateTags(
      selectedWorkout.id,
      tags.filter((t) => t !== tagToRemove)
    );
    if (!success) {
      addToast('Failed to remove tag', 'error');
    }
  };
  
  // Metrics definition moved inside render to access calculated stats
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--color-bg-card)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-8 rounded-full"
              style={{ backgroundColor: getActivityColor(selectedWorkout.workout_type) }}
            />
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-2 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="Workout name"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="cursor-pointer p-1.5 rounded hover:bg-[var(--color-bg-secondary)] text-emerald-500"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="cursor-pointer p-1.5 rounded hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {selectedWorkout.name || capitalizeWorkoutType(selectedWorkout.workout_type)}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {formatDateTime(selectedWorkout.start_time)}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditName(selectedWorkout.name || '');
                setIsEditing(true);
              }}
              className="cursor-pointer p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
              title="Rename"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="cursor-pointer p-2 rounded-lg hover:bg-red-500/10 text-red-500"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={closeModal}
              className="cursor-pointer p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Map */}
          {gpsData && gpsData.length > 0 && (
            <div 
              className="relative transition-all duration-300"
              style={{ height: isMapExpanded ? '500px' : '250px' }}
              key={`map-${isMapExpanded}`}
            >
              <button
                onClick={() => setIsMapExpanded(!isMapExpanded)}
                className="cursor-pointer absolute top-2 right-2 z-[1000] p-2 bg-[var(--color-bg-card)] rounded-lg shadow hover:bg-[var(--color-bg-secondary)]"
              >
                {isMapExpanded ? (
                  <Minimize2 className="w-4 h-4 text-[var(--color-text-primary)]" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-[var(--color-text-primary)]" />
                )}
              </button>
              <WorkoutMap gpsData={gpsData} highlightedIndex={highlightedChartIndex} />
            </div>
          )}

          {/* Overview - show different stats based on workout type */}
          {(() => {
            const workoutType = selectedWorkout.workout_type?.toLowerCase() || '';
            const isStrengthBased = ['generic', 'training', 'strength_training', 'fitness_equipment', 'yoga'].includes(workoutType);
            
            // Calculate HR stats from chart data if not available in session
            let chartAvgHr: number | null = null;
            let chartMaxHr: number | null = null;
            if (chartData) {
              const hrValues = chartData.heart_rate.filter((v): v is number => v !== null && v > 0);
              if (hrValues.length > 0) {
                chartAvgHr = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length);
                chartMaxHr = Math.max(...hrValues);
              }
            }
            
            // Use session HR if available, otherwise use chart-derived HR
            const displayAvgHr = selectedWorkout.avg_heart_rate || chartAvgHr;
            const displayMaxHr = selectedWorkout.max_heart_rate || chartMaxHr;
            
            // For distance-based activities, check if distance is meaningful (more than 100m)
            const hasMeaningfulDistance = !isStrengthBased && 
              selectedWorkout.distance_meters && 
              selectedWorkout.distance_meters > 100;
            
            // Unified stats list with calculated values
            const displayMetrics = [
              {
                icon: Clock,
                label: 'Duration',
                value: formatDuration(selectedWorkout.duration_seconds),
                show: true,
                color: 'text-[var(--color-text-primary)]',
              },
              {
                icon: MapPin,
                label: 'Distance',
                value: formatDistance(selectedWorkout.distance_meters),
                show: hasMeaningfulDistance,
                color: 'text-[var(--color-text-primary)]',
              },
              {
                icon: Zap,
                label: 'Avg Power',
                value: selectedWorkout.avg_power_watts ? `${selectedWorkout.avg_power_watts} W` : null,
                show: !!selectedWorkout.avg_power_watts,
                color: 'text-amber-500',
              },
              {
                icon: Zap,
                label: 'Max Power',
                value: selectedWorkout.max_power_watts ? `${selectedWorkout.max_power_watts} W` : null,
                show: !!selectedWorkout.max_power_watts,
                color: 'text-amber-600',
              },
              {
                icon: Activity,
                label: 'Avg Cadence',
                value: selectedWorkout.avg_cadence ? `${selectedWorkout.avg_cadence} rpm` : null,
                show: !!selectedWorkout.avg_cadence,
                color: 'text-blue-500',
              },
              {
                icon: Heart,
                label: 'Avg HR',
                value: displayAvgHr ? `${displayAvgHr} bpm` : null,
                show: !!displayAvgHr,
                color: 'text-red-500',
              },
              {
                icon: Heart,
                label: 'Max HR',
                value: displayMaxHr ? `${displayMaxHr} bpm` : null,
                show: !!displayMaxHr,
                color: 'text-red-600',
              },
               {
                icon: MapPin,
                label: 'Avg Speed',
                value: selectedWorkout.avg_speed_mps ? formatSpeed(selectedWorkout.avg_speed_mps) : null,
                show: hasMeaningfulDistance && !!selectedWorkout.avg_speed_mps,
                color: 'text-emerald-500',
              },
              {
                icon: MapPin,
                label: 'Max Speed',
                value: selectedWorkout.max_speed_mps ? formatSpeed(selectedWorkout.max_speed_mps) : null,
                show: hasMeaningfulDistance && !!selectedWorkout.max_speed_mps,
                color: 'text-emerald-600',
              },
              {
                icon: Flame,
                label: 'Calories',
                value: selectedWorkout.total_calories ? `${selectedWorkout.total_calories} kcal` : null,
                show: selectedWorkout.total_calories && selectedWorkout.total_calories > 0,
                color: 'text-orange-500',
              },
               {
                icon: Mountain,
                label: 'Elevation Gain',
                value: selectedWorkout.elevation_gain_meters ? `+${selectedWorkout.elevation_gain_meters.toFixed(0)} m` : null,
                show: !!selectedWorkout.elevation_gain_meters,
                color: 'text-indigo-500',
              },
            ].filter(m => m.show && m.value);

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {displayMetrics.map((item) => (
                  <div key={item.label} className="bg-[var(--color-bg-secondary)] rounded-lg p-3 flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <div>
                      <p className="text-xs text-[var(--color-text-secondary)]">{item.label}</p>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Charts */}
          {chartData && (
            <WorkoutCharts 
              chartData={chartData} 
              onHover={gpsData && gpsData.length > 0 ? (timestamp) => {
                if (!timestamp || !gpsData) {
                  setHighlightedChartIndex(null);
                  return;
                }
                const targetTime = new Date(timestamp).getTime();
                // Find index in GPS data with closest timestamp
                let minDiff = Infinity;
                let closestIndex = -1;
                
                // Optimization: Binary search could be used here since timestamps are sorted,
                // but checking all points is fast enough for <10k points
                for (let i = 0; i < gpsData.length; i++) {
                  const pt = gpsData[i];
                  if (pt.timestamp) {
                    const ptTime = new Date(pt.timestamp).getTime();
                    const diff = Math.abs(ptTime - targetTime);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closestIndex = i;
                    } else if (diff > minDiff) {
                      // Since data is sorted, if diff gets larger we can stop
                      break; 
                    }
                  }
                }
                setHighlightedChartIndex(closestIndex !== -1 ? closestIndex : null);
              } : undefined}
              workoutType={selectedWorkout.workout_type || 'generic'}
            />
          )}

          {/* Tags */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-[var(--color-bg-secondary)] rounded-lg text-[var(--color-text-primary)]"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="cursor-pointer hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="px-2 py-1 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-24"
                />
                <button
                  onClick={handleAddTag}
                  className="cursor-pointer p-1 rounded hover:bg-[var(--color-bg-secondary)] text-[var(--color-accent)]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* File Info */}
          <div className="text-xs text-[var(--color-text-secondary)] pt-4 border-t border-[var(--color-border)]">
            <p>File: {selectedWorkout.filename}</p>
            <p>Hash: {selectedWorkout.file_hash.substring(0, 16)}...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
