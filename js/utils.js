// ================================================
// UTILITY FUNCTIONS
// ================================================

// Constants
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MS_PER_DAY = 86400000;

// ------------------------------------------------
// DOM Helpers
// ------------------------------------------------

// Get element by ID (shorthand)
const $ = (id) => document.getElementById(id);

// Query selector (shorthand)
const $q = (sel) => document.querySelector(sel);

// ------------------------------------------------
// Date Functions
// ------------------------------------------------

// Format date as YYYY-MM-DD string
function formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Parse YYYY-MM-DD string to Date object
function parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
}

// Get today's date (midnight)
function getToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

// Get today as YYYY-MM-DD string
function getTodayString() {
    const t = getToday();
    return formatDate(t.getFullYear(), t.getMonth(), t.getDate());
}

// Check if a date is in the future
function isFutureDate(year, month, day) {
    return new Date(year, month, day) > getToday();
}

// ------------------------------------------------
// Greeting Helper
// ------------------------------------------------

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
}