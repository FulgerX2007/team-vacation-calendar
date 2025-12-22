const API_BASE = '/api';

let vacationStartPicker, vacationEndPicker;
let calendarFromPicker, calendarToPicker;

document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    loadVacations();
    setupEventListeners();
    initDatePickers();
});

function setupEventListeners() {
    document.getElementById('employee-form').addEventListener('submit', handleEmployeeSubmit);
    document.getElementById('vacation-form').addEventListener('submit', handleVacationSubmit);
    document.getElementById('calendar-form').addEventListener('submit', handleCalendarGenerate);
    document.getElementById('cancel-employee').addEventListener('click', resetEmployeeForm);
    document.getElementById('cancel-vacation').addEventListener('click', resetVacationForm);
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

async function loadEmployees() {
    try {
        const response = await fetch(`${API_BASE}/employees`);
        const employees = await response.json();
        renderEmployeesList(employees);
        updateEmployeeSelect(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
    }
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
                <span>${emp.name}</span>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-sm" onclick="editEmployee(${emp.id}, '${emp.name}', '${emp.color}')">Edit</button>
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
            select.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
        });
    }

    if (currentValue) {
        select.value = currentValue;
    }
}

async function handleEmployeeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('employee-id').value;
    const name = document.getElementById('employee-name').value;
    const color = document.getElementById('employee-color').value;

    try {
        const url = id ? `${API_BASE}/employees/${id}` : `${API_BASE}/employees`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });

        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Error saving employee');
            return;
        }

        resetEmployeeForm();
        loadEmployees();
    } catch (error) {
        console.error('Error saving employee:', error);
        alert('Error saving employee');
    }
}

function editEmployee(id, name, color) {
    document.getElementById('employee-id').value = id;
    document.getElementById('employee-name').value = name;
    document.getElementById('employee-color').value = color;
    document.querySelector('#employee-form button[type="submit"]').textContent = 'Update Employee';
    document.getElementById('cancel-employee').style.display = 'inline-block';
}

function resetEmployeeForm() {
    document.getElementById('employee-id').value = '';
    document.getElementById('employee-name').value = '';
    document.getElementById('employee-color').value = '#3498db';
    document.querySelector('#employee-form button[type="submit"]').textContent = 'Add Employee';
    document.getElementById('cancel-employee').style.display = 'none';
}

async function deleteEmployee(id) {
    if (!confirm('Delete this employee and all their vacations?')) return;

    try {
        const response = await fetch(`${API_BASE}/employees/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Error deleting employee');
            return;
        }
        loadEmployees();
        loadVacations();
    } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee');
    }
}

async function loadVacations() {
    try {
        const response = await fetch(`${API_BASE}/vacations`);
        const vacations = await response.json();
        renderVacationsList(vacations);
    } catch (error) {
        console.error('Error loading vacations:', error);
    }
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
                    <strong>${v.employee?.name || 'Unknown'}</strong>
                    <div class="vacation-dates">${formatDisplayDate(v.start_date)} - ${formatDisplayDate(v.end_date)}</div>
                    ${v.description ? `<small>${v.description}</small>` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-sm" onclick="editVacation(${v.id}, ${v.employee_id}, '${v.start_date.split('T')[0]}', '${v.end_date.split('T')[0]}', '${v.description || ''}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteVacation(${v.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function handleVacationSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('vacation-id').value;
    const employee_id = parseInt(document.getElementById('vacation-employee').value);
    const start_date = document.getElementById('vacation-start').value;
    const end_date = document.getElementById('vacation-end').value;
    const description = document.getElementById('vacation-description').value;

    if (!employee_id) {
        alert('Please select an employee');
        return;
    }

    try {
        const url = id ? `${API_BASE}/vacations/${id}` : `${API_BASE}/vacations`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id, start_date, end_date, description })
        });

        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Error saving vacation');
            return;
        }

        resetVacationForm();
        loadVacations();
    } catch (error) {
        console.error('Error saving vacation:', error);
        alert('Error saving vacation');
    }
}

function editVacation(id, employeeId, startDate, endDate, description) {
    document.getElementById('vacation-id').value = id;
    document.getElementById('vacation-employee').value = employeeId;
    vacationStartPicker.setDate(startDate);
    vacationEndPicker.setDate(endDate);
    vacationEndPicker.set('minDate', startDate);
    document.getElementById('vacation-description').value = description;
    document.querySelector('#vacation-form button[type="submit"]').textContent = 'Update Vacation';
    document.getElementById('cancel-vacation').style.display = 'inline-block';
}

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

async function deleteVacation(id) {
    if (!confirm('Delete this vacation?')) return;

    try {
        const response = await fetch(`${API_BASE}/vacations/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Error deleting vacation');
            return;
        }
        loadVacations();
    } catch (error) {
        console.error('Error deleting vacation:', error);
        alert('Error deleting vacation');
    }
}

async function handleCalendarGenerate(e) {
    e.preventDefault();

    const from = document.getElementById('calendar-from').value;
    const to = document.getElementById('calendar-to').value;

    if (!from || !to) {
        alert('Please select both from and to dates');
        return;
    }

    const preview = document.getElementById('calendar-preview');
    preview.innerHTML = '<p>Generating calendar...</p>';

    try {
        const url = `${API_BASE}/calendar/generate?from=${from}&to=${to}`;
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Error generating calendar');
            preview.innerHTML = '<p class="placeholder-text">Error generating calendar</p>';
            return;
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        preview.innerHTML = `
            <div>
                <img src="${imageUrl}" alt="Vacation Calendar">
                <br>
                <a href="${url}" download="vacation_calendar.png" class="download-link">Download PNG</a>
            </div>
        `;
    } catch (error) {
        console.error('Error generating calendar:', error);
        preview.innerHTML = '<p class="placeholder-text">Error generating calendar</p>';
    }
}
