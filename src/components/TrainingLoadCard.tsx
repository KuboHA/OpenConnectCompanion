import { useMemo, useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore, calculateTSS } from '../stores/settingsStore';
import type { WorkoutSummary } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface DailyTSS {
  date: string;
  tss: number;
  workouts: number;
}

export default function TrainingLoadCard() {
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const getEstimatedMaxHR = useSettingsStore((state) => state.getEstimatedMaxHR);
  const restingHeartRate = useSettingsStore((state) => state.restingHeartRate);
  const openSettings = useSettingsStore((state) => state.openSettings);

  // Fetch recent workouts for training load calculation
  useEffect(() => {
    const fetchRecentWorkouts = async () => {
      try {
        const response = await invoke<{ workouts: WorkoutSummary[] }>('get_workouts', {
          page: 1,
          perPage: 100, // Get last 100 workouts for calculation
        });
        setRecentWorkouts(response.workouts);
      } catch (error) {
        console.error('Failed to fetch workouts for training load:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentWorkouts();
  }, []);

  const trainingData = useMemo(() => {
    const maxHR = getEstimatedMaxHR();
    const restHR = restingHeartRate ?? 60;

    // Calculate TSS for each workout
    const workoutTSS = recentWorkouts
      .filter((w) => w.duration_seconds && w.avg_heart_rate)
      .map((w) => {
        const durationMinutes = (w.duration_seconds ?? 0) / 60;
        const avgHR = w.avg_heart_rate ?? 0;
        const tss = calculateTSS(durationMinutes, avgHR, maxHR, restHR);
        
        return {
          date: w.start_time ? new Date(w.start_time).toISOString().split('T')[0] : '',
          tss,
          durationMinutes,
          avgHR,
        };
      })
      .filter((w) => w.date);

    // Aggregate TSS by day
    const dailyMap = new Map<string, DailyTSS>();
    workoutTSS.forEach((w) => {
      const existing = dailyMap.get(w.date);
      if (existing) {
        existing.tss += w.tss;
        existing.workouts += 1;
      } else {
        dailyMap.set(w.date, { date: w.date, tss: w.tss, workouts: 1 });
      }
    });

    // Get last 7 days for chart
    const today = new Date();
    const last7Days: DailyTSS[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const data = dailyMap.get(dateStr);
      last7Days.push({
        date: dateStr,
        tss: data?.tss ?? 0,
        workouts: data?.workouts ?? 0,
      });
    }

    // Calculate ATL (7-day average)
    const last7DaysTSS = last7Days.reduce((sum, d) => sum + d.tss, 0);
    const atl = Math.round(last7DaysTSS / 7);

    // Calculate CTL (42-day average) - we need more data
    const sortedDates = Array.from(dailyMap.keys()).sort();
    let ctlSum = 0;
    let ctlDays = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 42);
    
    sortedDates.forEach((date) => {
      if (new Date(date) >= cutoffDate) {
        ctlSum += dailyMap.get(date)?.tss ?? 0;
        ctlDays++;
      }
    });
    const ctl = ctlDays > 0 ? Math.round(ctlSum / Math.min(42, ctlDays)) : 0;

    // TSB = CTL - ATL
    const tsb = ctl - atl;

    // Calculate week-over-week trend
    const thisWeekTSS = last7DaysTSS;
    let lastWeekTSS = 0;
    for (let i = 13; i >= 7; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      lastWeekTSS += dailyMap.get(dateStr)?.tss ?? 0;
    }

    const weeklyChange = lastWeekTSS > 0 
      ? Math.round(((thisWeekTSS - lastWeekTSS) / lastWeekTSS) * 100) 
      : 0;

    return {
      dailyData: last7Days,
      atl,
      ctl,
      tsb,
      weeklyTSS: thisWeekTSS,
      weeklyChange,
    };
  }, [recentWorkouts, getEstimatedMaxHR, restingHeartRate]);

  const getTrendIcon = (change: number) => {
    if (change > 5) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
    if (change < -5) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="card p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Training Load</h3>
        </div>
        <div className="animate-pulse space-y-2 flex-1">
          <div className="h-24 bg-[var(--color-bg-secondary)] rounded" />
          <div className="h-4 bg-[var(--color-bg-secondary)] rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Training Load</h3>
        </div>
        <button
          onClick={openSettings}
          className="text-xs text-[var(--color-accent)] hover:underline"
        >
          Configure
        </button>
      </div>

      {/* Weekly TSS Chart */}
      <div className="flex-1 w-full min-h-[120px] mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trainingData.dailyData} barSize={16}>
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDay}
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value} TSS`, 'Load']}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Bar 
              dataKey="tss" 
              fill="#6366f1" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center mt-auto">
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            {trainingData.weeklyTSS}
          </p>
          <p className="text-[10px] text-[var(--color-text-secondary)] flex items-center justify-center gap-1">
            Week {getTrendIcon(trainingData.weeklyChange)}
          </p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
          <p className="text-lg font-bold text-orange-400">{trainingData.atl}</p>
          <p className="text-[10px] text-[var(--color-text-secondary)]">ATL</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
          <p className="text-lg font-bold text-blue-400">{trainingData.ctl}</p>
          <p className="text-[10px] text-[var(--color-text-secondary)]">CTL</p>
        </div>
      </div>

      <p className="text-[10px] text-[var(--color-text-secondary)] mt-2 text-center">
        TSB: {trainingData.tsb > 0 ? '+' : ''}{trainingData.tsb} · 
        {trainingData.tsb > 0 ? ' Fresher' : ' Building fatigue'}
      </p>
    </div>
  );
}
