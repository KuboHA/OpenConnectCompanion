import { useMemo, useEffect, useState } from 'react';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryWarning, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore, calculateTSS, getRecoveryStatus } from '../stores/settingsStore';
import type { WorkoutSummary } from '../types';

interface RecoveryInfo {
  status: ReturnType<typeof getRecoveryStatus>;
  readinessScore: number;
  tsb: number;
  lastWorkoutHoursAgo: number | null;
  suggestedIntensity: string;
}

export default function RecoveryScoreCard() {
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const getEstimatedMaxHR = useSettingsStore((state) => state.getEstimatedMaxHR);
  const restingHeartRate = useSettingsStore((state) => state.restingHeartRate);
  const openSettings = useSettingsStore((state) => state.openSettings);

  useEffect(() => {
    const fetchRecentWorkouts = async () => {
      try {
        const response = await invoke<{ workouts: WorkoutSummary[] }>('get_workouts', {
          page: 1,
          perPage: 100,
        });
        setRecentWorkouts(response.workouts);
      } catch (error) {
        console.error('Failed to fetch workouts for recovery:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentWorkouts();
  }, []);

  const recoveryInfo = useMemo((): RecoveryInfo => {
    const maxHR = getEstimatedMaxHR();
    const restHR = restingHeartRate ?? 60;
    const now = new Date();

    // Calculate daily TSS
    const dailyTSS = new Map<string, number>();
    
    recentWorkouts
      .filter((w) => w.duration_seconds && w.avg_heart_rate && w.start_time)
      .forEach((w) => {
        const date = new Date(w.start_time!).toISOString().split('T')[0];
        const durationMinutes = (w.duration_seconds ?? 0) / 60;
        const avgHR = w.avg_heart_rate ?? 0;
        const tss = calculateTSS(durationMinutes, avgHR, maxHR, restHR);
        
        dailyTSS.set(date, (dailyTSS.get(date) ?? 0) + tss);
      });

    // Calculate ATL and CTL
    let atlSum = 0;
    let ctlSum = 0;
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const tss = dailyTSS.get(dateStr) ?? 0;
      
      if (i < 7) atlSum += tss;
      ctlSum += tss;
    }

    const atl = Math.round(atlSum / 7);
    const ctl = Math.round(ctlSum / Math.max(42, dailyTSS.size || 1));
    const tsb = ctl - atl;

    // Get recovery status
    const status = getRecoveryStatus(tsb);

    // Calculate readiness score (0-100)
    // Based on TSB normalized to a 0-100 scale
    // TSB of +25 or more = 100, TSB of -30 or less = 0
    const normalizedTSB = Math.max(-30, Math.min(25, tsb));
    const readinessScore = Math.round(((normalizedTSB + 30) / 55) * 100);

    // Find last workout time
    let lastWorkoutHoursAgo: number | null = null;
    if (recentWorkouts.length > 0 && recentWorkouts[0].start_time) {
      const lastWorkoutTime = new Date(recentWorkouts[0].start_time);
      lastWorkoutHoursAgo = Math.round((now.getTime() - lastWorkoutTime.getTime()) / (1000 * 60 * 60));
    }

    // Suggest intensity based on recovery status and time since last workout
    let suggestedIntensity = 'Moderate';
    if (status.status === 'recovered' || status.status === 'fresh') {
      suggestedIntensity = 'High intensity OK';
    } else if (status.status === 'optimal') {
      suggestedIntensity = 'Moderate training';
    } else if (status.status === 'tired') {
      suggestedIntensity = 'Easy/recovery day';
    } else {
      suggestedIntensity = 'Rest recommended';
    }

    // Adjust based on time since last workout
    if (lastWorkoutHoursAgo !== null && lastWorkoutHoursAgo < 12 && status.status !== 'recovered') {
      suggestedIntensity = 'Rest or easy activity';
    }

    return {
      status,
      readinessScore,
      tsb,
      lastWorkoutHoursAgo,
      suggestedIntensity,
    };
  }, [recentWorkouts, getEstimatedMaxHR, restingHeartRate]);

  const getBatteryIcon = (score: number) => {
    if (score >= 80) return <BatteryFull className="w-5 h-5" />;
    if (score >= 60) return <Battery className="w-5 h-5" />;
    if (score >= 40) return <BatteryMedium className="w-5 h-5" />;
    if (score >= 20) return <BatteryLow className="w-5 h-5" />;
    return <BatteryWarning className="w-5 h-5" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-blue-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-900/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Recovery</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-[var(--color-bg-secondary)] rounded" />
          <div className="h-4 bg-[var(--color-bg-secondary)] rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-900/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Recovery</h3>
        </div>
        <button
          onClick={openSettings}
          className="text-xs text-[var(--color-accent)] hover:underline"
        >
          Configure
        </button>
      </div>

      {/* Main Score Display */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${getScoreColor(recoveryInfo.readinessScore)}`}>
              {recoveryInfo.readinessScore}
            </span>
            <span className="text-sm text-[var(--color-text-secondary)]">/ 100</span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Readiness Score
          </p>
        </div>
        <div className={`${getScoreColor(recoveryInfo.readinessScore)}`}>
          {getBatteryIcon(recoveryInfo.readinessScore)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${recoveryInfo.readinessScore}%`,
            backgroundColor: recoveryInfo.status.color,
          }}
        />
      </div>

      {/* Status Badge */}
      <div 
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mb-2"
        style={{ 
          backgroundColor: `${recoveryInfo.status.color}20`,
          color: recoveryInfo.status.color,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: recoveryInfo.status.color }} />
        {recoveryInfo.status.label}
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs">
        <p className="text-[var(--color-text-secondary)]">
          {recoveryInfo.status.description}
        </p>
        <p className="text-[var(--color-text-primary)] font-medium">
          💡 {recoveryInfo.suggestedIntensity}
        </p>
        {recoveryInfo.lastWorkoutHoursAgo !== null && (
          <p className="text-[var(--color-text-secondary)]">
            Last workout: {recoveryInfo.lastWorkoutHoursAgo < 24 
              ? `${recoveryInfo.lastWorkoutHoursAgo}h ago`
              : `${Math.floor(recoveryInfo.lastWorkoutHoursAgo / 24)}d ago`
            }
          </p>
        )}
      </div>

      {/* TSB indicator */}
      <div className="mt-auto pt-2 border-t border-[var(--color-border)]">
        <p className="text-[10px] text-[var(--color-text-secondary)]">
          Training Stress Balance: {recoveryInfo.tsb > 0 ? '+' : ''}{recoveryInfo.tsb}
        </p>
      </div>
    </div>
  );
}
