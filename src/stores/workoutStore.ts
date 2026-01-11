import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type {
  WorkoutSummary,
  WorkoutsResponse,
  Workout,
  Stats,
  MonthlyStats,
  StreakInfo,
  PersonalRecords,
  ContributionDay,
  WeeklySummary,
  ActivityBreakdown,
  ChartData,
  GpsPoint,
  UploadResult,
} from '../types';

interface WorkoutState {
  // Data
  workouts: WorkoutSummary[];
  selectedWorkout: Workout | null;
  chartData: ChartData | null;
  gpsData: GpsPoint[] | null;
  stats: Stats | null;
  monthlyStats: MonthlyStats | null;
  streakInfo: StreakInfo | null;
  personalRecords: PersonalRecords | null;
  contributionCalendar: ContributionDay[];
  weeklySummary: WeeklySummary[];
  activityBreakdown: ActivityBreakdown[];
  allTags: string[];
  
  // Pagination
  currentPage: number;
  totalWorkouts: number;
  perPage: number;
  
  // Filters
  workoutTypeFilter: string | null;
  tagFilter: string | null;
  
  // Loading states
  isLoading: boolean;
  isUploading: boolean;
  
  // Modal state
  isModalOpen: boolean;
  
  // Actions
  fetchWorkouts: () => Promise<void>;
  fetchWorkout: (id: number) => Promise<void>;
  fetchChartData: (id: number) => Promise<void>;
  fetchGpsData: (id: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchMonthlyStats: () => Promise<void>;
  fetchStreakInfo: () => Promise<void>;
  fetchPersonalRecords: () => Promise<void>;
  fetchContributionCalendar: () => Promise<void>;
  fetchWeeklySummary: () => Promise<void>;
  fetchActivityBreakdown: () => Promise<void>;
  fetchAllTags: () => Promise<void>;
  fetchDashboardData: () => Promise<void>;
  
  uploadFiles: (paths: string[]) => Promise<UploadResult[]>;
  deleteWorkout: (id: number) => Promise<boolean>;
  renameWorkout: (id: number, name: string) => Promise<boolean>;
  updateTags: (id: number, tags: string[]) => Promise<boolean>;
  
  setPage: (page: number) => void;
  setWorkoutTypeFilter: (type: string | null) => void;
  setTagFilter: (tag: string | null) => void;
  openModal: (workout: Workout) => void;
  closeModal: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  // Initial state
  workouts: [],
  selectedWorkout: null,
  chartData: null,
  gpsData: null,
  stats: null,
  monthlyStats: null,
  streakInfo: null,
  personalRecords: null,
  contributionCalendar: [],
  weeklySummary: [],
  activityBreakdown: [],
  allTags: [],
  currentPage: 1,
  totalWorkouts: 0,
  perPage: 15,
  workoutTypeFilter: null,
  tagFilter: null,
  isLoading: false,
  isUploading: false,
  isModalOpen: false,

  fetchWorkouts: async () => {
    const { currentPage, perPage, workoutTypeFilter, tagFilter } = get();
    set({ isLoading: true });
    try {
      const response = await invoke<WorkoutsResponse>('get_workouts', {
        page: currentPage,
        perPage,
        workoutType: workoutTypeFilter,
        tag: tagFilter,
      });
      set({
        workouts: response.workouts,
        totalWorkouts: response.total,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
      set({ isLoading: false });
    }
  },

  fetchWorkout: async (id: number) => {
    try {
      const workout = await invoke<Workout | null>('get_workout', { id });
      set({ selectedWorkout: workout });
    } catch (error) {
      console.error('Failed to fetch workout:', error);
    }
  },

  fetchChartData: async (id: number) => {
    try {
      const data = await invoke<ChartData | null>('get_workout_chart_data', { id });
      set({ chartData: data });
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  },

  fetchGpsData: async (id: number) => {
    try {
      const data = await invoke<GpsPoint[] | null>('get_workout_gps_data', { id });
      set({ gpsData: data });
    } catch (error) {
      console.error('Failed to fetch GPS data:', error);
    }
  },

  fetchStats: async () => {
    try {
      const stats = await invoke<Stats>('get_stats');
      set({ stats });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  fetchMonthlyStats: async () => {
    try {
      const monthlyStats = await invoke<MonthlyStats>('get_monthly_stats');
      set({ monthlyStats });
    } catch (error) {
      console.error('Failed to fetch monthly stats:', error);
    }
  },

  fetchStreakInfo: async () => {
    try {
      const streakInfo = await invoke<StreakInfo>('get_streak_info');
      set({ streakInfo });
    } catch (error) {
      console.error('Failed to fetch streak info:', error);
    }
  },

  fetchPersonalRecords: async () => {
    try {
      const records = await invoke<PersonalRecords>('get_personal_records');
      set({ personalRecords: records });
    } catch (error) {
      console.error('Failed to fetch personal records:', error);
    }
  },

  fetchContributionCalendar: async () => {
    try {
      const calendar = await invoke<ContributionDay[]>('get_contribution_calendar', { days: 365 });
      set({ contributionCalendar: calendar });
    } catch (error) {
      console.error('Failed to fetch contribution calendar:', error);
    }
  },

  fetchWeeklySummary: async () => {
    try {
      const summary = await invoke<WeeklySummary[]>('get_weekly_summary', { weeks: 8 });
      set({ weeklySummary: summary });
    } catch (error) {
      console.error('Failed to fetch weekly summary:', error);
    }
  },

  fetchActivityBreakdown: async () => {
    try {
      const breakdown = await invoke<ActivityBreakdown[]>('get_activity_breakdown');
      set({ activityBreakdown: breakdown });
    } catch (error) {
      console.error('Failed to fetch activity breakdown:', error);
    }
  },

  fetchAllTags: async () => {
    try {
      const tags = await invoke<string[]>('get_all_tags');
      set({ allTags: tags });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  },

  fetchDashboardData: async () => {
    const { fetchStats, fetchMonthlyStats, fetchStreakInfo, fetchPersonalRecords, fetchContributionCalendar, fetchWeeklySummary, fetchActivityBreakdown, fetchWorkouts, fetchAllTags } = get();
    await Promise.all([
      fetchStats(),
      fetchMonthlyStats(),
      fetchStreakInfo(),
      fetchPersonalRecords(),
      fetchContributionCalendar(),
      fetchWeeklySummary(),
      fetchActivityBreakdown(),
      fetchWorkouts(),
      fetchAllTags(),
    ]);
  },

  uploadFiles: async (paths: string[]) => {
    set({ isUploading: true });
    try {
      const results = await invoke<UploadResult[]>('upload_fit_files', { filePaths: paths });
      // Refresh data after upload
      get().fetchDashboardData();
      set({ isUploading: false });
      return results;
    } catch (error) {
      console.error('Failed to upload files:', error);
      set({ isUploading: false });
      return [];
    }
  },

  deleteWorkout: async (id: number) => {
    try {
      const success = await invoke<boolean>('delete_workout', { id });
      if (success) {
        get().fetchDashboardData();
        set({ isModalOpen: false, selectedWorkout: null });
      }
      return success;
    } catch (error) {
      console.error('Failed to delete workout:', error);
      return false;
    }
  },

  renameWorkout: async (id: number, name: string) => {
    try {
      const success = await invoke<boolean>('rename_workout', { id, name });
      if (success) {
        get().fetchWorkout(id);
        get().fetchWorkouts();
      }
      return success;
    } catch (error) {
      console.error('Failed to rename workout:', error);
      return false;
    }
  },

  updateTags: async (id: number, tags: string[]) => {
    try {
      const success = await invoke<boolean>('update_workout_tags', { id, tags });
      if (success) {
        get().fetchWorkout(id);
        get().fetchAllTags();
      }
      return success;
    } catch (error) {
      console.error('Failed to update tags:', error);
      return false;
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchWorkouts();
  },

  setWorkoutTypeFilter: (type: string | null) => {
    set({ workoutTypeFilter: type, currentPage: 1 });
    get().fetchWorkouts();
  },

  setTagFilter: (tag: string | null) => {
    set({ tagFilter: tag, currentPage: 1 });
    get().fetchWorkouts();
  },

  openModal: (workout: Workout) => {
    set({ selectedWorkout: workout, isModalOpen: true, chartData: null, gpsData: null });
    get().fetchChartData(workout.id);
    get().fetchGpsData(workout.id);
  },

  closeModal: () => {
    set({ isModalOpen: false, selectedWorkout: null, chartData: null, gpsData: null });
  },
}));
