# OpenConnect Companion (Tauri)

**OpenConnectCompanion-Tauri** is a cross-platform native desktop application for synchronizing, analyzing, and visualizing data from Garmin smartwatches, cycling computers, and Strava Activities.

It aims to provide a feature set identical to **Garmin Connect™**, while staying lightweight, fully open-source, and free from unnecessary bloat. OpenConnectCompanion is privacy-first (all data stays on your device) and does not rely on any Garmin services.

## Installation

The easiest way to install OpenConnect Companion is to download the latest release for your operating system from the [GitHub Releases page](https://github.com/janmarkus-dev/OpenConnectCompanion/releases).

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
- **Offline & Private**: SQLite database stored locally; no cloud upload required.

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
