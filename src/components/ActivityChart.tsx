import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useWorkoutStore } from '../stores/workoutStore';
import { getActivityColor, capitalizeWorkoutType } from '../types';

export default function ActivityChart() {
  const activityBreakdown = useWorkoutStore((state) => state.activityBreakdown);

  const data = activityBreakdown.map((item) => ({
    name: capitalizeWorkoutType(item.name),
    value: item.count,
    color: getActivityColor(item.name),
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <div className="card p-4 h-full flex flex-col">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
          Activity Types
        </h3>
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
          No workout data yet
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
        Activity Types
      </h3>
      <div className="flex flex-col flex-1 min-h-[120px]">
        {/* Chart */}
        <div className="flex-1 w-full min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  padding: '6px 10px',
                }}
                itemStyle={{
                  color: 'var(--color-text-primary)',
                }}
                formatter={(value: number | undefined) => {
                  const val = value || 0;
                  return [`${val} (${Math.round((val / total) * 100)}%)`, ''];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[var(--color-text-secondary)] truncate">{item.name}</span>
              <span className="text-[var(--color-text-primary)] font-medium ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
