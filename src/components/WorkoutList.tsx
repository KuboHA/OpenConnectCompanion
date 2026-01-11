import { Filter, X } from 'lucide-react';
import { useWorkoutStore } from '../stores/workoutStore';
import { invoke } from '@tauri-apps/api/core';
import type { Workout } from '../types';
import {
  formatDuration,
  formatDistance,
  formatDate,
  formatTime,
  capitalizeWorkoutType,
  getActivityColor,
} from '../types';
import { useState } from 'react';

export default function WorkoutList() {
  const {
    workouts,
    currentPage,
    totalWorkouts,
    perPage,
    workoutTypeFilter,
    tagFilter,
    activityBreakdown,
    allTags,
    isLoading,
    setPage,
    setWorkoutTypeFilter,
    setTagFilter,
    openModal,
  } = useWorkoutStore();

  const [showFilters, setShowFilters] = useState(false);
  const totalPages = Math.ceil(totalWorkouts / perPage);

  const handleWorkoutClick = async (workoutId: number) => {
    try {
      const workout = await invoke<Workout | null>('get_workout', { id: workoutId });
      if (workout) {
        openModal(workout);
      }
    } catch (error) {
      console.error('Failed to load workout:', error);
    }
  };

  const clearFilters = () => {
    setWorkoutTypeFilter(null);
    setTagFilter(null);
  };

  const hasActiveFilters = workoutTypeFilter !== null || tagFilter !== null;

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Recent Workouts
          {totalWorkouts > 0 && (
            <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">
              ({totalWorkouts} total)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="cursor-pointer text-xs text-[var(--color-accent)] hover:opacity-80 font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`cursor-pointer p-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Filter Section */}
      {showFilters && (
        <div className="mb-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg space-y-3">
          {/* Activity Type Filter */}
          <div>
            <span className="text-xs text-[var(--color-text-secondary)] block mb-2">Activity Type:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setWorkoutTypeFilter(null)}
                className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  workoutTypeFilter === null
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                }`}
              >
                All
              </button>
              {activityBreakdown.map((activity) => (
                <button
                  key={activity.name}
                  onClick={() => setWorkoutTypeFilter(
                    workoutTypeFilter === activity.name ? null : activity.name
                  )}
                  className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    workoutTypeFilter === activity.name
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getActivityColor(activity.name) }}
                  />
                  {capitalizeWorkoutType(activity.name)}
                  <span className="opacity-70">({activity.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block mb-2">Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTagFilter(null)}
                  className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    tagFilter === null
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      tagFilter === tag
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active filter chips (shown when filter panel is closed) */}
      {!showFilters && hasActiveFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-text-secondary)]">Active:</span>
          {workoutTypeFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-md">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getActivityColor(workoutTypeFilter) }}
              />
              {capitalizeWorkoutType(workoutTypeFilter)}
              <button onClick={() => setWorkoutTypeFilter(null)} className="cursor-pointer ml-1 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {tagFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-md">
              #{tagFilter}
              <button onClick={() => setTagFilter(null)} className="cursor-pointer ml-1 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Workout list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm">
            Loading workouts...
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm">
            {hasActiveFilters 
              ? 'No workouts match your filters. Try different criteria.'
              : 'No workouts found. Upload some FIT files to get started!'
            }
          </div>
        ) : (
          workouts.map((workout) => (
            <div
              key={workout.id}
              onClick={() => handleWorkoutClick(workout.id)}
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] cursor-pointer transition-colors group"
            >
              {/* Activity type color bar */}
              <div
                className="w-1 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: getActivityColor(workout.workout_type) }}
              />
              
              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {capitalizeWorkoutType(workout.workout_type)}
                  </span>
                  {workout.name && workout.name !== workout.workout_type && (
                    <span className="text-xs text-[var(--color-text-secondary)] truncate hidden sm:block">
                      • {workout.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {formatDate(workout.start_time)} at {formatTime(workout.start_time)}
                </p>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-right flex-shrink-0">
                {!['generic', 'strength_training', 'yoga', 'training', 'fitness_equipment'].includes(workout.workout_type?.toLowerCase() || '') && (
                  <div className="hidden sm:block">
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">
                      {formatDistance(workout.distance_meters)}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">Distance</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-primary)]">
                    {formatDuration(workout.duration_seconds)}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">Duration</p>
                </div>
                {workout.avg_heart_rate && workout.avg_heart_rate > 0 && (
                  <div className="hidden md:block">
                    <p className="text-xs font-medium text-red-500">
                      {workout.avg_heart_rate}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">Avg HR</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <div className="text-xs text-[var(--color-text-secondary)]">
            Showing {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, totalWorkouts)} of {totalWorkouts}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="cursor-pointer px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] rounded-md hover:bg-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="px-2 text-xs text-[var(--color-text-secondary)]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="cursor-pointer px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] rounded-md hover:bg-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
