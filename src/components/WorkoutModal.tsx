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
  ChevronDown,
  ChevronUp,
  Map,
  BarChart3,
  FileText,
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
import HRZonesCard from './HRZonesCard';
import SegmentAnalysis from './SegmentAnalysis';
import ElevationProfile from './ElevationProfile';

export default function WorkoutModal() {
  const {
    selectedWorkout,
    chartData,
    gpsData,
    closeModal,
    deleteWorkout,
    renameWorkout,
    updateTags,
    updateNotes,
  } = useWorkoutStore();
  const addToast = useToastStore((state) => state.addToast);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(selectedWorkout?.name || '');
  const [newTag, setNewTag] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isMapSectionOpen, setIsMapSectionOpen] = useState(true);
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [notes, setNotes] = useState(selectedWorkout?.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [highlightedChartIndex, setHighlightedChartIndex] = useState<number | null>(null);

  // Reset map expanded state when modal opens/closes
  useEffect(() => {
    setIsMapExpanded(false);
    setHighlightedChartIndex(null);
    setNotes(selectedWorkout?.notes || '');
    setIsEditingNotes(false);
  }, [selectedWorkout?.id, selectedWorkout?.notes]);

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

  const handleSaveNotes = async () => {
    const success = await updateNotes(selectedWorkout.id, notes);
    if (success) {
      addToast('Notes saved successfully', 'success');
      setIsEditingNotes(false);
    } else {
      addToast('Failed to save notes', 'error');
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Map */}
          {gpsData && gpsData.length > 0 && (
            <div className="card p-4">
              <button
                onClick={() => setIsMapSectionOpen(!isMapSectionOpen)}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-900/30 flex items-center justify-center">
                    <Map className="w-4 h-4 text-sky-400" />
                  </div>
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Route Map</h3>
                </div>
                <div className="flex items-center gap-2">
                  {isMapSectionOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMapExpanded(!isMapExpanded);
                      }}
                      className="cursor-pointer p-1.5 bg-[var(--color-bg-secondary)] rounded-lg hover:bg-[var(--color-border)]"
                    >
                      {isMapExpanded ? (
                        <Minimize2 className="w-3 h-3 text-[var(--color-text-primary)]" />
                      ) : (
                        <Maximize2 className="w-3 h-3 text-[var(--color-text-primary)]" />
                      )}
                    </button>
                  )}
                  {isMapSectionOpen ? (
                    <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  )}
                </div>
              </button>
              
              {isMapSectionOpen && (
                <div 
                  className="mt-4 rounded-lg overflow-hidden transition-all duration-300"
                  style={{ height: isMapExpanded ? '400px' : '200px' }}
                  key={`map-${isMapExpanded}`}
                >
                  <WorkoutMap gpsData={gpsData} highlightedIndex={highlightedChartIndex} />
                </div>
              )}
            </div>
          )}

          {/* Overview - show different stats based on workout type */}
          <div className="card p-4">
            <button
              onClick={() => setIsOverviewOpen(!isOverviewOpen)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Overview</h3>
              </div>
              {isOverviewOpen ? (
                <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
              )}
            </button>

            {isOverviewOpen && (() => {
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
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
          </div>

          {/* Charts */}
          {chartData && (
            <div className="space-y-4">
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
              
              {/* HR Zones for this workout */}
              {chartData.heart_rate.some(hr => hr !== null) && (
                <HRZonesCard />
              )}
            </div>
          )}

          {/* Elevation Profile */}
          {gpsData && gpsData.length > 0 && gpsData.some(p => p.altitude !== null) && (
            <ElevationProfile 
              gpsData={gpsData} 
              onHover={setHighlightedChartIndex}
            />
          )}

          {/* Segment Analysis */}
          {gpsData && gpsData.length > 0 && (
            <SegmentAnalysis 
              gpsData={gpsData} 
              chartData={chartData}
              workoutType={selectedWorkout.workout_type}
            />
          )}

          {/* Tags */}
          <div className="card p-4">
            <button
              onClick={() => setIsTagsOpen(!isTagsOpen)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Tags</h3>
                {tags.length > 0 && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    ({tags.length})
                  </span>
                )}
              </div>
              {isTagsOpen ? (
                <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
              )}
            </button>

            {isTagsOpen && (
              <div className="flex flex-wrap gap-2 mt-4">
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
            )}
          </div>

          {/* Notes */}
          <div className="card p-4">
            <button
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Notes</h3>
                {notes && !isEditingNotes && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    ({notes.length} chars)
                  </span>
                )}
              </div>
              {isNotesOpen ? (
                <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
              )}
            </button>

            {isNotesOpen && (
              <div className="mt-4">
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this workout..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveNotes}
                        className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-white rounded-md hover:opacity-90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setNotes(selectedWorkout.notes || '');
                          setIsEditingNotes(false);
                        }}
                        className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] rounded-md hover:bg-[var(--color-border)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingNotes(true)}
                    className="cursor-pointer p-3 bg-[var(--color-bg-secondary)] rounded-lg min-h-[60px] hover:bg-[var(--color-border)] transition-colors"
                  >
                    {notes ? (
                      <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{notes}</p>
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)] italic">Click to add notes...</p>
                    )}
                  </div>
                )}
              </div>
            )}
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
