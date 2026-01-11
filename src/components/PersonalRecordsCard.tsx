import { useWorkoutStore } from '../stores/workoutStore';

export default function PersonalRecordsCard() {
  const personalRecords = useWorkoutStore((state) => state.personalRecords);

  const records = [
    {
      label: 'Distance',
      value: personalRecords?.max_distance_km 
        ? `${(personalRecords.max_distance_km).toFixed(1)} km`
        : '--',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-400',
      textColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Duration',
      value: personalRecords?.max_duration_hours 
        ? `${(personalRecords.max_duration_hours).toFixed(1)} hrs`
        : '--',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-400',
      textColor: 'text-purple-700 dark:text-purple-300',
    },
    {
      label: 'Max HR',
      value: personalRecords?.max_heart_rate 
        ? `${personalRecords.max_heart_rate} bpm`
        : '--',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-400',
      textColor: 'text-red-700 dark:text-red-300',
    },
    {
      label: 'Speed',
      value: personalRecords?.max_speed_kmh 
        ? `${(personalRecords.max_speed_kmh).toFixed(1)} km/h`
        : '--',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-400',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Elevation',
      value: personalRecords?.max_elevation_gain 
        ? `${personalRecords.max_elevation_gain.toFixed(0)} m`
        : '--',
      bgColor: 'bg-sky-50 dark:bg-sky-900/20',
      borderColor: 'border-sky-400',
      textColor: 'text-sky-700 dark:text-sky-300',
    },
    {
      label: 'Calories',
      value: personalRecords?.max_calories 
        ? `${personalRecords.max_calories}`
        : '--',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-400',
      textColor: 'text-orange-700 dark:text-orange-300',
    },
  ];

  return (
    <div className="card hover-lift p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
        Personal Records
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
        {records.map((record) => (
          <div
            key={record.label}
            className={`flex flex-col justify-center p-3 rounded-lg ${record.bgColor} border-l-4 ${record.borderColor}`}
          >
            <p className={`text-[10px] font-medium ${record.textColor} uppercase tracking-wider`}>
              {record.label}
            </p>
            <p className="text-lg font-bold text-[var(--color-text-primary)] mt-0.5">
              {record.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
