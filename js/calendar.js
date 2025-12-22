/**
 * Canvas-based calendar rendering module
 * Ports the Go fogleman/gg implementation to HTML5 Canvas
 */

// Constants matching calendar.go:32-38
const LEFT_MARGIN = 150;
const TOP_MARGIN = 60;
const ROW_HEIGHT = 40;
const DAY_WIDTH = 30;
const HEADER_HEIGHT = 50;
const BOTTOM_PADDING = 20;

// Legend constants
const LEGEND_ROW_HEIGHT = 25;
const LEGEND_PADDING = 30;
const LEGEND_BADGE_SIZE = 14;

// Colors
const WEEKEND_COLOR = '#F0F0F0';
const GRID_COLOR = '#C8C8C8';
const DEFAULT_EMPLOYEE_COLOR = '#3498db';
const HOLIDAY_COLOR = 'rgba(231, 76, 60, 0.25)';
const HOLIDAY_BORDER_COLOR = '#e74c3c';

// Month names for header
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Monthly grid view constants
const MONTH_THRESHOLD_DAYS = 61;
const MONTHS_PER_ROW = 3;
const MONTH_GRID_PADDING = 20;
const MONTH_TITLE_HEIGHT = 30;
const WEEKDAY_HEADER_HEIGHT = 25;
const DAY_CELL_SIZE = 28;
const DOT_RADIUS = 4;
const DOT_SPACING = 2;
const MAX_DOTS_PER_ROW = 3;
const MAX_DOT_ROWS = 2;
const MONTH_HORIZONTAL_GAP = 30;
const MONTH_VERTICAL_GAP = 40;
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// PNG quality - higher value = better quality
const PNG_SCALE = 2;

let fontsLoaded = false;

/**
 * Ensure fonts are loaded before drawing
 */
async function ensureFontsLoaded() {
    if (fontsLoaded) return;

    if (document.fonts) {
        await document.fonts.ready;

        try {
            const robotoRegular = new FontFace('Roboto', 'url(fonts/Roboto-Regular.ttf)');
            const robotoBold = new FontFace('Roboto', 'url(fonts/Roboto-Bold.ttf)', { weight: '700' });

            const [regular, bold] = await Promise.all([
                robotoRegular.load(),
                robotoBold.load()
            ]);

            document.fonts.add(regular);
            document.fonts.add(bold);
        } catch (e) {
            console.warn('Could not load Roboto fonts, using fallback:', e);
        }
    }

    fontsLoaded = true;
}

/**
 * Calculate days between two dates
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {number} Number of days (inclusive)
 */
function calculateDays(from, to) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((to - from) / msPerDay) + 1;
}

/**
 * Check if a date is a weekend
 * @param {Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Build holiday lookup map from array
 * @param {Array} holidays - Array of holiday objects from API
 * @returns {Map} Map of date string (YYYY-MM-DD) to holiday object
 */
function buildHolidayMap(holidays) {
    const map = new Map();
    if (!holidays || holidays.length === 0) return map;
    holidays.forEach(h => {
        map.set(h.date, h);
    });
    return map;
}

/**
 * Check if date range requires monthly grid view
 */
function shouldUseMonthlyGridView(fromDate, toDate) {
    const days = calculateDays(fromDate, toDate);
    return days > MONTH_THRESHOLD_DAYS;
}

/**
 * Get the day of week for the first day of a month (Monday=0, Sunday=6)
 */
function getFirstDayOfWeek(year, month) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0 based
}

/**
 * Get all months in a date range
 */
function getMonthsInRange(fromDate, toDate) {
    const months = [];
    let current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

    while (current <= endMonth) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        months.push({
            year,
            month,
            name: MONTH_NAMES[month],
            fullName: `${MONTH_NAMES[month]} ${year}`,
            daysInMonth,
            firstDayOfWeek: getFirstDayOfWeek(year, month),
            startDate: new Date(year, month, 1),
            endDate: new Date(year, month, daysInMonth)
        });

        current.setMonth(current.getMonth() + 1);
    }
    return months;
}

/**
 * Format date as YYYY-MM-DD key
 */
function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Build vacation lookup map by date
 */
