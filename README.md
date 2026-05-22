# Jetski Trailer Competition Timer

A responsive, high-contrast, fully featured web application that compiles and manages competitor timings, course penalty tallies, disqualified registrations, and sponsor support backing pools for Jetski Trailer skill maneuvers.

---

## 🚀 Getting Started Locally

To run this project on your local machine, follow these instructions.

### 📋 Prerequisites

Ensure you have the following installed on your system:
- **Node.js** (v18.x or newer is recommended)
- **npm** (comes bundled with Node.js) or another preferred package manager (pnpm, yarn)

---

### 🔧 Installation & Setup

1. **Clone or Download the Project Workspace Files**  
   If you have downloaded the zipped project environment or are running it from a cloned repository, navigate directly to the root folder:
   ```bash
   cd jet-ski-trailer-competition-timer
   ```

2. **Install Project Dependencies**  
   Run the following command to download and install all required frontend utilities and UI elements (such as `lucide-react`, `react-router-dom`, etc.):
   ```bash
   npm install
   ```

3. **Configure Environment Variables**  
   Create a `.env` file in the root directory (using `.env.example` as a template) to declare any Appwrite server endpoints and project IDs, or skip it to run the app in **Local offline storage fallback mode**:
   ```bash
   cp .env.example .env
   ```
   *Note: If no connection keys are provided, you can instantly hit the "RUN OFFLINE fallbacks" selector button on the Home view to use continuous local browser memory registers.*

---

### 💻 Running the Development Server

To boot up the dynamic hot-reloading development preview, run:
```bash
npm run dev
```

By default, Vite will start the dev server at:
👉 **`http://localhost:5173`** *(or whichever port Vite automatically provisions if 5173 is occupied)*

---

### 📦 Building for Production

To compile a packed, fully optimized production-ready bundle of the static SPA frontend assets inside the `dist/` directory, execute:
```bash
npm run build
```

You can test the optimized build locally with:
```bash
npm run preview
```

---

## 🛠️ Features Overview

- **Dynamic Role Selector**: Swap permissions instantly between a read-only **Spectator** and an administrative **Course Marshal (Admin)** from the header controls.
- **Roster & Penalty Register**: Admins can register up to 20 competitors, start/stop timers, tally custom penalties (+5 seconds per infraction), or disqualify/reinstate pilots.
- **Sponsor Support Pool**: Authenticated spectators can select pending competitors to place supporting backup bids ($) on their specific runs (locked once a competitor's run starts or completes).
- **Leaderboards & Delta Graph**: Displays comprehensive rankings, raw course times vs. penalty margins, and historical challenge lookups. Provides a customized **Save Results as PDF** report generator.
