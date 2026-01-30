import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HRZone {
  name: string;
  min: number; // percentage of max HR
  max: number; // percentage of max HR
  color: string;
}

// Default HR zones based on percentage of max HR
export const DEFAULT_HR_ZONES: HRZone[] = [
  { name: 'Zone 1 (Recovery)', min: 50, max: 60, color: '#6b7280' },
  { name: 'Zone 2 (Aerobic)', min: 60, max: 70, color: '#3b82f6' },
  { name: 'Zone 3 (Tempo)', min: 70, max: 80, color: '#22c55e' },
  { name: 'Zone 4 (Threshold)', min: 80, max: 90, color: '#f97316' },
  { name: 'Zone 5 (Max)', min: 90, max: 100, color: '#ef4444' },
];

interface SettingsState {
  // User profile
  maxHeartRate: number | null;
  restingHeartRate: number | null;
  age: number | null;
  
  // HR Zones
  hrZones: HRZone[];
  useCustomZones: boolean;
  
  // Settings modal
  isSettingsOpen: boolean;
  
  // Actions
  setMaxHeartRate: (hr: number | null) => void;
  setRestingHeartRate: (hr: number | null) => void;
  setAge: (age: number | null) => void;
  setHRZones: (zones: HRZone[]) => void;
  setUseCustomZones: (use: boolean) => void;
  resetZonesToDefault: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  
  // Computed
  getEstimatedMaxHR: () => number;
  getZoneBoundaries: () => { zone: HRZone; minBpm: number; maxBpm: number }[];
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      maxHeartRate: null,
      restingHeartRate: null,
      age: null,
      hrZones: DEFAULT_HR_ZONES,
      useCustomZones: false,
      isSettingsOpen: false,

      // Actions
      setMaxHeartRate: (hr) => set({ maxHeartRate: hr }),
      setRestingHeartRate: (hr) => set({ restingHeartRate: hr }),
      setAge: (age) => set({ age }),
      setHRZones: (zones) => set({ hrZones: zones }),
      setUseCustomZones: (use) => set({ useCustomZones: use }),
      resetZonesToDefault: () => set({ hrZones: DEFAULT_HR_ZONES, useCustomZones: false }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),

      // Computed functions
      getEstimatedMaxHR: () => {
        const { maxHeartRate, age } = get();
        // If user has set max HR, use it
        if (maxHeartRate) return maxHeartRate;
        // If age is set, estimate using formula (220 - age)
        if (age) return 220 - age;
        // Default fallback
        return 190;
      },

      getZoneBoundaries: () => {
        const maxHR = get().getEstimatedMaxHR();
        const zones = get().hrZones;
        
        return zones.map((zone) => ({
          zone,
          minBpm: Math.round((zone.min / 100) * maxHR),
          maxBpm: Math.round((zone.max / 100) * maxHR),
        }));
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        maxHeartRate: state.maxHeartRate,
        restingHeartRate: state.restingHeartRate,
        age: state.age,
        hrZones: state.hrZones,
        useCustomZones: state.useCustomZones,
      }),
    }
  )
);

// Utility functions for training metrics

/**
 * Calculate TRIMP (Training Impulse) for a workout
 * Based on heart rate reserve method
 */
export function calculateTRIMP(
  durationMinutes: number,
  avgHR: number,
  maxHR: number,
  restingHR: number = 60,
  gender: 'male' | 'female' = 'male'
): number {
  const hrReserve = (avgHR - restingHR) / (maxHR - restingHR);
  const genderFactor = gender === 'male' ? 1.92 : 1.67;
  const trimp = durationMinutes * hrReserve * 0.64 * Math.exp(genderFactor * hrReserve);
  return Math.round(trimp);
}

/**
 * Calculate Training Stress Score (TSS) approximation
 * Simplified version based on duration and intensity
 */
export function calculateTSS(
  durationMinutes: number,
  avgHR: number,
  maxHR: number,
  restingHR: number = 60
): number {
  // Intensity Factor (IF) based on heart rate
  const hrReserve = (avgHR - restingHR) / (maxHR - restingHR);
  const intensityFactor = Math.min(hrReserve, 1);
  
  // TSS = (duration in hours * IF^2) * 100
  const durationHours = durationMinutes / 60;
  const tss = durationHours * Math.pow(intensityFactor, 2) * 100;
  
  return Math.round(tss);
}

/**
 * Calculate Acute Training Load (ATL) - 7 day rolling average
 */
export function calculateATL(recentTSSValues: number[]): number {
  if (recentTSSValues.length === 0) return 0;
  const last7Days = recentTSSValues.slice(-7);
  return Math.round(last7Days.reduce((sum, tss) => sum + tss, 0) / 7);
}

/**
 * Calculate Chronic Training Load (CTL) - 42 day rolling average
 */
export function calculateCTL(tssValues: number[]): number {
  if (tssValues.length === 0) return 0;
  const last42Days = tssValues.slice(-42);
  return Math.round(last42Days.reduce((sum, tss) => sum + tss, 0) / Math.min(42, last42Days.length));
}

/**
 * Calculate Training Status Balance (TSB) = CTL - ATL
 * Positive = Fresh, Negative = Fatigued
 */
export function calculateTSB(ctl: number, atl: number): number {
  return ctl - atl;
}

/**
 * Get recovery status based on TSB
 */
export function getRecoveryStatus(tsb: number): {
  status: 'recovered' | 'fresh' | 'optimal' | 'tired' | 'fatigued';
  label: string;
  color: string;
  description: string;
} {
  if (tsb > 25) {
    return {
      status: 'recovered',
      label: 'Well Recovered',
      color: '#22c55e',
      description: 'Ready for intense training',
    };
  } else if (tsb > 5) {
    return {
      status: 'fresh',
      label: 'Fresh',
      color: '#3b82f6',
      description: 'Good for quality workouts',
    };
  } else if (tsb >= -10) {
    return {
      status: 'optimal',
      label: 'Optimal',
      color: '#8b5cf6',
      description: 'Balanced training load',
    };
  } else if (tsb >= -25) {
    return {
      status: 'tired',
      label: 'Tired',
      color: '#f97316',
      description: 'Consider easier training',
    };
  } else {
    return {
      status: 'fatigued',
      label: 'Fatigued',
      color: '#ef4444',
      description: 'Rest recommended',
    };
  }
}

/**
 * Determine which HR zone a given heart rate falls into
 */
export function getHRZone(
  heartRate: number,
  maxHR: number,
  zones: HRZone[] = DEFAULT_HR_ZONES
): HRZone | null {
  const percentage = (heartRate / maxHR) * 100;
  
  for (const zone of zones) {
    if (percentage >= zone.min && percentage < zone.max) {
      return zone;
    }
  }
  
  // If above max zone
  if (percentage >= zones[zones.length - 1].max) {
    return zones[zones.length - 1];
  }
  
  return null;
}
