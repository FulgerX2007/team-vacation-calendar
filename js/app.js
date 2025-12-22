/**
 * Main application logic
 * Replaces API calls with LocalStorage operations
 */

import * as Storage from './storage.js';
import * as Calendar from './calendar.js';
import * as Backup from './backup.js';

let vacationStartPicker, vacationEndPicker;
let calendarFromPicker, calendarToPicker;

document.addEventListener('DOMContentLoaded', () => {
    Storage.initStorage();
    loadEmployees();
    loadVacations();
    setupEventListeners();
    setupBackupListeners();
    initDatePickers();
});

function setupEventListeners() {
    document.getElementById('employee-form').addEventListener('submit', handleEmployeeSubmit);
    document.getElementById('vacation-form').addEventListener('submit', handleVacationSubmit);
    document.getElementById('calendar-form').addEventListener('submit', handleCalendarGenerate);
    document.getElementById('cancel-employee').addEventListener('click', resetEmployeeForm);
    document.getElementById('cancel-vacation').addEventListener('click', resetVacationForm);
}

function setupBackupListeners() {
    document.getElementById('export-btn').addEventListener('click', () => {
        Backup.exportData();
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const result = await Backup.importData(file);
        if (result.success) {
            alert(result.message);
            loadEmployees();
            loadVacations();
        } else {
            alert('Import failed: ' + result.message);
        }

        // Reset file input
        e.target.value = '';
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
        if (Backup.clearAllData()) {
            loadEmployees();
            loadVacations();
            // Clear calendar preview
            document.getElementById('calendar-preview').innerHTML =
                '<p class="placeholder-text">Select a date range and click "Generate Calendar" to preview</p>';
            document.getElementById('calendar-actions').style.display = 'none';
        }
    });
}

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

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function loadEmployees() {
    const employees = Storage.getEmployees();
    renderEmployeesList(employees);
    updateEmployeeSelect(employees);
}

