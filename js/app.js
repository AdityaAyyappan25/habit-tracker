document.addEventListener('DOMContentLoaded', function () {

    // ============ STATE ============
    // This object holds all our app data
    const state = {
        currentViewingYear: new Date().getFullYear(),
        habit: {
            name: 'Exercise',
            completedDates: {}  // Will be loaded from localStorage
        }
    };

    // ============ STORAGE FUNCTIONS ============

    function saveData() {
        localStorage.setItem('habitTrackerData', JSON.stringify(state.habit.completedDates));
    }

    function loadData() {
        const saved = localStorage.getItem('habitTrackerData');
        if (saved) {
            state.habit.completedDates = JSON.parse(saved);
        }
    }

    // ============ HELPER FUNCTIONS ============
    const clickSound = new Audio('assets/sounds/click.mp3');
    function playSound() {
        clickSound.currentTime = 0;
        clickSound.volume = 0.5;
        clickSound.play();
    }
    function formatDate(year, month, day) {
        // Creates a string like "2025-01-15"
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return year + '-' + m + '-' + d;
    }

    function isDateInFuture(year, month, day, todayYear, todayMonth, todayDate) {
        if (year > todayYear) return true;
        if (year < todayYear) return false;
        if (month > todayMonth) return true;
        if (month < todayMonth) return false;
        return day > todayDate;
    }

    function toggleDate(dateString) {
        if (state.habit.completedDates[dateString]) {
            delete state.habit.completedDates[dateString];
        } else {
            state.habit.completedDates[dateString] = true;
        }
        saveData();
        playSound();
    }

    // ============ RENDER FUNCTIONS ============

    function renderDashboard() {
        const grid = document.getElementById('days-grid');
        grid.innerHTML = '';

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const todayDate = today.getDate();

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            dayElement.textContent = day;

            // Create date string for this day
            const dateString = formatDate(currentYear, currentMonth, day);

            // Check if this day is completed
            if (state.habit.completedDates[dateString]) {
                dayElement.classList.add('lit');
            }

            if (day > todayDate) {
                dayElement.classList.add('disabled');
            } else {
                dayElement.addEventListener('click', function () {
                    toggleDate(dateString);
                    dayElement.classList.toggle('lit');
                });
            }

            grid.appendChild(dayElement);
        }
    }

    function renderYearView() {
        const yearDisplay = document.getElementById('year-display');
        yearDisplay.textContent = state.currentViewingYear;

        const grid = document.getElementById('year-grid');
        grid.innerHTML = '';

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDate = today.getDate();

        for (let month = 0; month < 12; month++) {
            const monthColumn = document.createElement('div');
            monthColumn.className = 'month-column';

            const monthLabel = document.createElement('div');
            monthLabel.className = 'month-label';
            monthLabel.textContent = months[month];
            monthColumn.appendChild(monthLabel);

            const daysInMonth = new Date(state.currentViewingYear, month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const dayElement = document.createElement('div');
                dayElement.className = 'day';
                dayElement.textContent = day;

                const dateString = formatDate(state.currentViewingYear, month, day);

                // Check if this day is completed
                if (state.habit.completedDates[dateString]) {
                    dayElement.classList.add('lit');
                }

                const isFuture = isDateInFuture(state.currentViewingYear, month, day, todayYear, todayMonth, todayDate);

                if (isFuture) {
                    dayElement.classList.add('disabled');
                } else {
                    dayElement.addEventListener('click', function () {
                        toggleDate(dateString);
                        dayElement.classList.toggle('lit');
                    });
                }

                monthColumn.appendChild(dayElement);
            }

            grid.appendChild(monthColumn);
        }
    }

    // ============ EVENT LISTENERS ============

    const dashboardView = document.getElementById('dashboard-view');
    const yearView = document.getElementById('year-view');
    const viewYearBtn = document.getElementById('view-year-btn');
    const backBtn = document.getElementById('back-btn');
    const prevYearBtn = document.getElementById('prev-year-btn');
    const nextYearBtn = document.getElementById('next-year-btn');

    viewYearBtn.addEventListener('click', function () {
        dashboardView.classList.add('hidden');
        yearView.classList.remove('hidden');
        renderYearView();
    });

    backBtn.addEventListener('click', function () {
        yearView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    prevYearBtn.addEventListener('click', function () {
        state.currentViewingYear = state.currentViewingYear - 1;
        renderYearView();
    });

    nextYearBtn.addEventListener('click', function () {
        state.currentViewingYear = state.currentViewingYear + 1;
        renderYearView();
    });

    // ============ INITIALIZE APP ============

    loadData();       // Load saved data from localStorage
    renderDashboard(); // Render the dashboard

});