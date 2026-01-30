import { useEffect } from 'react';
import { useWorkoutStore } from './stores/workoutStore';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WorkoutModal from './components/WorkoutModal';
import ToastContainer from './components/ToastContainer';
import SettingsModal from './components/SettingsModal';

function Footer() {
  return (
    <footer className="mt-6 border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6">
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          <a 
            href="https://github.com/KuboHA/OpenConnectCompanion-tauri" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[var(--color-accent)] hover:underline"
          >
            OpenConnect Companion
          </a> · Independent open-source project
        </p>
      </div>
    </footer>
  );
}

function App() {
  const fetchDashboardData = useWorkoutStore((state) => state.fetchDashboardData);
  const isModalOpen = useWorkoutStore((state) => state.isModalOpen);

  useEffect(() => {
    // Always use dark theme
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl flex-1">
        <Dashboard />
      </main>
      <Footer />
      {isModalOpen && <WorkoutModal />}
      <SettingsModal />
      <ToastContainer />
    </div>
  );
}

export default App;
