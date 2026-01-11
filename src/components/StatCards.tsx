import { Zap, TrendingUp, Clock, Flame } from 'lucide-react';
import { useWorkoutStore } from '../stores/workoutStore';

function formatDurationMinutes(seconds: number): string {
  if (!seconds) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function StatCards() {
  const monthlyStats = useWorkoutStore((state) => state.monthlyStats);

  const cards = [
    {
      title: 'Workouts',
      value: monthlyStats?.workouts ?? 0,
      subtitle: 'This month',
      icon: Zap,
      iconColor: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    },
    {
      title: 'Distance',
      value: `${(monthlyStats?.distance_km ?? 0).toFixed(1)} km`,
      subtitle: 'This month',
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: 'Duration',
      value: formatDurationMinutes(monthlyStats?.duration_seconds ?? 0),
      subtitle: 'This month',
      icon: Clock,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Calories',
      value: (monthlyStats?.calories ?? 0).toLocaleString(),
      subtitle: 'This month',
      icon: Flame,
      iconColor: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <>
      {cards.map((card) => (
        <div key={card.title} className="col-span-6 sm:col-span-3 card hover-lift p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
            <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              {card.title}
            </span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{card.value}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{card.subtitle}</p>
        </div>
      ))}
    </>
  );
}
