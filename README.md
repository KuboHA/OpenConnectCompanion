# OpenConnect Companion (Tauri)

**OpenConnectCompanion-Tauri** is a cross-platform native desktop application for synchronizing, analyzing, and visualizing data from Garmin smartwatches, cycling computers, and Strava Activities.

It aims to provide a feature set identical to **Garmin Connect™**, while staying lightweight, fully open-source, and free from unnecessary bloat. OpenConnectCompanion is privacy-first (all data stays on your device) and does not rely on any Garmin services.

## Installation

The easiest way to install OpenConnect Companion is to download the latest release for your operating system from the [GitHub Releases page](https://github.com/KuboHA/OpenConnectCompanion-tauri/releases).

### Windows
1. Download the `.msi` or `.exe` installer (e.g., `OpenConnect_Companion_x.x.x_x64_en-US.msi`).
2. Run the installer and follow the prompts.

### macOS
1. Download the `.dmg` file.
2. Open the disk image and drag the application to your Applications folder.

### Linux
We provide AppImage and Debian packages:
- **AppImage**: Download the `.AppImage` file, make it executable (`chmod +x OpenConnect_Companion_*.AppImage`), and run it.
- **Debian/Ubuntu**: Download the `.deb` file and install it using `sudo dpkg -i OpenConnect_Companion_*.deb` or your package manager.

## Features

- **Dashboard** with stats overview, contribution calendar, activity breakdown, and weekly trends
- **Interactive Maps** with GPS route visualization
- **Performance Charts** for heart rate, speed, power, and cadence
- **Personal Records** tracking
- **Tag System** for organizing workouts
- **Training Analytics**:
  - **HR Zones**: Time-in-zone analysis based on configurable Heart Rate zones.
  - **Training Load**: Tracks fitness (CTL), fatigue (ATL), and form (TSB).
  - **Recovery Score**: Estimates readiness to train based on Training Stress Balance.
- **Offline & Private**: SQLite database stored locally; no cloud upload required.

## Training Metrics Explained

OpenConnect Companion uses standard impulse-response models to estimate your fitness and fatigue.

### Training Stress Score (TSS)
TSS quantifies the workload of a single session. Since power meters are not always available, we estimate TSS using **Heart Rate Reserve (HRR)**:   
$$ \text{HRR} = \frac{\text{Avg HR} - \text{Resting HR}}{\text{Max HR} - \text{Resting HR}} $$
$$ \text{TSS} = (\text{Duration (hours)} \times \text{HRR}^2) \times 100 $$

The specific stress score (TSS) for each individual workout is calculated using your Heart Rate Reserve (Max HR - Resting HR). If your resting heart rate drops as you get fitter, you should update it in Settings.

### Acute Training Load (ATL) - "Fatigue"
An exponentially weighted average of TSS over the last **7 days**. It represents how tired you are currently.

### Chronic Training Load (CTL) - "Fitness"
The system calculates a **42-day** rolling average of your training load. This represents your baseline "Fitness." As you train consistently over weeks, this number rises, effectively teaching the system that your body is accustomed to more work.

### Training Stress Balance (TSB) - "Form"
$$ \text{TSB} = \text{CTL} - \text{ATL} $$
- **Positive (> +5)**: You are fresh and ready to perform ("tapered").
- **Neutral (-10 to +5)**: Optimal training zone.
- **Negative (< -10)**: You are accumulating fatigue (overreaching).
- **Deep Negative (< -30)**: High risk of overtraining.

A high-volume training week (high Fatigue) that would crush a beginner (low Fitness) might result in a TSB of -50 (Fatigued).
However, for an athlete with high Fitness (high CTL), that same training week might only result in a TSB of -10 (Optimal).
Because your Accumulated Fitness is subtracted from your Recent Fatigue, a fitter athlete can absorb much more training load while remaining in a "Recovered" or "Optimal" state.

## Building from Source

If you prefer to build the application yourself or want to contribute, follow these steps.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (latest stable)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Building

```bash
# Build for production
npm run tauri build
```

This creates installers in `src-tauri/target/release/bundle/`.

## Tech Stack

### Frontend
- **React 19.2** with TypeScript
- **Vite**
- **TailwindCSS**
- **Zustand**
- **Recharts** & **React-Leaflet**

### Backend (Rust)
- **Tauri 2.x**
- **rusqlite**
- **fitparser**

## License

MIT License - see [LICENSE](../LICENSE) for details.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

> OpenConnectCompanion is an independent open-source project and is not affiliated with or endorsed by Garmin Ltd. or its subsidiaries.