function buildVacationDayMap(vacations) {
    const dayMap = new Map();

    vacations.forEach(v => {
        const start = new Date(v.start_date + 'T00:00:00');
        const end = new Date(v.end_date + 'T00:00:00');
        const current = new Date(start);

        while (current <= end) {
            const dateKey = formatDateKey(current);
            if (!dayMap.has(dateKey)) {
                dayMap.set(dateKey, []);
            }
            dayMap.get(dateKey).push({
                empId: v.employee_id,
                color: parseHexColor(v.employee?.color),
                name: v.employee?.name || 'Unknown'
            });
            current.setDate(current.getDate() + 1);
        }
    });

    return dayMap;
}

/**
 * Calculate canvas dimensions for monthly grid view
 */
function calculateMonthlyGridDimensions(months, vacationCount, holidayCount = 0) {
    const numRows = Math.ceil(months.length / MONTHS_PER_ROW);
    const numCols = Math.min(months.length, MONTHS_PER_ROW);

    const monthWidth = 7 * DAY_CELL_SIZE;
    const maxWeekRows = 6;
    const monthHeight = MONTH_TITLE_HEIGHT + WEEKDAY_HEADER_HEIGHT + (maxWeekRows * DAY_CELL_SIZE);

    const gridWidth = numCols * monthWidth + (numCols - 1) * MONTH_HORIZONTAL_GAP;
    const gridHeight = numRows * monthHeight + (numRows - 1) * MONTH_VERTICAL_GAP;

    const vacationLegendHeight = vacationCount > 0
        ? LEGEND_PADDING + 45 + vacationCount * LEGEND_ROW_HEIGHT
        : 0;

    const holidayLegendHeight = holidayCount > 0
        ? LEGEND_PADDING + 45 + holidayCount * LEGEND_ROW_HEIGHT
        : 0;

    const width = MONTH_GRID_PADDING * 2 + gridWidth;
    const height = TOP_MARGIN + gridHeight + BOTTOM_PADDING + vacationLegendHeight + holidayLegendHeight + MONTH_GRID_PADDING;

    return {
        width: Math.max(width, 600),
        height: Math.max(height, 400),
        monthWidth,
        monthHeight,
        gridWidth,
        gridHeight,
        numRows,
        numCols,
        vacationLegendHeight
    };
}

/**
 * Parse hex color to ensure it's valid
 * @param {string} hex - Hex color string
 * @returns {string} Valid hex color
 */
function parseHexColor(hex) {
    if (!hex || hex.length === 0) {
        return DEFAULT_EMPLOYEE_COLOR;
    }
    if (hex[0] === '#') {
        hex = hex.substring(1);
    }
    if (hex.length !== 6) {
        return DEFAULT_EMPLOYEE_COLOR;
    }
    return '#' + hex;
}

/**
 * Draw rounded rectangle
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Draw white background
 */
function drawBackground(ctx, width, height) {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
}

/**
 * Draw title "Team Vacation Calendar"
 */
function drawTitle(ctx, width) {
    ctx.fillStyle = 'black';
    ctx.font = 'bold 18px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Team Vacation Calendar', width / 2, 25);
}

/**
 * Draw weekend background columns
 */
function drawWeekendBackground(ctx, fromDate, days, employeeCount) {
    ctx.fillStyle = WEEKEND_COLOR;

    for (let i = 0; i < days; i++) {
        const date = new Date(fromDate);
        date.setDate(date.getDate() + i);

        if (isWeekend(date)) {
            const x = LEFT_MARGIN + i * DAY_WIDTH;
            const y = TOP_MARGIN + HEADER_HEIGHT;
            const h = employeeCount * ROW_HEIGHT;
            ctx.fillRect(x, y, DAY_WIDTH, h);
        }
    }
}

/**
 * Draw holiday background columns (timeline view)
 */
function drawHolidayBackground(ctx, fromDate, days, employeeCount, holidayMap) {
    if (!holidayMap || holidayMap.size === 0) return;

    for (let i = 0; i < days; i++) {
        const date = new Date(fromDate);
        date.setDate(date.getDate() + i);
        const dateKey = formatDateKey(date);

        if (holidayMap.has(dateKey)) {
            const x = LEFT_MARGIN + i * DAY_WIDTH;
            const y = TOP_MARGIN + HEADER_HEIGHT;
            const h = employeeCount * ROW_HEIGHT;

            // Draw holiday background
            ctx.fillStyle = HOLIDAY_COLOR;
            ctx.fillRect(x, y, DAY_WIDTH, h);

            // Draw top border indicator
            ctx.strokeStyle = HOLIDAY_BORDER_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, TOP_MARGIN + HEADER_HEIGHT);
            ctx.lineTo(x + DAY_WIDTH, TOP_MARGIN + HEADER_HEIGHT);
            ctx.stroke();
        }
    }
}

