import { useMemo, useState } from 'react';
import { useWorkoutStore } from '../stores/workoutStore';
import { format, eachDayOfInterval, subDays, getDay } from 'date-fns';
import { getActivityColor, capitalizeWorkoutType } from '../types';
import { invoke } from '@tauri-apps/api/core';
import type { Workout } from '../types';

export default function ContributionCalendar() {
  const contributionCalendar = useWorkoutStore((state) => state.contributionCalendar);
  const streakInfo = useWorkoutStore((state) => state.streakInfo);
  const activityBreakdown = useWorkoutStore((state) => state.activityBreakdown);
  const openModal = useWorkoutStore((state) => state.openModal);
  const [, setSelectedDate] = useState<string | null>(null);

  const handleDayClick = async (dateStr: string, count: number) => {
    if (count === 0) return;
    setSelectedDate(dateStr);
    try {
      // Fetch workouts for this specific date
      const workout = await invoke<Workout | null>('get_workout_by_date', { date: dateStr });
      if (workout) {
        openModal(workout);
      }
    } catch (error) {
      console.error('Failed to fetch workout for date:', error);
    }
  };

  // Build the grid data
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, 364);
    const allDays = eachDayOfInterval({ start: startDate, end: today });

    // Create activity map from API data
    const activityMap = new Map<string, { count: number; workoutTypes: string[] }>();
    contributionCalendar.forEach((day) => {
      activityMap.set(day.date, { count: day.count, workoutTypes: day.workout_types });
    });

    // Build weeks array (7 rows x N columns)
    const weeks: Array<Array<{ date: Date; count: number; workoutTypes: string[]; isEmpty: boolean }>> = [];
    
    // Initialize with empty cells to start on Monday
    let currentWeek: typeof weeks[0] = [];
    // Adjust so 0 is Monday, 6 is Sunday
    const firstDayOfWeek = (getDay(startDate) + 6) % 7;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: new Date(0), count: 0, workoutTypes: [], isEmpty: true });
    }

    allDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const activity = activityMap.get(dateStr) || { count: 0, workoutTypes: [] };
      currentWeek.push({ date: day, count: activity.count, workoutTypes: activity.workoutTypes, isEmpty: false });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), count: 0, workoutTypes: [], isEmpty: true });
      }
      weeks.push(currentWeek);
    }

    // Calculate month labels with positions
    const monthLabels: Array<{ name: string; position: number }> = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIdx) => {
      const firstValidDay = week.find(d => !d.isEmpty);
      if (firstValidDay) {
        const month = firstValidDay.date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            name: format(firstValidDay.date, 'MMM'),
            position: weekIdx,
          });
          lastMonth = month;
        }
      }
    });

    return { weeks, monthLabels };
  }, [contributionCalendar]);

  // Get unique activity types from activity breakdown for legend
  const legendTypes = useMemo(() => {
    return activityBreakdown.map(a => a.name).slice(0, 6); // Limit to 6 types for legend
  }, [activityBreakdown]);

  // Get the primary color for a day (first activity type, or blend for multiple)
  const getDayStyle = (workoutTypes: string[], isEmpty: boolean) => {
    if (isEmpty) {
      return { backgroundColor: 'transparent' };
    }
    if (workoutTypes.length === 0) {
      return { backgroundColor: 'var(--color-heat-0)' };
    }
    if (workoutTypes.length === 1) {
      return { backgroundColor: getActivityColor(workoutTypes[0]) };
    }
    // For multiple activities, show the first one but could also do gradient
    // For now, use the first activity's color with slightly higher opacity
    return { backgroundColor: getActivityColor(workoutTypes[0]) };
  };

  // Build tooltip text showing all activity types
  const getTooltipText = (day: { date: Date; count: number; workoutTypes: string[]; isEmpty: boolean }) => {
    if (day.isEmpty) return '';
    if (day.count === 0) {
      return `${format(day.date, 'MMM d, yyyy')}: No workouts`;
    }
    const typesText = day.workoutTypes
      .map(t => capitalizeWorkoutType(t))
      .join(', ');
    return `${format(day.date, 'MMM d, yyyy')}: ${day.count} workout${day.count !== 1 ? 's' : ''}\n${typesText}`;
  };

  return (
    <div className="col-span-12 card p-4 flex flex-col sm:flex-row gap-6">
      {/* Left side - stats */}
      <div className="flex flex-row sm:flex-col gap-4 sm:gap-6 min-w-[140px]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Activity</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">Last Year</p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-secondary)]">Current Streak</span>
          <span className="text-xl font-bold text-green-600 dark:text-green-400">
            {streakInfo?.current_streak ?? 0} days
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-secondary)]">Active Days</span>
          <span className="text-xl font-bold text-[var(--color-text-primary)]">
            {streakInfo?.active_days ?? 0}
          </span>
        </div>
      </div>

      {/* Right side - calendar grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Month labels */}
        <div className="flex text-xs text-[var(--color-text-secondary)] mb-2 relative h-4">
          {monthLabels.map((month, i) => (
            <span
              key={i}
              className="absolute"
              style={{ left: `${(month.position / weeks.length) * 100}%` }}
            >
              {month.name}
            </span>
          ))}
        </div>

        <div className="flex gap-2 flex-1 min-h-0">
          {/* Day labels */}
          <div className="flex flex-col justify-between text-[10px] text-[var(--color-text-secondary)] py-[2px]">
            <span>Mon</span>
            <span></span>
            <span>Wed</span>
            <span></span>
            <span>Fri</span>
            <span></span>
            <span></span>
          </div>

          {/* The grid itself - uses CSS Grid for GitHub-style layout */}
          <div className="contribution-grid flex-1">
            {weeks.map((week, weekIdx) =>
              week.map((day, dayIdx) => {
                const dateStr = day.isEmpty ? '' : format(day.date, 'yyyy-MM-dd');
                return (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={`day ${day.isEmpty ? 'empty' : day.count === 0 ? 'heat-0' : 'has-activity'}`}
                    style={day.count > 0 ? getDayStyle(day.workoutTypes, day.isEmpty) : undefined}
                    title={getTooltipText(day)}
                    onClick={() => !day.isEmpty && day.count > 0 && handleDayClick(dateStr, day.count)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Legend - show activity types */}
        <div className="flex flex-wrap items-center justify-end gap-3 mt-2 text-[10px] text-[var(--color-text-secondary)]">
          <span className="mr-1">Activity Types:</span>
          {legendTypes.length > 0 ? (
            legendTypes.map((type) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: getActivityColor(type) }}
                />
                <span>{capitalizeWorkoutType(type)}</span>
              </div>
            ))
          ) : (
            <span className="text-[var(--color-text-secondary)]">No activities yet</span>
          )}
        </div>
      </div>
    </div>
  );
}
