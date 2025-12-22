/**
 * Holidays module for fetching and caching national holidays
 * Uses Open Holidays API: https://www.openholidaysapi.org/
 */

const STORAGE_KEYS = {
    HOLIDAYS_CACHE: 'vacation_calendar_holidays_cache',
    SELECTED_COUNTRY: 'vacation_calendar_selected_country'
};

const API_BASE_URL = 'https://openholidaysapi.org';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Available countries from Open Holidays API (sorted by name)
const AVAILABLE_COUNTRIES = [
    { code: 'AL', name: 'Albania' },
    { code: 'AD', name: 'Andorra' },
    { code: 'AT', name: 'Austria' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BR', name: 'Brazil' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croatia' },
    { code: 'CZ', name: 'Czechia' },
    { code: 'EE', name: 'Estonia' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'HU', name: 'Hungary' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italy' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MT', name: 'Malta' },
    { code: 'MX', name: 'Mexico' },
    { code: 'MD', name: 'Moldova' },
    { code: 'MC', name: 'Monaco' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'RO', name: 'Romania' },
    { code: 'SM', name: 'San Marino' },
    { code: 'RS', name: 'Serbia' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'ES', name: 'Spain' },
    { code: 'SE', name: 'Sweden' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'VA', name: 'Vatican City' }
];

/**
 * Get list of available countries for dropdown
 * @returns {Array} Array of {code, name} objects
 */
export function getPopularCountries() {
    return AVAILABLE_COUNTRIES;
}

/**
 * Get country name by code
 * @param {string} countryCode
 * @returns {string|null}
 */
export function getCountryName(countryCode) {
    const country = AVAILABLE_COUNTRIES.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
}

/**
 * Get selected country from LocalStorage
 * @returns {string|null}
 */
export function getSelectedCountry() {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_COUNTRY);
}

/**
 * Save selected country to LocalStorage
 * @param {string} countryCode
 */
export function setSelectedCountry(countryCode) {
    if (countryCode) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_COUNTRY, countryCode);
    } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_COUNTRY);
    }
}

/**
 * Get cached holidays from LocalStorage
 * @returns {Object} Cache object
 */
function getCache() {
    try {
        const cache = localStorage.getItem(STORAGE_KEYS.HOLIDAYS_CACHE);
        return cache ? JSON.parse(cache) : {};
    } catch {
        return {};
    }
}

/**
 * Save cache to LocalStorage
 * @param {Object} cache
 */
function setCache(cache) {
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS_CACHE, JSON.stringify(cache));
}

/**
 * Generate cache key for a date range
 * @param {string} countryCode
 * @param {string} fromDate
 * @param {string} toDate
 * @returns {string}
 */
function getCacheKey(countryCode, fromDate, toDate) {
    return `${countryCode}_${fromDate}_${toDate}`;
}

/**
 * Get cached holidays for a specific country and date range
 * @param {string} countryCode
 * @param {string} fromDate
 * @param {string} toDate
 * @returns {Array|null} Cached holidays or null if not cached/expired
 */
function getCachedHolidays(countryCode, fromDate, toDate) {
    const cache = getCache();
    const key = getCacheKey(countryCode, fromDate, toDate);
    const entry = cache[key];

    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
        return null;
    }

    return entry.data;
}

/**
 * Save holidays to cache
 * @param {string} countryCode
 * @param {string} fromDate
 * @param {string} toDate
 * @param {Array} holidays
 */
function setCachedHolidays(countryCode, fromDate, toDate, holidays) {
    const cache = getCache();
    const key = getCacheKey(countryCode, fromDate, toDate);

    cache[key] = {
        timestamp: Date.now(),
        data: holidays
    };

    setCache(cache);
}

/**
 * Fetch holidays from Open Holidays API
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of holiday objects
 */
async function fetchHolidaysFromAPI(countryCode, fromDate, toDate) {
    const url = new URL(`${API_BASE_URL}/PublicHolidays`);
    url.searchParams.set('countryIsoCode', countryCode);
    url.searchParams.set('validFrom', fromDate);
    url.searchParams.set('validTo', toDate);
    url.searchParams.set('languageIsoCode', 'EN'); // English names

    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch holidays: ${response.status}`);
    }

    const data = await response.json();

    // Transform API response to our format
    return data.map(h => ({
        date: h.startDate,
        name: h.name?.[0]?.text || 'Holiday',
        localName: h.name?.[0]?.text || 'Holiday',
        countryCode: countryCode,
        type: h.type || 'Public'
    }));
}

/**
 * Get holidays for a date range (with caching)
 * @param {string} countryCode
 * @param {string} fromDateStr - YYYY-MM-DD
 * @param {string} toDateStr - YYYY-MM-DD
 * @returns {Promise<Array>} Array of holiday objects within range
 */
export async function getHolidaysForDateRange(countryCode, fromDateStr, toDateStr) {
    if (!countryCode) return [];

    // Check cache first
    const cached = getCachedHolidays(countryCode, fromDateStr, toDateStr);
    if (cached) {
        return cached;
    }

    // Fetch from API
    const holidays = await fetchHolidaysFromAPI(countryCode, fromDateStr, toDateStr);

    // Cache the result
    setCachedHolidays(countryCode, fromDateStr, toDateStr, holidays);

    return holidays;
}

/**
 * Check if a date string is a holiday
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array} holidays - Array of holiday objects
 * @returns {boolean}
 */
export function isHoliday(dateStr, holidays) {
    return holidays.some(h => h.date === dateStr);
}

/**
 * Get holiday info for a specific date
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array} holidays - Array of holiday objects
 * @returns {Object|null} Holiday object or null
 */
export function getHolidayInfo(dateStr, holidays) {
    return holidays.find(h => h.date === dateStr) || null;
}

/**
 * Clear holidays cache
 */
export function clearCache() {
    localStorage.removeItem(STORAGE_KEYS.HOLIDAYS_CACHE);
}
