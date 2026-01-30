import StatCards from './StatCards';
import ContributionCalendar from './ContributionCalendar';
import ActivityChart from './ActivityChart';
import WeeklyChart from './WeeklyChart';
import PersonalRecordsCard from './PersonalRecordsCard';
import WorkoutList from './WorkoutList';
import TrainingLoadCard from './TrainingLoadCard';
import RecoveryScoreCard from './RecoveryScoreCard';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-min">
      {/* Row 1: Stats cards across the top */}
      <StatCards />

      {/* Row 2: Activity Grid (full width) */}
      <ContributionCalendar />

      {/* Row 3: Analytics + Personal Records + Training Metrics */}
      <div className="col-span-6 lg:col-span-3">
        <ActivityChart />
      </div>
      <div className="col-span-6 lg:col-span-3">
        <WeeklyChart />
      </div>
      <div className="col-span-6 lg:col-span-3">
        <TrainingLoadCard />
      </div>
      <div className="col-span-6 lg:col-span-3">
        <RecoveryScoreCard />
      </div>

      {/* Row 4: Personal Records (full width) */}
      <div className="col-span-12">
        <PersonalRecordsCard />
      </div>

      {/* Row 5: Recent Workouts (full width) */}
      <div className="col-span-12">
        <WorkoutList />
      </div>
    </div>
  );
}

