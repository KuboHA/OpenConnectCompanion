import { useState } from 'react';
import { X, Heart, RefreshCw } from 'lucide-react';
import { useSettingsStore, DEFAULT_HR_ZONES, type HRZone } from '../stores/settingsStore';

export default function SettingsModal() {
  const {
    isSettingsOpen,
    closeSettings,
    maxHeartRate,
    setMaxHeartRate,
    restingHeartRate,
    setRestingHeartRate,
    age,
    setAge,
    hrZones,
    setHRZones,
    useCustomZones,
    setUseCustomZones,
    resetZonesToDefault,
    getEstimatedMaxHR,
    getZoneBoundaries,
  } = useSettingsStore();

  const [localMaxHR, setLocalMaxHR] = useState<string>(maxHeartRate?.toString() ?? '');
  const [localRestHR, setLocalRestHR] = useState<string>(restingHeartRate?.toString() ?? '');
  const [localAge, setLocalAge] = useState<string>(age?.toString() ?? '');
  const [localZones, setLocalZones] = useState<HRZone[]>(hrZones);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    // Save max HR
    const maxHR = localMaxHR ? parseInt(localMaxHR, 10) : null;
    if (maxHR === null || (maxHR >= 100 && maxHR <= 250)) {
      setMaxHeartRate(maxHR);
    }

    // Save resting HR
    const restHR = localRestHR ? parseInt(localRestHR, 10) : null;
    if (restHR === null || (restHR >= 30 && restHR <= 120)) {
      setRestingHeartRate(restHR);
    }

    // Save age
    const ageVal = localAge ? parseInt(localAge, 10) : null;
    if (ageVal === null || (ageVal >= 10 && ageVal <= 100)) {
      setAge(ageVal);
    }

    // Save zones if custom
    if (useCustomZones) {
      setHRZones(localZones);
    }

    closeSettings();
  };

  const handleZoneChange = (index: number, field: 'min' | 'max', value: string) => {
    const newZones = [...localZones];
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      newZones[index] = { ...newZones[index], [field]: numValue };
      setLocalZones(newZones);
    }
  };

  const handleResetZones = () => {
    setLocalZones(DEFAULT_HR_ZONES);
    resetZonesToDefault();
  };

  const estimatedMaxHR = getEstimatedMaxHR();
  const zoneBoundaries = getZoneBoundaries();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Training Settings
            </h2>
          </div>
          <button
            onClick={closeSettings}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* User Profile Section */}
          <section>
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
              User Profile
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  Age (years)
                </label>
                <input
                  type="number"
                  value={localAge}
                  onChange={(e) => setLocalAge(e.target.value)}
                  placeholder="e.g., 30"
                  min="10"
                  max="100"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                  Used to estimate max HR if not set
                </p>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  Max Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  value={localMaxHR}
                  onChange={(e) => setLocalMaxHR(e.target.value)}
                  placeholder={`Est: ${estimatedMaxHR}`}
                  min="100"
                  max="250"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                  Leave blank to auto-calculate
                </p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  Resting Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  value={localRestHR}
                  onChange={(e) => setLocalRestHR(e.target.value)}
                  placeholder="e.g., 60"
                  min="30"
                  max="120"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                  Used for accurate training load calculations
                </p>
              </div>
            </div>
          </section>

          {/* HR Zones Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                Heart Rate Zones
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetZones}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
                <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={useCustomZones}
                    onChange={(e) => setUseCustomZones(e.target.checked)}
                    className="rounded"
                  />
                  Custom zones
                </label>
              </div>
            </div>

            <div className="space-y-2">
              {localZones.map((zone, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg-secondary)]"
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-xs text-[var(--color-text-primary)] flex-1 truncate">
                    {zone.name}
                  </span>
                  {useCustomZones ? (
                    <>
                      <input
                        type="number"
                        value={zone.min}
                        onChange={(e) => handleZoneChange(index, 'min', e.target.value)}
                        className="w-14 px-2 py-1 text-xs rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-center text-[var(--color-text-primary)]"
                        min="0"
                        max="100"
                      />
                      <span className="text-xs text-[var(--color-text-secondary)]">-</span>
                      <input
                        type="number"
                        value={zone.max}
                        onChange={(e) => handleZoneChange(index, 'max', e.target.value)}
                        className="w-14 px-2 py-1 text-xs rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-center text-[var(--color-text-primary)]"
                        min="0"
                        max="100"
                      />
                      <span className="text-xs text-[var(--color-text-secondary)]">%</span>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {zoneBoundaries[index]?.minBpm}-{zoneBoundaries[index]?.maxBpm} bpm
                    </span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[10px] text-[var(--color-text-secondary)] mt-2">
              Current max HR: {estimatedMaxHR} bpm {!maxHeartRate && '(estimated)'}
            </p>
          </section>

          {/* Info Section */}
          <section className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
            <h4 className="text-xs font-medium text-[var(--color-text-primary)] mb-2">
              About Training Metrics
            </h4>
            <ul className="text-[10px] text-[var(--color-text-secondary)] space-y-1">
              <li>• <strong>TSS</strong>: Training Stress Score estimates workout intensity</li>
              <li>• <strong>ATL</strong>: Acute Training Load (7-day fatigue)</li>
              <li>• <strong>CTL</strong>: Chronic Training Load (42-day fitness)</li>
              <li>• <strong>TSB</strong>: Balance between fitness and fatigue</li>
              <li>• <strong>Recovery Score</strong>: Based on TSB, indicates readiness</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--color-border)]">
          <button
            onClick={closeSettings}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-accent)] rounded-lg hover:opacity-90 transition-opacity"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
