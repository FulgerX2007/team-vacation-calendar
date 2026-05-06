/**
 * Main application logic
 * LocalStorage-backed vacation calendar.
 */

import * as Storage from './storage.js';
import * as Calendar from './calendar.js';
import * as Backup from './backup.js';
import * as Holidays from './holidays.js';

const EMPLOYEE_COLORS = [
    '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c',
    '#0891b2', '#db2777', '#0284c7', '#f59e0b', '#475569'
];
let colorIndex = 0;

let vacationStartPicker, vacationEndPicker;
let calendarFromPicker, calendarToPicker;
let currentCalendarDataUrl = null;
let employeeSearchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
    Storage.initStorage();
    initTheme();
    loadEmployees();
    loadVacations();
    setupEventListeners();
    setupBackupListeners();
    setupModal();
    setupSearch();
    initDatePickers();
    initCountrySelector();
    syncCalendarDates();
});

/* ---------------------------------------------------------------
   Theme
--------------------------------------------------------------- */
function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('vc_theme', next); } catch (e) { /* ignore */ }
    });
}

/* ---------------------------------------------------------------
   Avatar helpers
--------------------------------------------------------------- */
function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---------------------------------------------------------------
   Toast
--------------------------------------------------------------- */
let toastTimeout = null;
function toast(message, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast' + (type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : '');
    el.hidden = false;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { el.hidden = true; }, 2400);
}

/* ---------------------------------------------------------------
   Event wiring
--------------------------------------------------------------- */
function setupEventListeners() {
    document.getElementById('employee-form').addEventListener('submit', handleEmployeeSubmit);
    document.getElementById('vacation-form').addEventListener('submit', handleVacationSubmit);
    document.getElementById('calendar-form').addEventListener('submit', handleCalendarGenerate);
    document.getElementById('cancel-vacation').addEventListener('click', resetVacationForm);
    document.getElementById('copy-clipboard').addEventListener('click', copyToClipboard);

    // Color preview sync
    const colorInput = document.getElementById('employee-color');
    const colorPreview = document.getElementById('employee-color-preview');
    const colorHex = document.getElementById('employee-color-hex');
    if (colorInput && colorPreview && colorHex) {
        const updateColor = () => {
            colorPreview.style.setProperty('--swatch-color', colorInput.value);
            colorHex.textContent = colorInput.value.toUpperCase();
        };
        colorInput.addEventListener('input', updateColor);
        updateColor();
    }
}

function setupSearch() {
    const search = document.getElementById('employee-search');
    if (!search) return;
    search.addEventListener('input', (e) => {
        employeeSearchTerm = e.target.value.trim().toLowerCase();
        renderEmployeesList(Storage.getEmployees());
    });
}

/* ---------------------------------------------------------------
   Modal (employee add/edit)
--------------------------------------------------------------- */
function setupModal() {
    const openBtn = document.getElementById('open-employee-form');
    const modal = document.getElementById('employee-modal');
    if (!openBtn || !modal) return;

    openBtn.addEventListener('click', () => openEmployeeModal());

    modal.querySelectorAll('[data-close-modal]').forEach((el) => {
        el.addEventListener('click', closeEmployeeModal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) closeEmployeeModal();
    });
}

function openEmployeeModal(employee = null) {
    const modal = document.getElementById('employee-modal');
    const title = document.getElementById('employee-modal-title');
    const submit = document.getElementById('employee-submit');
    const idInput = document.getElementById('employee-id');
    const nameInput = document.getElementById('employee-name');
    const colorInput = document.getElementById('employee-color');

    if (employee) {
        title.textContent = 'Edit Employee';
        submit.textContent = 'Save Changes';
        idInput.value = employee.id;
        nameInput.value = employee.name;
        colorInput.value = employee.color;
    } else {
        title.textContent = 'Add Employee';
        submit.textContent = 'Add Employee';
        idInput.value = '';
        nameInput.value = '';
        colorInput.value = getNextColor();
    }
    colorInput.dispatchEvent(new Event('input'));

    modal.hidden = false;
    setTimeout(() => nameInput.focus(), 50);
}

function closeEmployeeModal() {
    document.getElementById('employee-modal').hidden = true;
    resetEmployeeForm();
}