/**
 * Draw date headers (day numbers and month names)
 */
function drawDateHeaders(ctx, fromDate, days) {
    ctx.fillStyle = 'black';
    ctx.font = '12px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < days; i++) {
        const date = new Date(fromDate);
        date.setDate(date.getDate() + i);

        const x = LEFT_MARGIN + i * DAY_WIDTH + DAY_WIDTH / 2;

        // Day number
        ctx.fillText(date.getDate().toString(), x, TOP_MARGIN + 15);

        // Month name (on first day of month or first column)
        if (date.getDate() === 1 || i === 0) {
            ctx.fillText(MONTH_NAMES[date.getMonth()], x, TOP_MARGIN + 35);
        }
    }
}

/**
 * Draw employee names and vacation bars
 */
function drawEmployeeRows(ctx, employees, vacationMap, fromDate, toDate, days) {
    ctx.font = '12px Roboto, sans-serif';
    ctx.textBaseline = 'middle';

    employees.forEach((emp, i) => {
        const y = TOP_MARGIN + HEADER_HEIGHT + i * ROW_HEIGHT;

        // Employee name (right-aligned in left margin)
        ctx.fillStyle = 'black';
        ctx.textAlign = 'right';
        ctx.fillText(emp.name, LEFT_MARGIN - 10, y + ROW_HEIGHT / 2);

        // Draw vacation bars for this employee
        const empVacations = vacationMap.get(emp.id) || [];
        empVacations.forEach(v => {
            drawVacationBar(ctx, v.start, v.end, fromDate, toDate, y, parseHexColor(emp.color));
        });
    });
}

/**
 * Draw a single vacation bar
 */
function drawVacationBar(ctx, startDate, endDate, fromDate, toDate, y, color) {
    // Clip dates to visible range
    let start = new Date(startDate);
    let end = new Date(endDate);
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (start < from) start = from;
    if (end > to) end = to;

    const msPerDay = 24 * 60 * 60 * 1000;
    const startDay = Math.floor((start - from) / msPerDay);
    const endDay = Math.floor((end - from) / msPerDay) + 1;

    const x = LEFT_MARGIN + startDay * DAY_WIDTH;
    const w = (endDay - startDay) * DAY_WIDTH;
    const h = ROW_HEIGHT - 10;
    const barY = y + 5;

    ctx.fillStyle = color;
    roundRect(ctx, x + 2, barY, w - 4, h, 5);
    ctx.fill();
}

/**
 * Draw grid lines
 */
function drawGrid(ctx, days, employeeCount) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let i = 0; i <= days; i++) {
        const x = LEFT_MARGIN + i * DAY_WIDTH;
        const y1 = TOP_MARGIN + HEADER_HEIGHT;
        const y2 = TOP_MARGIN + HEADER_HEIGHT + employeeCount * ROW_HEIGHT;

        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= employeeCount; i++) {
        const y = TOP_MARGIN + HEADER_HEIGHT + i * ROW_HEIGHT;
        const x1 = LEFT_MARGIN;
        const x2 = LEFT_MARGIN + days * DAY_WIDTH;

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
    }
}

/**
 * Format date for legend display
 */
function formatLegendDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Draw legend section at the bottom of the calendar
 */
function drawLegend(ctx, vacations, startY, width) {
    if (!vacations || vacations.length === 0) {
        return;
    }

    // Draw separator line
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, startY);
    ctx.lineTo(width - 20, startY);
    ctx.stroke();

    // Draw legend title
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Vacation Details:', 20, startY + 20);

    // Draw each vacation entry
    ctx.font = '12px Roboto, sans-serif';

    vacations.forEach((v, i) => {
        const y = startY + 45 + i * LEGEND_ROW_HEIGHT;
        let x = 20;

        // Color badge
        ctx.fillStyle = parseHexColor(v.employee?.color);
        roundRect(ctx, x, y - LEGEND_BADGE_SIZE/2, LEGEND_BADGE_SIZE, LEGEND_BADGE_SIZE, 3);
        ctx.fill();
        x += LEGEND_BADGE_SIZE + 10;

        // Employee name (bold)
        ctx.fillStyle = 'black';
        ctx.font = 'bold 12px Roboto, sans-serif';
        const name = v.employee?.name || 'Unknown';
        ctx.fillText(name, x, y);
        x += ctx.measureText(name).width + 15;

        // Date range
        ctx.font = '12px Roboto, sans-serif';
        ctx.fillStyle = '#666';
        const dateRange = `${formatLegendDate(v.start_date)} - ${formatLegendDate(v.end_date)}`;
        ctx.fillText(dateRange, x, y);
        x += ctx.measureText(dateRange).width + 15;

        // Description (if present)
        if (v.description) {
            ctx.fillStyle = '#888';
            ctx.font = 'italic 12px Roboto, sans-serif';
            ctx.fillText(`- ${v.description}`, x, y);
        }
    });
}

