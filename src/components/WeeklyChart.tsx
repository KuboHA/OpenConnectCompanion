import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useWorkoutStore } from '../stores/workoutStore';

export default function WeeklyChart() {
  const weeklySummary = useWorkoutStore((state) => state.weeklySummary);

const getSQLiteWeekNum = (d: Date) => {
    // Logic to match SQLite %W: Week 00-53, starts on first Monday
    const year = d.getFullYear();
    const jan1 = new Date(year, 0, 1);
    
    // Find first Monday of year
    let firstMonday = new Date(jan1);
    while (firstMonday.getDay() !== 1) { // 1 = Monday
      firstMonday.setDate(firstMonday.getDate() + 1);
    }
    
    // If date is before first Monday, it's week 0
    // Reset hours to compare dates properly
    const checkDate = new Date(d);
    checkDate.setHours(0,0,0,0);
    firstMonday.setHours(0,0,0,0);
    
    if (checkDate < firstMonday) return 0;
    
    const diff = checkDate.getTime() - firstMonday.getTime();
    return 1 + Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  };

  // Generate last 5 weeks including current week
  const generateLast5Weeks = () => {
    const weeks: { week: string; count: number; fullWeek: string }[] = [];
    const now = new Date();
    
    // Adjust to specific day of week if needed (assume ISO week start Monday)
    // We'll iterate back 5 weeks
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      
      const weekNum = getSQLiteWeekNum(d);
      
      // Pad week num
      const weekStr = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      
      // Find matching data from summary
      const found = weeklySummary.find(w => w.week === weekStr);
      weeks.push({
        week: `W${weekNum}`,
        count: found ? found.count : 0,
        fullWeek: weekStr
      });
    }
    return weeks;
  };

  const data = generateLast5Weeks();

  // Calculate trend (compare current week to previous week)
  const currentWeek = data[data.length - 1]?.count ?? 0;
  const previousWeek = data[data.length - 2]?.count ?? 0;
  const trendPercent = previousWeek > 0 ? Math.round(((currentWeek - previousWeek) / previousWeek) * 100) : (currentWeek > 0 ? 100 : 0);
  const isPositive = trendPercent > 0;
  const isNeutral = trendPercent === 0;
  
  // Calculate average workouts per week
  const avgWorkouts = data.length > 0 
    ? (data.reduce((sum, d) => sum + d.count, 0) / data.length).toFixed(1)
    : '0';
  
  const avgValue = parseFloat(avgWorkouts);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  if (data.length === 0) {
    return (
      <div className="card p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Weekly Activity
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
          No workout data yet
        </div>
      </div>
    );
  }

  const TrendIcon = isNeutral ? Minus : (isPositive ? TrendingUp : TrendingDown);
  const trendColor = isNeutral ? 'text-[var(--color-text-secondary)]' : (isPositive ? 'text-emerald-500' : 'text-red-500');

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Weekly Activity
        </h3>
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span className="font-semibold">{isPositive ? '+' : ''}{trendPercent}%</span>
          <span className="text-[var(--color-text-secondary)] ml-1">vs last week</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-[80px] max-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.max(maxCount + 1, Math.ceil(avgValue) + 2)]}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
                padding: '6px 10px',
              }}
              itemStyle={{
                color: 'var(--color-text-primary)',
              }}
              formatter={(value) => [`${value} workouts`, '']}
            />
            <ReferenceLine 
              y={avgValue} 
              stroke="var(--color-text-secondary)" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-accent)', strokeWidth: 0, r: 4 }}
              activeDot={{ fill: 'var(--color-accent)', strokeWidth: 0, r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="text-xs text-[var(--color-text-secondary)] mt-2 flex items-center gap-2">
        <span><span className="font-semibold text-[var(--color-text-primary)]">{currentWeek}</span> this week</span>
        <span className="text-[var(--color-border)]">•</span>
        <span><span className="font-semibold text-[var(--color-text-primary)]">{avgWorkouts}</span> avg/week</span>
      </div>
    </div>
  );
}