/* ---------------------------------------------------------------
   Backup wiring
--------------------------------------------------------------- */
function setupBackupListeners() {
    document.getElementById('export-btn').addEventListener('click', () => {
        Backup.exportData();
        toast('Data exported successfully', 'success');
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const result = await Backup.importData(file);
        if (result.success) {
            toast(result.message || 'Data imported successfully', 'success');
            loadEmployees();
            loadVacations();
            syncCalendarDates();
        } else {
            toast('Import failed: ' + result.message, 'error');
        }

        e.target.value = '';
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
        if (Backup.clearAllData()) {
            loadEmployees();
            loadVacations();
            const preview = document.getElementById('calendar-preview');
            preview.innerHTML = `
                <div class="placeholder">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    <p>Select a date range and click <strong>Generate Calendar</strong> to preview</p>
                </div>`;
            document.getElementById('calendar-actions').hidden = true;

            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            calendarFromPicker.setDate(today);
            calendarToPicker.setDate(nextMonth);
            calendarToPicker.set('minDate', today);
            toast('All data cleared', 'success');
        }
    });
}

/* ---------------------------------------------------------------
   Date pickers
--------------------------------------------------------------- */
function initDatePickers() {
    const commonConfig = {
        dateFormat: 'Y-m-d',
        locale: { firstDayOfWeek: 1 }
    };

    vacationStartPicker = flatpickr('#vacation-start', {
        ...commonConfig,
        onChange: function(selectedDates) {
            if (selectedDates[0]) {
                vacationEndPicker.set('minDate', selectedDates[0]);
            }
        }
    });

    vacationEndPicker = flatpickr('#vacation-end', commonConfig);

    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    calendarFromPicker = flatpickr('#calendar-from', {
        ...commonConfig,
        defaultDate: today,
        onChange: function(selectedDates) {
            if (selectedDates[0]) {
                calendarToPicker.set('minDate', selectedDates[0]);
            }
        }
    });

    calendarToPicker = flatpickr('#calendar-to', {
        ...commonConfig,
        defaultDate: nextMonth,
        minDate: today
    });
}

/* ---------------------------------------------------------------
   Country selector
--------------------------------------------------------------- */
function countryFlag(code) {
    if (!code || code.length !== 2) return '';
    const A = 0x1F1E6;
    const a = 'A'.charCodeAt(0);
    return String.fromCodePoint(A + code.charCodeAt(0) - a) +
           String.fromCodePoint(A + code.charCodeAt(1) - a);
}

function initCountrySelector() {
    const select = document.getElementById('holiday-country');
    if (!select) return;

    const countries = Holidays.getPopularCountries();
    countries.forEach((country) => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = `${countryFlag(country.code)}  ${country.name}`;
        select.appendChild(option);
    });

    const savedCountry = Holidays.getSelectedCountry();
    if (savedCountry) select.value = savedCountry;

    select.addEventListener('change', (e) => {
        Holidays.setSelectedCountry(e.target.value);
    });
}

/* ---------------------------------------------------------------
   Calendar date sync
--------------------------------------------------------------- */
function getVacationDateRange() {
    const vacations = Storage.getVacations();
    if (vacations.length === 0) return null;

    let minDate = vacations[0].start_date;
    let maxDate = vacations[0].end_date;

    vacations.forEach((v) => {
        if (v.start_date < minDate) minDate = v.start_date;
        if (v.end_date > maxDate) maxDate = v.end_date;
    });

    return { from: minDate, to: maxDate };
}

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function roundToMonday(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return formatLocalDate(date);
}

function roundToSunday(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    date.setDate(date.getDate() + diff);
    return formatLocalDate(date);
}

function syncCalendarDates() {
    const range = getVacationDateRange();
    if (range) {
        const from = roundToMonday(range.from);
        const to = roundToSunday(range.to);
        calendarFromPicker.setDate(from);
        calendarToPicker.setDate(to);
        calendarToPicker.set('minDate', from);
    }
}

/* ---------------------------------------------------------------
   Employees
--------------------------------------------------------------- */
function loadEmployees() {
    const employees = Storage.getEmployees();
    renderEmployeesList(employees);
    updateEmployeeSelect(employees);
}