// ==========================================
// Monthly Grid View Drawing Functions
// ==========================================

/**
 * Draw monthly grid view title
 */
function drawMonthlyTitle(ctx, width, fromDate, toDate) {
    ctx.fillStyle = 'black';
    ctx.font = 'bold 18px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fromStr = fromDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const toStr = toDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    ctx.fillText(`Team Vacation Calendar: ${fromStr} - ${toStr}`, width / 2, 25);
}

/**
 * Draw colored dots for employees on vacation
 */
function drawVacationDots(ctx, cellX, cellY, vacations) {
    const dotAreaX = cellX + DAY_CELL_SIZE / 2;
    const dotAreaY = cellY + 14;

    const dotsPerRow = Math.min(vacations.length, MAX_DOTS_PER_ROW);
    const totalRows = Math.min(Math.ceil(vacations.length / MAX_DOTS_PER_ROW), MAX_DOT_ROWS);
    const maxDotsToShow = totalRows * MAX_DOTS_PER_ROW;

    let dotIndex = 0;
    for (let row = 0; row < totalRows && dotIndex < vacations.length; row++) {
        const dotsInThisRow = Math.min(vacations.length - dotIndex, MAX_DOTS_PER_ROW);
        const rowWidth = dotsInThisRow * (DOT_RADIUS * 2 + DOT_SPACING) - DOT_SPACING;
        const rowStartX = dotAreaX - rowWidth / 2 + DOT_RADIUS;

        for (let col = 0; col < dotsInThisRow && dotIndex < maxDotsToShow; col++) {
            const dotX = rowStartX + col * (DOT_RADIUS * 2 + DOT_SPACING);
            const dotY = dotAreaY + row * (DOT_RADIUS * 2 + DOT_SPACING);

            ctx.beginPath();
            ctx.arc(dotX, dotY, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = vacations[dotIndex].color;
            ctx.fill();

            dotIndex++;
        }
    }

    // Show "+" if more vacations than can be shown
    if (vacations.length > maxDotsToShow) {
        ctx.fillStyle = '#666';
        ctx.font = '8px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', cellX + DAY_CELL_SIZE - 5, cellY + DAY_CELL_SIZE - 5);
    }
}

/**
 * Draw empty day cell (for padding before first day)
 */
function drawEmptyDayCell(ctx, x, y) {
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(x, y, DAY_CELL_SIZE, DAY_CELL_SIZE);
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, DAY_CELL_SIZE, DAY_CELL_SIZE);
}

/**
 * Draw a single day cell with date number and vacation dots
 */
function drawDayCell(ctx, x, y, dayNum, isWeekendDay, isHolidayDay, isInRange, vacations) {
    // Background color - holiday takes priority over weekend
    if (!isInRange) {
        ctx.fillStyle = '#F5F5F5';
    } else if (isHolidayDay) {
        ctx.fillStyle = HOLIDAY_COLOR;
    } else if (isWeekendDay) {
        ctx.fillStyle = WEEKEND_COLOR;
    } else {
        ctx.fillStyle = 'white';
    }
    ctx.fillRect(x, y, DAY_CELL_SIZE, DAY_CELL_SIZE);

    // Cell border - highlight holidays with red border
    if (isHolidayDay && isInRange) {
        ctx.strokeStyle = HOLIDAY_BORDER_COLOR;
        ctx.lineWidth = 1.5;
    } else {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;
    }
    ctx.strokeRect(x, y, DAY_CELL_SIZE, DAY_CELL_SIZE);

    // Day number (top-left of cell)
    ctx.fillStyle = isInRange ? 'black' : '#BBB';
    ctx.font = '10px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(dayNum.toString(), x + 2, y + 2);

    // Draw vacation dots (if in range and has vacations)
    if (isInRange && vacations.length > 0) {
        drawVacationDots(ctx, x, y, vacations);
    }
}

