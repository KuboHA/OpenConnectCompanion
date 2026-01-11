import StatCards from './StatCards';
import ContributionCalendar from './ContributionCalendar';
import ActivityChart from './ActivityChart';
import WeeklyChart from './WeeklyChart';
import PersonalRecordsCard from './PersonalRecordsCard';
import WorkoutList from './WorkoutList';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-min">
      {/* Row 1: Stats cards across the top */}
      <StatCards />

      {/* Row 2: Activity Grid (full width) */}
      <ContributionCalendar />

      {/* Row 3: Analytics + Personal Records */}
      <div className="col-span-6 lg:col-span-3">
        <ActivityChart />
      </div>
      <div className="col-span-6 lg:col-span-3">
        <WeeklyChart />
      </div>
      <div className="col-span-12 lg:col-span-6">
        <PersonalRecordsCard />
      </div>

      {/* Row 4: Recent Workouts (full width) */}
      <div className="col-span-12">
        <WorkoutList />
      </div>
    </div>
  );
}

