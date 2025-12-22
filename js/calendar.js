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

// Colors
const WEEKEND_COLOR = '#F0F0F0';
const GRID_COLOR = '#C8C8C8';
const DEFAULT_EMPLOYEE_COLOR = '#3498db';

// Month names for header
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
 * Generate calendar canvas
 * @param {string} fromDateStr - Start date (YYYY-MM-DD)
 * @param {string} toDateStr - End date (YYYY-MM-DD)
 * @param {Array} employees - Employee array
 * @param {Array} vacations - Vacation array (with employee data)
 * @returns {Promise<{canvas: HTMLCanvasElement, dataUrl: string}>}
 */
export async function generateCalendar(fromDateStr, toDateStr, employees, vacations) {
    await ensureFontsLoaded();

    const fromDate = new Date(fromDateStr + 'T00:00:00');
    const toDate = new Date(toDateStr + 'T00:00:00');

    const days = calculateDays(fromDate, toDate);

    // Calculate canvas dimensions
    let width = LEFT_MARGIN + days * DAY_WIDTH + 20;
    let height = TOP_MARGIN + HEADER_HEIGHT + employees.length * ROW_HEIGHT + BOTTOM_PADDING;

    // Enforce minimum dimensions
    if (width < 800) width = 800;
    if (height < 200) height = 200;

    // Create canvas
    const canvas = document.createElement('canvas');

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
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

    // Draw all layers in order (matching Go implementation)
    drawBackground(ctx, width, height);
    drawTitle(ctx, width);
    drawWeekendBackground(ctx, fromDate, days, employees.length);
    drawDateHeaders(ctx, fromDate, days);
    drawEmployeeRows(ctx, employees, vacationMap, fromDate, toDate, days);
    drawGrid(ctx, days, employees.length);

    // Generate data URL for download
    const dataUrl = canvas.toDataURL('image/png');

    return { canvas, dataUrl };
}
