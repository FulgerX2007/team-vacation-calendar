# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Team Vacation Calendar is a pure static web application for managing employee vacations with calendar visualization. It runs entirely in the browser using HTML5 Canvas for rendering and LocalStorage for data persistence. No backend server is required.

**Live URL**: https://fulgerx2007.github.io/team-vacation-calendar/

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
└── style.css                       # Styling (Grid, Flexbox, holiday styles)
js/
├── app.js                          # Main app logic, UI event handlers, date pickers
├── calendar.js                     # HTML5 Canvas calendar rendering
├── storage.js                      # LocalStorage persistence layer
├── holidays.js                     # National holidays API integration
└── backup.js                       # JSON export/import functionality
fonts/
├── Roboto-Regular.ttf              # UI fonts
└── Roboto-Bold.ttf
.github/
└── workflows/
    └── deploy.yml                  # GitHub Pages deployment
TeamVacationCalendar_192x192.png    # Logo/favicon
```

**Data Flow**: User Input → Event Handlers (app.js) → Storage Module → LocalStorage → Canvas Rendering

## Core Modules

### storage.js
LocalStorage CRUD operations with auto-incrementing IDs:
- `getEmployees()`, `createEmployee()`, `updateEmployee()`, `deleteEmployee()`
- `getVacations()`, `createVacation()`, `updateVacation()`, `deleteVacation()`
- `getVacationsByDateRange()` - Filter vacations by date range

### calendar.js
HTML5 Canvas rendering with two view modes:
- **Timeline view**: For date ranges ≤31 days - horizontal bars showing vacation periods
- **Monthly grid view**: For date ranges ≥32 days - calendar grid with colored dots

Key constants:
- `MONTH_THRESHOLD_DAYS = 32` - Threshold for switching views
- `HOLIDAY_COLOR` / `WEEKEND_COLOR` - Background colors
- `PNG_SCALE = 2` - Export resolution multiplier

Key functions:
- `generateCalendar()` - Main export, routes to appropriate view
- `drawSideBySideLegend()` - Two-column legend (vacations left, holidays right)
- `buildHolidayMap()` - Convert holiday array to Map for O(1) lookup

### holidays.js
National holidays integration using Open Holidays API:
- `getPopularCountries()` - Returns 36 available countries
- `getHolidaysForDateRange()` - Fetch holidays with caching
- `getSelectedCountry()` / `setSelectedCountry()` - Persist user preference

API: `https://openholidaysapi.org/PublicHolidays`
Cache: 7-day expiration in LocalStorage

### app.js
UI logic including:
- Form handling for employees and vacations
- Flatpickr date pickers with range selection
- Country selector for holidays
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

**Holiday** (from API, cached in LocalStorage)
```javascript
{ date, name, localName, countryCode, type }
```

**LocalStorage Keys**:
- `employees` - Employee data
- `vacations` - Vacation data
- `vacation_calendar_holidays_cache` - Cached holiday data by country+date range
- `vacation_calendar_selected_country` - User's country preference

## Technology Stack

- **HTML5 Canvas**: Calendar rendering (replaces server-side image generation)
- **Vanilla JavaScript (ES6 Modules)**: No frameworks
- **CSS3**: Styling with Grid/Flexbox
- **LocalStorage API**: Client-side data persistence
- **Flatpickr**: Date picker library (loaded from CDN)
- **Open Holidays API**: National holidays data
- **Roboto Font**: Bundled TTF files

## Deployment

The application is deployed to GitHub Pages via GitHub Actions. The workflow (`.github/workflows/deploy.yml`) automatically deploys on push to master branch.

## Key Features

- Employee management with auto-generated colors
- Vacation tracking with date ranges and descriptions
- National holidays display (36+ countries)
- Two calendar views: timeline (≤31 days) and monthly grid (≥32 days)
- Interactive calendar visualization (PNG export supported)
- Data backup/restore via JSON files
- Fully offline-capable (all data stored locally)
- Holiday data cached for 7 days
