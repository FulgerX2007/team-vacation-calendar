/**
 * Backup module for export/import functionality
 */

import * as Storage from './storage.js';

const BACKUP_VERSION = 1;

/**
 * Export all data to a JSON file
 */
export function exportData() {
    const data = Storage.getAllData();

    const exportObj = {
        version: BACKUP_VERSION,
        source: 'https://fulgerx2007.github.io/team-vacation-calendar/',
        exported_at: new Date().toISOString(),
        employees: data.employees,
        vacations: data.vacations
    };

    const json = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `vacation_calendar_backup_${date}.json`;

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Validate imported data structure
 * @param {Object} data - Parsed JSON data
 * @returns {{valid: boolean, error: string|null}}
 */
function validateImportData(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid JSON structure' };
    }

    if (!Array.isArray(data.employees)) {
        return { valid: false, error: 'Missing or invalid employees array' };
    }

    if (!Array.isArray(data.vacations)) {
        return { valid: false, error: 'Missing or invalid vacations array' };
    }

    // Validate employee structure
    for (const emp of data.employees) {
        if (typeof emp.id !== 'number' || !emp.name) {
            return { valid: false, error: 'Invalid employee data: missing id or name' };
        }
    }

    // Validate vacation structure
    for (const vac of data.vacations) {
        if (typeof vac.id !== 'number' ||
            typeof vac.employee_id !== 'number' ||
            !vac.start_date ||
            !vac.end_date) {
            return { valid: false, error: 'Invalid vacation data: missing required fields' };
        }
    }

    // Validate employee references
    const employeeIds = new Set(data.employees.map(e => e.id));
    for (const vac of data.vacations) {
        if (!employeeIds.has(vac.employee_id)) {
            return { valid: false, error: `Vacation references non-existent employee ID: ${vac.employee_id}` };
        }
    }

    return { valid: true, error: null };
}

/**
 * Import data from a JSON file
 * @param {File} file - File object from input
 * @returns {Promise<{success: boolean, message: string}>}
 */
export function importData(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate data structure
                const validation = validateImportData(data);
                if (!validation.valid) {
                    resolve({ success: false, message: validation.error });
                    return;
                }

                // Check version compatibility
                if (data.version && data.version > BACKUP_VERSION) {
                    resolve({
                        success: false,
                        message: `Backup version ${data.version} is not supported. Please update the application.`
                    });
                    return;
                }

                // Import the data (replaces existing)
                Storage.importData(data.employees, data.vacations);

                resolve({
                    success: true,
                    message: `Imported ${data.employees.length} employees and ${data.vacations.length} vacations`
                });

            } catch (err) {
                resolve({ success: false, message: `Parse error: ${err.message}` });
            }
        };

        reader.onerror = () => {
            resolve({ success: false, message: 'Failed to read file' });
        };

        reader.readAsText(file);
    });
}

/**
 * Clear all data with confirmation
 * @returns {boolean} True if data was cleared
 */
export function clearAllData() {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.\n\nConsider exporting your data first.')) {
        return false;
    }

    Storage.clearAllData();
    return true;
}