/**
 * Draw a single month grid
 */
function drawMonthGrid(ctx, month, x, y, vacationDayMap, rangeFrom, rangeTo, holidayMap) {
    const monthWidth = 7 * DAY_CELL_SIZE;

    // Draw month title (e.g., "January 2025")
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(month.fullName, x + monthWidth / 2, y + MONTH_TITLE_HEIGHT / 2);

    // Draw weekday headers
    ctx.font = '10px Roboto, sans-serif';
    ctx.fillStyle = '#666';
    const headerY = y + MONTH_TITLE_HEIGHT + WEEKDAY_HEADER_HEIGHT / 2;
    WEEKDAY_NAMES.forEach((name, i) => {
        const headerX = x + i * DAY_CELL_SIZE + DAY_CELL_SIZE / 2;
        ctx.textAlign = 'center';
        ctx.fillText(name, headerX, headerY);
    });

    // Draw day cells
    const cellStartY = y + MONTH_TITLE_HEIGHT + WEEKDAY_HEADER_HEIGHT;
    let dayNum = 1;
    let weekRow = 0;

    // Draw empty cells for days before month starts
    for (let i = 0; i < month.firstDayOfWeek; i++) {
        const cellX = x + i * DAY_CELL_SIZE;
        const cellY = cellStartY;
        drawEmptyDayCell(ctx, cellX, cellY);
    }

    while (dayNum <= month.daysInMonth) {
        const dayOfWeek = (month.firstDayOfWeek + dayNum - 1) % 7;
        const cellX = x + dayOfWeek * DAY_CELL_SIZE;
        const cellY = cellStartY + weekRow * DAY_CELL_SIZE;

        const currentDate = new Date(month.year, month.month, dayNum);
        const dateKey = formatDateKey(currentDate);
        const isInRange = currentDate >= rangeFrom && currentDate <= rangeTo;
        const isWeekendDay = dayOfWeek >= 5; // Saturday (5) or Sunday (6) in Mon-based
        const isHolidayDay = holidayMap && holidayMap.has(dateKey);
        const vacationsOnDay = vacationDayMap.get(dateKey) || [];

        drawDayCell(ctx, cellX, cellY, dayNum, isWeekendDay, isHolidayDay, isInRange, vacationsOnDay);

        // Move to next row on Sunday (dayOfWeek === 6)
        if (dayOfWeek === 6) {
            weekRow++;
        }
        dayNum++;
    }

    // Draw remaining empty cells to complete the last row
    const lastDayOfWeek = (month.firstDayOfWeek + month.daysInMonth - 1) % 7;
    if (lastDayOfWeek < 6) {
        for (let i = lastDayOfWeek + 1; i <= 6; i++) {
            const cellX = x + i * DAY_CELL_SIZE;
            const cellY = cellStartY + weekRow * DAY_CELL_SIZE;
            drawEmptyDayCell(ctx, cellX, cellY);
        }
    }
}

/**
 * Draw all months in the grid layout
 */
function drawMonthlyGridView(ctx, months, dimensions, vacationDayMap, rangeFrom, rangeTo, holidayMap) {
    const startX = MONTH_GRID_PADDING;
    const startY = TOP_MARGIN;

    months.forEach((month, index) => {
        const row = Math.floor(index / MONTHS_PER_ROW);
        const col = index % MONTHS_PER_ROW;

        const x = startX + col * (dimensions.monthWidth + MONTH_HORIZONTAL_GAP);
        const y = startY + row * (dimensions.monthHeight + MONTH_VERTICAL_GAP);

        drawMonthGrid(ctx, month, x, y, vacationDayMap, rangeFrom, rangeTo, holidayMap);
    });
}

/**
 * Draw legend for monthly grid view (grouped by employee)
 */
