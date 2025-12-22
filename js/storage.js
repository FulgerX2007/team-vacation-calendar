/**
 * LocalStorage module for vacation calendar data persistence
 */

const STORAGE_KEYS = {
    EMPLOYEES: 'vacation_calendar_employees',
    VACATIONS: 'vacation_calendar_vacations',
    NEXT_EMP_ID: 'vacation_calendar_next_employee_id',
    NEXT_VAC_ID: 'vacation_calendar_next_vacation_id'
};

/**
 * Initialize storage with empty arrays if not present
 */
export function initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.VACATIONS)) {
        localStorage.setItem(STORAGE_KEYS.VACATIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NEXT_EMP_ID)) {
        localStorage.setItem(STORAGE_KEYS.NEXT_EMP_ID, '0');
    }
    if (!localStorage.getItem(STORAGE_KEYS.NEXT_VAC_ID)) {
        localStorage.setItem(STORAGE_KEYS.NEXT_VAC_ID, '0');
    }
}

/**
 * Generate next employee ID
 */
function generateEmployeeId() {
    const current = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_EMP_ID) || '0');
    const next = current + 1;
    localStorage.setItem(STORAGE_KEYS.NEXT_EMP_ID, next.toString());
    return next;
}

/**
 * Generate next vacation ID
 */
function generateVacationId() {
    const current = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_VAC_ID) || '0');
    const next = current + 1;
    localStorage.setItem(STORAGE_KEYS.NEXT_VAC_ID, next.toString());
    return next;
}

/**
 * Get all employees
 * @returns {Array} Employee array
 */
export function getEmployees() {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
}

/**
 * Get employee by ID
 * @param {number} id - Employee ID
 * @returns {Object|null} Employee or null
 */
export function getEmployeeById(id) {
    const employees = getEmployees();
    return employees.find(e => e.id === id) || null;
}

/**
 * Create a new employee
 * @param {string} name - Employee name
 * @param {string} color - Hex color
 * @returns {Object} Created employee
 */
export function createEmployee(name, color) {
    const employees = getEmployees();
    const now = new Date().toISOString();

    const employee = {
        id: generateEmployeeId(),
        name: name,
        color: color || '#3498db',
        created_at: now,
        updated_at: now
    };

    employees.push(employee);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    return employee;
}

/**
 * Update an existing employee
 * @param {number} id - Employee ID
 * @param {string} name - New name
 * @param {string} color - New color
 * @returns {Object|null} Updated employee or null if not found
 */
export function updateEmployee(id, name, color) {
    const employees = getEmployees();
    const index = employees.findIndex(e => e.id === id);

    if (index === -1) {
        return null;
    }

    employees[index] = {
        ...employees[index],
        name: name,
        color: color,
        updated_at: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    return employees[index];
}

/**
 * Delete an employee and all their vacations (cascade delete)
 * @param {number} id - Employee ID
 * @returns {boolean} True if deleted
 */
export function deleteEmployee(id) {
    const employees = getEmployees();
    const vacations = getVacationsRaw();

    const filteredEmployees = employees.filter(e => e.id !== id);
    const filteredVacations = vacations.filter(v => v.employee_id !== id);

    if (filteredEmployees.length === employees.length) {
        return false;
    }

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(filteredEmployees));
    localStorage.setItem(STORAGE_KEYS.VACATIONS, JSON.stringify(filteredVacations));

    return true;
}

/**
 * Get raw vacations without employee data
 * @returns {Array} Vacation array
 */
function getVacationsRaw() {
    const data = localStorage.getItem(STORAGE_KEYS.VACATIONS);
    return data ? JSON.parse(data) : [];
}

/**
 * Get all vacations with employee data joined
 * @returns {Array} Vacation array with employee objects
 */
export function getVacations() {
    const vacations = getVacationsRaw();
    const employees = getEmployees();

    return vacations.map(v => ({
        ...v,
        employee: employees.find(e => e.id === v.employee_id) || null
    }));
}

