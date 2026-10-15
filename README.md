# FocusFlow — Smart Study Planner & Focus Station

> A premium, minimal productivity dashboard designed specifically for students, researchers, and self-learners. Combines an intelligent study task manager with a synchronized 25-minute Pomodoro focus station.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![Vanilla JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Web)-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## ✨ Features

### 🎯 1. Study Task Management (Full CRUD)
- **Add Tasks**: Set title, study category, priority, due date, estimated focus sessions (Pomodoros), and detailed notes.
- **Edit Tasks**: Update tasks anytime via the modal dialog.
- **Mark Complete**: Instant checkbox completion with smooth strike-through animation, completion timestamp, and celebratory sound option.
- **Delete Tasks**: Remove unwanted or outdated tasks with immediate state synchronization.
- **Link with Timer**: Click the focus crosshair icon on any study task to link it directly to the active focus session.

### ⏱️ 2. Pomodoro Focus Station
- **Preset Modes**: 25-minute Focus, 5-minute Short Break, and 15-minute Long Break.
- **Precision Controls**: Start, Pause, Resume, and Reset buttons.
- **Circular SVG Gauge**: Smoothly renders remaining time along a curved stroke.
- **Refresh & Tab Safe**: Calculates remaining time against absolute Unix timestamps (`targetEndTime`) in `localStorage`. If you refresh or close the tab, the timer continues accurately without skipping or drifting.
- **Duplicate Interval Guard**: Clears any existing timer interval before starting another, preventing runaway intervals.
- **Web Audio API Synth Chime**: Synthesizes a calming three-tone chime (E5 &rarr; B5 &rarr; E6) on session completion without requiring external `.mp3` files or network bandwidth.
- **Dynamic Document Title**: Updates browser tab title with active countdown (e.g. `(24:45) FocusFlow`).

### 🔍 3. Filter, Search & Sort
- **Multi-Field Search**: Real-time matching across task titles, notes, and categories.
- **Status Tabs**: Filter by `All`, `Active`, and `Completed` with live numeric badges.
- **Category Filter**: Filter by `Revision`, `Problem Sets`, `Reading`, `Coding`, `Writing`, `Research`, and `Exam Prep`.
- **Flexible Sorting**: Sort by Due Date (soonest first), Priority (High to Low), Alphabetical (A–Z), or Recently Added.

### 📊 4. Progress Tracking & Metrics
- **Dynamic Progress Bar**: Live completion bar that smoothly transitions between violet and emerald.
- **Counter Grid**: Instant breakdown of total, remaining active, and completed tasks with completion percentage.
- **Daily Focus Stats**: Automatically tallies completed focus sessions and total minutes focused for today.

### 💾 5. Offline Persistence
- Persists all study tasks, daily stats, audio preferences, and timer states in `localStorage`.
- Includes sensible starter sample data for first-time visits and a "Load Samples" quick reset button.

---

## 🎨 Design System

- **Charcoal Palette**: Dark minimal surfaces (`#0b0d12`, `#12151c`, `#171b24`) reducing eye strain during late-night study sessions.
- **Violet Accents**: Crisp accents (`#8b5cf6`, `#a78bfa`) providing high visual hierarchy without sensory overload.
- **Typography**: Clean, readable sans-serif pairing (`Plus Jakarta Sans`) with monospace digits (`JetBrains Mono`).
- **Responsive Layout**: Desktop dual-column view (sticky focus station on the left, planner on the right) collapsing into a unified touch-optimized column on mobile devices.

---

## 🚀 Quick Start / Setup Instructions

Since FocusFlow is built using pure HTML, CSS, and Vanilla JavaScript, there are **no build tools, node_modules, or API keys required**.

### Option A: Open Directly in Browser
Simply double-click `index.html` or open it with any modern web browser (Chrome, Edge, Firefox, Safari).

### Option B: Run with a Local Static Server

#### Using Python:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

#### Using Node.js (`npx serve` or `http-server`):
```bash
npx serve .
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>N</kbd> | Open New Task modal dialog |
| <kbd>Space</kbd> | Toggle timer (Start / Pause / Resume) |
| <kbd>/</kbd> | Focus global task search bar |
| <kbd>Esc</kbd> | Close active modal dialog |

---

## 🧪 Testing Performed

FocusFlow was systematically tested across all key scenarios:

1. **Task CRUD Verification**:
   - Creating tasks with empty/whitespace titles triggers inline validation and highlights the input.
   - Creating valid tasks prepends them to the task list and recalculates total and remaining counters.
   - Editing changes fields in-place without duplicating records.
   - Deleting removes the task and unlinks it from the timer if currently linked.
   - Toggling complete/incomplete updates the progress bar and status filter badges in real-time.
2. **Timer State & Persistence**:
   - Starting a 25-minute timer counts down by 1 second intervals.
   - Switching modes (25m Focus, 5m Short Break, 15m Long Break) resets duration and updates SVG stroke offset.
   - Refreshing during an active timer recalculates remaining time from `targetEndTime` without losing seconds or spawning duplicate intervals.
   - Timer completion plays the Web Audio chime and increments daily metrics.
3. **Filter & Search Synergy**:
   - Combining status filter ("Active") with category filter and search query displays only matching items.
   - Empty state dynamically changes message and CTA depending on whether tasks are cleared or just filtered out.
4. **Mobile & Viewport Responsiveness**:
   - Tested at 1240px (desktop dual-column), 860px (tablet single-column), and 375px–480px (mobile compact).

---

## 📄 License

MIT License. Free to use, adapt, and build upon.