function drawMonthlyLegend(ctx, vacations, startY, width) {
    if (!vacations || vacations.length === 0) {
        return;
    }

    // Draw separator line
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, startY);
    ctx.lineTo(width - 20, startY);
    ctx.stroke();

    // Draw legend title
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Legend - Employee Vacations:', 20, startY + 20);

    // Group vacations by employee
    const vacationsByEmployee = new Map();
    vacations.forEach(v => {
        const empId = v.employee_id;
        if (!vacationsByEmployee.has(empId)) {
            vacationsByEmployee.set(empId, {
                employee: v.employee,
                vacations: []
            });
        }
        vacationsByEmployee.get(empId).vacations.push(v);
    });

    // Draw each employee's vacations
    ctx.font = '12px Roboto, sans-serif';
    let rowIndex = 0;

    vacationsByEmployee.forEach((data) => {
        const y = startY + 45 + rowIndex * LEGEND_ROW_HEIGHT;
        let x = 20;

        // Color dot
        ctx.beginPath();
        ctx.arc(x + DOT_RADIUS + 1, y, DOT_RADIUS + 1, 0, Math.PI * 2);
        ctx.fillStyle = parseHexColor(data.employee?.color);
        ctx.fill();
        x += DOT_RADIUS * 2 + 12;

        // Employee name
        ctx.fillStyle = 'black';
        ctx.font = 'bold 12px Roboto, sans-serif';
        const name = data.employee?.name || 'Unknown';
        ctx.fillText(name + ':', x, y);
        x += ctx.measureText(name + ':').width + 10;

        // Vacation date ranges with descriptions
        ctx.font = '12px Roboto, sans-serif';
        ctx.fillStyle = '#666';
        const ranges = data.vacations.map(v => {
            const dateRange = `${formatLegendDate(v.start_date)} - ${formatLegendDate(v.end_date)}`;
            return v.description ? `${dateRange} (${v.description})` : dateRange;
        }).join(', ');
        ctx.fillText(ranges, x, y);

        rowIndex++;
    });
}

/**
 * Draw holiday legend section
 */