/**
 * Get vacation by ID
 * @param {number} id - Vacation ID
 * @returns {Object|null} Vacation or null
 */
export function getVacationById(id) {
    const vacations = getVacations();
    return vacations.find(v => v.id === id) || null;
}

/**
 * Get vacations that overlap with a date range
 * @param {string} from - Start date (YYYY-MM-DD)
 * @param {string} to - End date (YYYY-MM-DD)
 * @returns {Array} Filtered vacations with employee data
 */
export function getVacationsByDateRange(from, to) {
    const vacations = getVacations();
    const rangeStart = new Date(from);
    const rangeEnd = new Date(to);

    return vacations.filter(v => {
        const vStart = new Date(v.start_date);
        const vEnd = new Date(v.end_date);
        // Vacation overlaps if: vStart <= rangeEnd AND vEnd >= rangeStart
        return vStart <= rangeEnd && vEnd >= rangeStart;
    });
}

/**
 * Create a new vacation
 * @param {number} employeeId - Employee ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} description - Optional description
 * @returns {Object} Created vacation
 */
export function createVacation(employeeId, startDate, endDate, description) {
    const vacations = getVacationsRaw();
    const now = new Date().toISOString();

    const vacation = {
        id: generateVacationId(),
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        description: description || '',
        created_at: now,
        updated_at: now
    };

    vacations.push(vacation);
    localStorage.setItem(STORAGE_KEYS.VACATIONS, JSON.stringify(vacations));

    // Return with employee data joined
    const employee = getEmployeeById(employeeId);
    return { ...vacation, employee };
}

/**
 * Update an existing vacation
 * @param {number} id - Vacation ID
 * @param {number} employeeId - Employee ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} description - Description
 * @returns {Object|null} Updated vacation or null
 */
export function updateVacation(id, employeeId, startDate, endDate, description) {
    const vacations = getVacationsRaw();
    const index = vacations.findIndex(v => v.id === id);

    if (index === -1) {
        return null;
    }

    vacations[index] = {
        ...vacations[index],
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        description: description || '',
        updated_at: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.VACATIONS, JSON.stringify(vacations));

    // Return with employee data joined
    const employee = getEmployeeById(employeeId);
    return { ...vacations[index], employee };
}

/**
 * Delete a vacation
 * @param {number} id - Vacation ID
 * @returns {boolean} True if deleted
 */
export function deleteVacation(id) {
    const vacations = getVacationsRaw();
    const filtered = vacations.filter(v => v.id !== id);

    if (filtered.length === vacations.length) {
        return false;
    }

    localStorage.setItem(STORAGE_KEYS.VACATIONS, JSON.stringify(filtered));
    return true;
}

/**
 * Get all data for export
 * @returns {Object} All employees and vacations
 */
export function getAllData() {
    return {
        employees: getEmployees(),
        vacations: getVacationsRaw()
    };
}

/**
 * Import data (replace existing)
 * @param {Array} employees - Employee array
 * @param {Array} vacations - Vacation array
 */
export function importData(employees, vacations) {
    // Find max IDs to set next ID counters
    const maxEmpId = employees.length > 0
        ? Math.max(...employees.map(e => e.id))
        : 0;
    const maxVacId = vacations.length > 0
        ? Math.max(...vacations.map(v => v.id))
        : 0;

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    localStorage.setItem(STORAGE_KEYS.VACATIONS, JSON.stringify(vacations));
    localStorage.setItem(STORAGE_KEYS.NEXT_EMP_ID, maxEmpId.toString());
    localStorage.setItem(STORAGE_KEYS.NEXT_VAC_ID, maxVacId.toString());
}

/**
 * Clear all data
 */
export function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.VACATIONS);
    localStorage.removeItem(STORAGE_KEYS.NEXT_EMP_ID);
    localStorage.removeItem(STORAGE_KEYS.NEXT_VAC_ID);
    initStorage();
}