function renderEmployeesList(employees) {
    const list = document.getElementById('employees-list');

    let filtered = employees || [];
    if (employeeSearchTerm) {
        filtered = filtered.filter((e) =>
            e.name.toLowerCase().includes(employeeSearchTerm)
        );
    }

    if (!employees || employees.length === 0) {
        list.innerHTML = `<div class="empty">No employees yet. Click <strong>Add Employee</strong> to get started.</div>`;
        return;
    }

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty">No employees match "<strong>${escapeHtml(employeeSearchTerm)}</strong>"</div>`;
        return;
    }

    list.innerHTML = filtered.map((emp) => `
        <div class="list-row" role="listitem">
            <div class="row-info">
                <span class="avatar" style="--avatar-bg: ${emp.color}" aria-hidden="true">${getInitials(emp.name)}</span>
                <div class="row-text">
                    <div class="row-name">${escapeHtml(emp.name)}</div>
                </div>
            </div>
            <div class="row-actions">
                <button type="button" class="icon-btn icon-btn-edit" data-edit-employee="${emp.id}" aria-label="Edit ${escapeHtml(emp.name)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
                </button>
                <button type="button" class="icon-btn icon-btn-danger" data-delete-employee="${emp.id}" aria-label="Delete ${escapeHtml(emp.name)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('[data-edit-employee]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.editEmployee);
            const emp = (employees || []).find((e) => e.id === id);
            if (emp) openEmployeeModal(emp);
        });
    });

    list.querySelectorAll('[data-delete-employee]').forEach((btn) => {
        btn.addEventListener('click', () => {
            deleteEmployee(parseInt(btn.dataset.deleteEmployee));
        });
    });
}

function updateEmployeeSelect(employees) {
    const select = document.getElementById('vacation-employee');
    const currentValue = select.value;

    select.innerHTML = '<option value="">Choose an employee</option>';

    if (employees && employees.length > 0) {
        employees.forEach((emp) => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = emp.name;
            select.appendChild(opt);
        });
    }

    if (currentValue) select.value = currentValue;
}

function handleEmployeeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('employee-id').value;
    const name = document.getElementById('employee-name').value.trim();
    const color = document.getElementById('employee-color').value;

    if (!name) {
        toast('Please enter an employee name', 'error');
        return;
    }

    if (id) {
        const updated = Storage.updateEmployee(parseInt(id), name, color);
        if (!updated) {
            toast('Employee not found', 'error');
            return;
        }
        toast('Employee updated', 'success');
    } else {
        Storage.createEmployee(name, color);
        toast('Employee added', 'success');
    }

    closeEmployeeModal();
    loadEmployees();
    loadVacations();
}

function getNextColor() {
    const color = EMPLOYEE_COLORS[colorIndex % EMPLOYEE_COLORS.length];
    colorIndex++;
    return color;
}

function resetEmployeeForm() {
    document.getElementById('employee-id').value = '';
    document.getElementById('employee-name').value = '';
    document.getElementById('employee-color').value = '#2563eb';
    document.getElementById('employee-color').dispatchEvent(new Event('input'));
}

function deleteEmployee(id) {
    if (!confirm('Delete this employee and all their vacations?')) return;

    const deleted = Storage.deleteEmployee(id);
    if (!deleted) {
        toast('Employee not found', 'error');
        return;
    }

    loadEmployees();
    loadVacations();
    syncCalendarDates();
    toast('Employee deleted', 'success');
}

/* ---------------------------------------------------------------
   Vacations
--------------------------------------------------------------- */
function loadVacations() {
    const vacations = Storage.getVacations();
    renderVacationsList(vacations);
}

function renderVacationsList(vacations) {
    const list = document.getElementById('vacations-list');

    if (!vacations || vacations.length === 0) {
        list.innerHTML = `<div class="empty">No vacations yet. Add one with the form above.</div>`;
        return;
    }

    list.innerHTML = vacations.map((v) => {
        const color = v.employee?.color || '#2563eb';
        const name = v.employee?.name || 'Unknown';
        return `
        <div class="list-row vacation-row" role="listitem" style="--row-accent: ${color}">
            <div class="row-info">
                <span class="avatar" style="--avatar-bg: ${color}" aria-hidden="true">${getInitials(name)}</span>
                <div class="row-text">
                    <div class="row-name">${escapeHtml(name)}</div>
                    <div class="row-meta">${formatDisplayDate(v.start_date)} – ${formatDisplayDate(v.end_date)}</div>
                    ${v.description ? `<div class="row-desc">${escapeHtml(v.description)}</div>` : ''}
                </div>
            </div>
            <div class="row-actions">
                <button type="button" class="icon-btn icon-btn-edit" data-edit-vacation="${v.id}" aria-label="Edit vacation">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
                </button>
                <button type="button" class="icon-btn icon-btn-danger" data-delete-vacation="${v.id}" aria-label="Delete vacation">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-edit-vacation]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.editVacation);
            const v = vacations.find((x) => x.id === id);
            if (v) editVacation(v);
        });
    });

    list.querySelectorAll('[data-delete-vacation]').forEach((btn) => {
        btn.addEventListener('click', () => {
            deleteVacation(parseInt(btn.dataset.deleteVacation));
        });
    });
}

function formatDisplayDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function handleVacationSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('vacation-id').value;
    const employee_id = parseInt(document.getElementById('vacation-employee').value);
    const start_date = document.getElementById('vacation-start').value;
    const end_date = document.getElementById('vacation-end').value;
    const description = document.getElementById('vacation-description').value.trim();

    if (!employee_id) {
        toast('Please select an employee', 'error');
        return;
    }

    if (!start_date || !end_date) {
        toast('Please select start and end dates', 'error');
        return;
    }

    if (new Date(end_date) < new Date(start_date)) {
        toast('End date must be after start date', 'error');
        return;
    }

    if (id) {
        const updated = Storage.updateVacation(parseInt(id), employee_id, start_date, end_date, description);
        if (!updated) {
            toast('Vacation not found', 'error');
            return;
        }
        toast('Vacation updated', 'success');
    } else {
        Storage.createVacation(employee_id, start_date, end_date, description);
        toast('Vacation added', 'success');
    }

    resetVacationForm();
    loadVacations();
    syncCalendarDates();
}

function editVacation(v) {
    document.getElementById('vacation-id').value = v.id;
    document.getElementById('vacation-employee').value = v.employee_id;
    vacationStartPicker.setDate(v.start_date);
    vacationEndPicker.setDate(v.end_date);
    vacationEndPicker.set('minDate', v.start_date);
    document.getElementById('vacation-description').value = v.description || '';
    document.querySelector('#vacation-form button[type="submit"]').textContent = 'Update Vacation';
    document.getElementById('cancel-vacation').hidden = false;
    document.getElementById('vacation-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetVacationForm() {
    document.getElementById('vacation-id').value = '';
    document.getElementById('vacation-employee').value = '';
    vacationStartPicker.clear();
    vacationEndPicker.clear();
    vacationEndPicker.set('minDate', null);
    document.getElementById('vacation-description').value = '';
    document.querySelector('#vacation-form button[type="submit"]').textContent = 'Add Vacation';
    document.getElementById('cancel-vacation').hidden = true;
}

function deleteVacation(id) {
    if (!confirm('Delete this vacation?')) return;

    const deleted = Storage.deleteVacation(id);
    if (!deleted) {
        toast('Vacation not found', 'error');
        return;
    }

    loadVacations();
    syncCalendarDates();
    toast('Vacation deleted', 'success');
}

/* ---------------------------------------------------------------
   Calendar generation
--------------------------------------------------------------- */
async function handleCalendarGenerate(e) {
    e.preventDefault();

    const from = document.getElementById('calendar-from').value;
    const to = document.getElementById('calendar-to').value;
    const countryCode = document.getElementById('holiday-country').value;

    if (!from || !to) {
        toast('Please select both from and to dates', 'error');
        return;
    }

    const preview = document.getElementById('calendar-preview');
    const actions = document.getElementById('calendar-actions');

    preview.innerHTML = `<div class="placeholder"><p>Generating calendar…</p></div>`;
    actions.hidden = true;

    try {
        const employees = Storage.getEmployees();
        const vacations = Storage.getVacationsByDateRange(from, to);

        if (employees.length === 0) {
            preview.innerHTML = `<div class="placeholder"><p>No employees found. Add employees first.</p></div>`;
            return;
        }

        let holidays = [];
        let countryName = '';
        if (countryCode) {
            try {
                holidays = await Holidays.getHolidaysForDateRange(countryCode, from, to);
                countryName = Holidays.getCountryName(countryCode);
            } catch (err) {
                console.warn('Failed to fetch holidays:', err);
            }
        }

        const { canvas, dataUrl } = await Calendar.generateCalendar(from, to, employees, vacations, holidays, countryName);

        currentCalendarDataUrl = dataUrl;

        preview.innerHTML = '';
        preview.appendChild(canvas);

        const downloadLink = document.getElementById('download-png');
        downloadLink.href = dataUrl;
        downloadLink.download = `vacation_calendar_${from}_${to}.png`;

        actions.hidden = false;
    } catch (error) {
        console.error('Error generating calendar:', error);
        preview.innerHTML = `<div class="placeholder"><p>Error generating calendar</p></div>`;
    }
}

/* ---------------------------------------------------------------
   Utilities
--------------------------------------------------------------- */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function copyToClipboard() {
    if (!currentCalendarDataUrl) return;

    try {
        const response = await fetch(currentCalendarDataUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        const btn = document.getElementById('copy-clipboard');
        const span = btn.querySelector('span');
        const originalText = span ? span.textContent : btn.textContent;
        if (span) span.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            if (span) span.textContent = originalText;
            btn.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        toast('Clipboard copy not supported in this browser', 'error');
    }
}
