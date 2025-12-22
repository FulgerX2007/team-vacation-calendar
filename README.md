# Team Vacation Calendar

A static web application for managing and visualizing employee vacation schedules. Runs entirely in the browser with no backend required.

![Team Vacation Calendar](TeamVacationCalendar_192x192.png)

## Features

### Employee Management
- Add, edit, and delete employees
- Auto-generated distinct colors for each employee
- Custom color picker for personalization

### Vacation Tracking
- Create vacations with start/end dates
- Optional descriptions for each vacation
- Edit and delete existing vacations
- Automatic date range synchronization

### Calendar Generation
- **Timeline View** (≤2 months): Horizontal timeline with employees as rows and colored vacation bars
- **Monthly Grid View** (>2 months): Traditional calendar layout with 3 months per row and colored dots
- High-quality PNG export (2x resolution)
- Weekend highlighting
- Legend showing vacation details

### Data Management
- All data stored in browser LocalStorage
- Export data to JSON for backup
- Import data from JSON files
- Clear all data option

## Usage

1. **Add Employees**: Enter employee name and pick a color (auto-suggested)
2. **Add Vacations**: Select an employee, choose dates, and optionally add a description
3. **Generate Calendar**: Select a date range and click "Generate Calendar"
4. **Download**: Click "Download PNG" to save the calendar image

## Deployment

### GitLab Pages

The application is configured for GitLab Pages deployment. Push to the default branch and it will automatically deploy.

### Manual Deployment

Simply serve the following files from any static web server:
- `index.html`
- `css/` directory
- `js/` directory
- `fonts/` directory
- `TeamVacationCalendar_192x192.png`

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Styling**: CSS3
- **Calendar Rendering**: HTML5 Canvas
- **Date Picker**: Flatpickr
- **Storage**: Browser LocalStorage
- **Fonts**: Roboto (bundled)

## Browser Support

Works in all modern browsers that support:
- ES6 Modules
- HTML5 Canvas
- LocalStorage
- CSS Grid/Flexbox

## License

MIT
