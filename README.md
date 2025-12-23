# Team Vacation Calendar

A static web application for managing and visualizing employee vacation schedules. Runs entirely in the browser with no backend required.

![Team Vacation Calendar](TeamVacationCalendar_192x192.png)

**Live Demo**: [https://fulgerx2007.github.io/team-vacation-calendar/](https://fulgerx2007.github.io/team-vacation-calendar/)

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

### National Holidays
- Country selector with 36+ countries supported
- Holidays fetched from [Open Holidays API](https://www.openholidaysapi.org/)
- Holiday highlighting in calendar (red/pink background)
- Holiday legend with dates and names
- 7-day cache for offline use

### Calendar Generation
- **Timeline View** (up to 31 days): Horizontal timeline with employees as rows and colored vacation bars
- **Monthly Grid View** (32+ days): Traditional calendar layout with 3 months per row and colored dots
- Title shows date range for both views
- High-quality PNG export (2x resolution)
- Weekend highlighting (gray background)
- Holiday highlighting (red/pink background)
- Side-by-side legend: Vacation details (left) and Public holidays (right)

### Data Management
- All data stored in browser LocalStorage
- Export data to JSON for backup
- Import data from JSON files
- Clear all data option

## Usage

1. **Add Employees**: Enter employee name and pick a color (auto-suggested)
2. **Add Vacations**: Select an employee, choose dates, and optionally add a description
3. **Select Country** (optional): Choose a country to display national holidays
4. **Generate Calendar**: Select a date range and click "Generate Calendar"
5. **Download**: Click "Download PNG" to save the calendar image

## Deployment

### GitHub Pages

The application is deployed via GitHub Actions. Push to the `master` branch and it will automatically deploy to GitHub Pages.

### Manual Deployment

Simply serve the following files from any static web server:
- `index.html`
- `css/` directory
- `js/` directory
- `fonts/` directory
- `TeamVacationCalendar_192x192.png`

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Styling**: CSS3 (Grid/Flexbox)
- **Calendar Rendering**: HTML5 Canvas
- **Date Picker**: Flatpickr (CDN)
- **Holidays API**: Open Holidays API
- **Storage**: Browser LocalStorage
- **Fonts**: Roboto (bundled)

## Browser Support

Works in all modern browsers that support:
- ES6 Modules
- HTML5 Canvas
- LocalStorage
- CSS Grid/Flexbox
- Fetch API

## License

MIT