function drawHolidayLegend(ctx, holidays, startY, width, countryName) {
    if (!holidays || holidays.length === 0) {
        return startY;
    }

    // Draw separator line
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, startY);
    ctx.lineTo(width - 20, startY);
    ctx.stroke();

    // Draw legend title
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Public Holidays (${countryName}):`, 20, startY + 20);

    // Draw each holiday
    ctx.font = '12px Roboto, sans-serif';
    holidays.forEach((h, i) => {
        const y = startY + 45 + i * LEGEND_ROW_HEIGHT;
        let x = 20;

        // Holiday color badge
        ctx.fillStyle = HOLIDAY_COLOR;
        roundRect(ctx, x, y - LEGEND_BADGE_SIZE/2, LEGEND_BADGE_SIZE, LEGEND_BADGE_SIZE, 3);
        ctx.fill();
        ctx.strokeStyle = HOLIDAY_BORDER_COLOR;
        ctx.lineWidth = 1;
        ctx.stroke();
        x += LEGEND_BADGE_SIZE + 10;

        // Date
        ctx.fillStyle = '#666';
        const dateStr = formatLegendDate(h.date);
        ctx.fillText(dateStr, x, y);
        x += ctx.measureText(dateStr).width + 15;

        // Holiday name
        ctx.fillStyle = 'black';
        ctx.font = 'bold 12px Roboto, sans-serif';
        ctx.fillText(h.name, x, y);
        ctx.font = '12px Roboto, sans-serif';
    });

    return startY + 45 + holidays.length * LEGEND_ROW_HEIGHT;
}

/**
 * Generate monthly grid view calendar
 */
async function generateMonthlyGridCalendar(fromDate, toDate, employees, vacations, holidayMap, holidays, countryName) {
    // Get all months in range
    const months = getMonthsInRange(fromDate, toDate);

    // Calculate dimensions (including holiday legend space)
    const holidayCount = holidays ? holidays.length : 0;
    const dimensions = calculateMonthlyGridDimensions(months, vacations.length, holidayCount);

    // Build vacation lookup map
    const vacationDayMap = buildVacationDayMap(vacations);

    // Create canvas with high DPI support
    const canvas = document.createElement('canvas');
    const dpr = Math.max(window.devicePixelRatio || 1, PNG_SCALE);
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = dimensions.width + 'px';
    canvas.style.height = dimensions.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Draw all layers
    drawBackground(ctx, dimensions.width, dimensions.height);
    drawMonthlyTitle(ctx, dimensions.width, fromDate, toDate);
    drawMonthlyGridView(ctx, months, dimensions, vacationDayMap, fromDate, toDate, holidayMap);

    // Draw vacation legend at the bottom
    const vacationLegendStartY = TOP_MARGIN + dimensions.gridHeight + BOTTOM_PADDING;
    drawMonthlyLegend(ctx, vacations, vacationLegendStartY, dimensions.width);

    // Draw holiday legend below vacation legend
    const holidayLegendStartY = vacationLegendStartY + dimensions.vacationLegendHeight;
    drawHolidayLegend(ctx, holidays, holidayLegendStartY, dimensions.width, countryName || 'Selected Country');

    // Generate data URL for download
    const dataUrl = canvas.toDataURL('image/png');

    return { canvas, dataUrl };
}

/**
 * Generate timeline view calendar (original implementation)
 */
async function generateTimelineCalendar(fromDate, toDate, employees, vacations, holidayMap, holidays, countryName) {
    const days = calculateDays(fromDate, toDate);

    // Calculate vacation legend height
    const vacationLegendHeight = vacations.length > 0
        ? LEGEND_PADDING + 45 + vacations.length * LEGEND_ROW_HEIGHT
        : 0;

    // Calculate holiday legend height
    const holidayCount = holidays ? holidays.length : 0;
    const holidayLegendHeight = holidayCount > 0
        ? LEGEND_PADDING + 45 + holidayCount * LEGEND_ROW_HEIGHT
        : 0;

    // Calculate canvas dimensions
    let width = LEFT_MARGIN + days * DAY_WIDTH + 20;
    let height = TOP_MARGIN + HEADER_HEIGHT + employees.length * ROW_HEIGHT + BOTTOM_PADDING + vacationLegendHeight + holidayLegendHeight;

    // Enforce minimum dimensions
    if (width < 800) width = 800;
    if (height < 200) height = 200;

    // Create canvas
    const canvas = document.createElement('canvas');

    // Handle high DPI displays
    const dpr = Math.max(window.devicePixelRatio || 1, PNG_SCALE);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Build vacation map by employee ID
    const vacationMap = new Map();
    vacations.forEach(v => {
        const empId = v.employee_id;
        if (!vacationMap.has(empId)) {
            vacationMap.set(empId, []);
        }
        vacationMap.get(empId).push({
            start: v.start_date,
            end: v.end_date
        });
    });

    // Draw all layers in order
    drawBackground(ctx, width, height);
    drawTitle(ctx, width);
    drawWeekendBackground(ctx, fromDate, days, employees.length);
    drawHolidayBackground(ctx, fromDate, days, employees.length, holidayMap);
    drawDateHeaders(ctx, fromDate, days);
    drawEmployeeRows(ctx, employees, vacationMap, fromDate, toDate, days);
    drawGrid(ctx, days, employees.length);

    // Draw vacation legend at the bottom
    const vacationLegendStartY = TOP_MARGIN + HEADER_HEIGHT + employees.length * ROW_HEIGHT + BOTTOM_PADDING;
    drawLegend(ctx, vacations, vacationLegendStartY, width);

    // Draw holiday legend below vacation legend
    const holidayLegendStartY = vacationLegendStartY + vacationLegendHeight;
    drawHolidayLegend(ctx, holidays, holidayLegendStartY, width, countryName || 'Selected Country');

    // Generate data URL for download
    const dataUrl = canvas.toDataURL('image/png');

    return { canvas, dataUrl };
}

/**
 * Generate calendar canvas - routes to appropriate view based on date range
 * @param {string} fromDateStr - Start date (YYYY-MM-DD)
 * @param {string} toDateStr - End date (YYYY-MM-DD)
 * @param {Array} employees - Employee array
 * @param {Array} vacations - Vacation array (with employee data)
 * @param {Array} holidays - Optional array of holiday objects from API
 * @param {string} countryName - Optional country name for legend
 * @returns {Promise<{canvas: HTMLCanvasElement, dataUrl: string}>}
 */
export async function generateCalendar(fromDateStr, toDateStr, employees, vacations, holidays = [], countryName = '') {
    await ensureFontsLoaded();

    const fromDate = new Date(fromDateStr + 'T00:00:00');
    const toDate = new Date(toDateStr + 'T00:00:00');

    // Build holiday lookup map
    const holidayMap = buildHolidayMap(holidays);

    // Route to appropriate view based on date range
    if (shouldUseMonthlyGridView(fromDate, toDate)) {
        return generateMonthlyGridCalendar(fromDate, toDate, employees, vacations, holidayMap, holidays, countryName);
    } else {
        return generateTimelineCalendar(fromDate, toDate, employees, vacations, holidayMap, holidays, countryName);
    }
}
