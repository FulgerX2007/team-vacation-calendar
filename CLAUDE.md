# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Team Vacation Calendar is a pure static web application for managing employee vacations with calendar visualization. It runs entirely in the browser using HTML5 Canvas for rendering and LocalStorage for data persistence. No backend server is required.

## Development

```bash
# Open directly in browser
open index.html

# Or use any static server (e.g., Python)
python3 -m http.server 8080

# Or with Node.js
npx serve .
```

No build step is required - the application runs directly from source files.

## Architecture

```
index.html                          # Entry point - main HTML page
css/
└── style.css                       # Styling (Grid, Flexbox)
js/
├── app.js                          # Main app logic, UI event handlers, date pickers
├── calendar.js                     # HTML5 Canvas calendar rendering
├── storage.js                      # LocalStorage persistence layer
└── backup.js                       # JSON export/import functionality
fonts/
├── Roboto-Regular.ttf              # UI fonts
└── Roboto-Bold.ttf
TeamVacationCalendar_192x192.png    # Logo/favicon
```

**Data Flow**: User Input → Event Handlers (app.js) → Storage Module → LocalStorage → Canvas Rendering

## Core Modules

### storage.js
LocalStorage CRUD operations with auto-incrementing IDs:
- `getEmployees()`, `saveEmployee()`, `deleteEmployee()`
- `getVacations()`, `saveVacation()`, `deleteVacation()`

### calendar.js
HTML5 Canvas rendering with two view modes:
- **Timeline view**: For date ranges ≤61 days - horizontal bars showing vacation periods
- **Monthly grid view**: For date ranges >61 days - calendar grid with colored dots

### app.js
UI logic including:
- Form handling for employees and vacations
- Flatpickr date pickers with range selection
- Auto-sync of calendar dates with vacation data
- Auto-generated employee colors

### backup.js
Data portability:
- JSON export/import of all employees and vacations
- Clear all data functionality

## Data Structures

**Employee** (stored in LocalStorage key: `employees`)
```javascript
{ id, name, color, created_at, updated_at }
```

**Vacation** (stored in LocalStorage key: `vacations`)
```javascript
{ id, employee_id, start_date, end_date, description, created_at, updated_at }
```

## Technology Stack

- **HTML5 Canvas**: Calendar rendering (replaces server-side image generation)
- **Vanilla JavaScript (ES6 Modules)**: No frameworks
- **CSS3**: Styling with Grid/Flexbox
- **LocalStorage API**: Client-side data persistence
- **Flatpickr**: Date picker library (loaded from CDN)
- **Roboto Font**: Bundled TTF files

## Deployment

The application is deployed to GitHub Pages via GitHub Actions. The workflow (`.github/workflows/deploy.yml`) automatically deploys on push to master.

## Key Features

- Employee management with auto-generated colors
- Vacation tracking with date ranges and descriptions
- Interactive calendar visualization (PNG export supported)
- Data backup/restore via JSON files
- Fully offline-capable (all data stored locally)