function renderEmployeesList(employees) {
    const list = document.getElementById('employees-list');

    if (!employees || employees.length === 0) {
        list.innerHTML = '<p class="empty-message">No employees yet. Add one above.</p>';
        return;
    }

    list.innerHTML = employees.map(emp => `
        <div class="list-item">
            <div class="list-item-info">
                <span class="color-badge" style="background-color: ${emp.color}"></span>
                <span>${escapeHtml(emp.name)}</span>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-sm" onclick="editEmployee(${emp.id}, '${escapeHtml(emp.name)}', '${emp.color}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${emp.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function updateEmployeeSelect(employees) {
    const select = document.getElementById('vacation-employee');
    const currentValue = select.value;

    select.innerHTML = '<option value="">Select employee</option>';

    if (employees && employees.length > 0) {
        employees.forEach(emp => {
            select.innerHTML += `<option value="${emp.id}">${escapeHtml(emp.name)}</option>`;
        });
    }

    if (currentValue) {
        select.value = currentValue;
    }
}

function handleEmployeeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('employee-id').value;
    const name = document.getElementById('employee-name').value.trim();
    const color = document.getElementById('employee-color').value;

    if (!name) {
        alert('Please enter an employee name');
        return;
    }

    if (id) {
        // Update existing
        const updated = Storage.updateEmployee(parseInt(id), name, color);
        if (!updated) {
            alert('Employee not found');
            return;
        }
    } else {
        // Create new
        Storage.createEmployee(name, color);
    }

    resetEmployeeForm();
    loadEmployees();
    loadVacations(); // Refresh to update employee names in vacation list
}

// Expose to global scope for onclick handlers
window.editEmployee = function(id, name, color) {
    document.getElementById('employee-id').value = id;
    document.getElementById('employee-name').value = name;
    document.getElementById('employee-color').value = color;
    document.querySelector('#employee-form button[type="submit"]').textContent = 'Update Employee';
    document.getElementById('cancel-employee').style.display = 'inline-block';
};

function resetEmployeeForm() {
    document.getElementById('employee-id').value = '';
    document.getElementById('employee-name').value = '';
    document.getElementById('employee-color').value = '#3498db';
    document.querySelector('#employee-form button[type="submit"]').textContent = 'Add Employee';
    document.getElementById('cancel-employee').style.display = 'none';
}

// Expose to global scope for onclick handlers
window.deleteEmployee = function(id) {
    if (!confirm('Delete this employee and all their vacations?')) return;

    const deleted = Storage.deleteEmployee(id);
    if (!deleted) {
        alert('Employee not found');
        return;
    }

    loadEmployees();
    loadVacations();
};

function loadVacations() {
    const vacations = Storage.getVacations();
    renderVacationsList(vacations);
}

function renderVacationsList(vacations) {
    const list = document.getElementById('vacations-list');

    if (!vacations || vacations.length === 0) {
        list.innerHTML = '<p class="empty-message">No vacations yet. Add one above.</p>';
        return;
    }

    list.innerHTML = vacations.map(v => `
        <div class="list-item">
            <div class="list-item-info">
                <span class="color-badge" style="background-color: ${v.employee?.color || '#3498db'}"></span>
                <div>
                    <strong>${escapeHtml(v.employee?.name || 'Unknown')}</strong>
                    <div class="vacation-dates">${formatDisplayDate(v.start_date)} - ${formatDisplayDate(v.end_date)}</div>
                    ${v.description ? `<small>${escapeHtml(v.description)}</small>` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-sm" onclick="editVacation(${v.id}, ${v.employee_id}, '${v.start_date}', '${v.end_date}', '${escapeHtml(v.description || '')}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteVacation(${v.id})">Delete</button>
            </div>
        </div>
    `).join('');
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
        alert('Please select an employee');
        return;
    }

    if (!start_date || !end_date) {
        alert('Please select start and end dates');
        return;
    }

    if (new Date(end_date) < new Date(start_date)) {
        alert('End date must be after start date');
        return;
    }

    if (id) {
        // Update existing
        const updated = Storage.updateVacation(parseInt(id), employee_id, start_date, end_date, description);
        if (!updated) {
            alert('Vacation not found');
            return;
        }
    } else {
        // Create new
        Storage.createVacation(employee_id, start_date, end_date, description);
    }

    resetVacationForm();
    loadVacations();
}

// Expose to global scope for onclick handlers
window.editVacation = function(id, employeeId, startDate, endDate, description) {
    document.getElementById('vacation-id').value = id;
    document.getElementById('vacation-employee').value = employeeId;
    vacationStartPicker.setDate(startDate);
    vacationEndPicker.setDate(endDate);
    vacationEndPicker.set('minDate', startDate);
    document.getElementById('vacation-description').value = description;
    document.querySelector('#vacation-form button[type="submit"]').textContent = 'Update Vacation';
    document.getElementById('cancel-vacation').style.display = 'inline-block';
};

function resetVacationForm() {
    document.getElementById('vacation-id').value = '';
    document.getElementById('vacation-employee').value = '';
    vacationStartPicker.clear();
    vacationEndPicker.clear();
    vacationEndPicker.set('minDate', null);
    document.getElementById('vacation-description').value = '';
    document.querySelector('#vacation-form button[type="submit"]').textContent = 'Add Vacation';
    document.getElementById('cancel-vacation').style.display = 'none';
}

// Expose to global scope for onclick handlers
window.deleteVacation = function(id) {
    if (!confirm('Delete this vacation?')) return;

    const deleted = Storage.deleteVacation(id);
    if (!deleted) {
        alert('Vacation not found');
        return;
    }

    loadVacations();
};

async function handleCalendarGenerate(e) {
    e.preventDefault();

    const from = document.getElementById('calendar-from').value;
    const to = document.getElementById('calendar-to').value;

    if (!from || !to) {
        alert('Please select both from and to dates');
        return;
    }

    const preview = document.getElementById('calendar-preview');
    const actions = document.getElementById('calendar-actions');

    preview.innerHTML = '<p>Generating calendar...</p>';
    actions.style.display = 'none';

    try {
        const employees = Storage.getEmployees();
        const vacations = Storage.getVacationsByDateRange(from, to);

        if (employees.length === 0) {
            preview.innerHTML = '<p class="placeholder-text">No employees found. Add employees first.</p>';
            return;
        }

        const { canvas, dataUrl } = await Calendar.generateCalendar(from, to, employees, vacations);

        // Clear and display canvas
        preview.innerHTML = '';
        preview.appendChild(canvas);

        // Setup download link
        const downloadLink = document.getElementById('download-png');
        downloadLink.href = dataUrl;
        downloadLink.download = `vacation_calendar_${from}_${to}.png`;
        actions.style.display = 'block';

    } catch (error) {
        console.error('Error generating calendar:', error);
        preview.innerHTML = '<p class="placeholder-text">Error generating calendar</p>';
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
