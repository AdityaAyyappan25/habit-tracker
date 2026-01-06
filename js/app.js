document.addEventListener('DOMContentLoaded', function () {

    // ============ STATE ============
    const state = {
        currentViewingYear: new Date().getFullYear(),
        currentHabitId: null,
        habits: []
    };

    // ============ STORAGE FUNCTIONS ============

    function saveData() {
        localStorage.setItem('habitTrackerData', JSON.stringify(state.habits));
    }

    function loadData() {
        const saved = localStorage.getItem('habitTrackerData');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                // Add default goal to old habits that don't have it
                state.habits = parsed.map(function (habit) {
                    if (!habit.goal) {
                        habit.goal = { type: 'daily', value: 1 };
                    }
                    return habit;
                });
            } else {
                state.habits = [];
            }
        }
    }

    // ============ HELPER FUNCTIONS ============

    const clickSound = new Audio('assets/sounds/click.mp3');

    function playSound() {
        clickSound.currentTime = 0;
        clickSound.volume = 0.5;
        clickSound.play();
    }

    function generateId() {
        return Date.now().toString();
    }

    function formatDate(year, month, day) {
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

    function getHabitById(habitId) {
        return state.habits.find(function (habit) {
            return habit.id === habitId;
        });
    }

    function toggleDate(habitId, dateString) {
        const habit = getHabitById(habitId);
        if (!habit) return;

        if (habit.completedDates[dateString]) {
            delete habit.completedDates[dateString];
        } else {
            habit.completedDates[dateString] = true;
        }
        saveData();
        playSound();
    }

    function calculateStreak(habit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const goalType = habit.goal ? habit.goal.type : 'daily';
        const goalValue = habit.goal ? habit.goal.value : 1;

        if (goalType === 'daily') {
            return calculateDailyStreak(habit, today);
        } else if (goalType === 'weekly') {
            return calculateWeeklyStreak(habit, today, goalValue);
        } else if (goalType === 'everyXDays') {
            return calculateEveryXDaysStreak(habit, today, goalValue);
        }

        return 0;
    }

    function calculateDailyStreak(habit, today) {
        let streak = 0;
        let checkDate = new Date(today);

        const todayString = formatDate(
            checkDate.getFullYear(),
            checkDate.getMonth(),
            checkDate.getDate()
        );

        if (!habit.completedDates[todayString]) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const dateString = formatDate(
                checkDate.getFullYear(),
                checkDate.getMonth(),
                checkDate.getDate()
            );

            if (habit.completedDates[dateString]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    function calculateWeeklyStreak(habit, today, targetPerWeek) {
        let streak = 0;

        // Get start of current week (Sunday)
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);

        let weekStart = new Date(currentWeekStart);

        // First, check current week
        let completionsThisWeek = countCompletionsInWeek(habit, weekStart);

        // If current week has progress, count it and move to previous week
        if (completionsThisWeek > 0) {
            streak++;
            weekStart.setDate(weekStart.getDate() - 7);
        } else {
            // No progress this week - start checking from last week
            weekStart.setDate(weekStart.getDate() - 7);
        }

        // Now check previous weeks - must meet goal
        while (true) {
            completionsThisWeek = countCompletionsInWeek(habit, weekStart);

            if (completionsThisWeek >= targetPerWeek) {
                streak++;
                weekStart.setDate(weekStart.getDate() - 7);
            } else {
                break;
            }

            // Safety limit
            if (streak > 52) break;
        }

        return streak;
    }

    function countCompletionsInWeek(habit, weekStart) {
        let count = 0;

        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(weekStart);
            checkDate.setDate(weekStart.getDate() + i);

            const dateString = formatDate(
                checkDate.getFullYear(),
                checkDate.getMonth(),
                checkDate.getDate()
            );

            if (habit.completedDates[dateString]) {
                count++;
            }
        }

        return count;
    }

    function calculateEveryXDaysStreak(habit, today, everyXDays) {
        const completedDates = Object.keys(habit.completedDates).sort().reverse();

        if (completedDates.length === 0) {
            return 0;
        }

        // Parse date string safely (avoid timezone issues)
        function parseDate(dateStr) {
            const parts = dateStr.split('-');
            const d = new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                parseInt(parts[2])
            );
            d.setHours(0, 0, 0, 0);
            return d;
        }

        const mostRecent = parseDate(completedDates[0]);
        const todayDate = new Date(today);
        todayDate.setHours(0, 0, 0, 0);

        const daysSinceLast = Math.round((todayDate - mostRecent) / (1000 * 60 * 60 * 24));

        if (daysSinceLast > everyXDays) {
            return 0;
        }

        let streak = 1;

        for (let i = 0; i < completedDates.length - 1; i++) {
            const current = parseDate(completedDates[i]);
            const previous = parseDate(completedDates[i + 1]);

            const gap = Math.round((current - previous) / (1000 * 60 * 60 * 24));

            if (gap <= everyXDays) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    function calculateTotalDays(habit) {
        return Object.keys(habit.completedDates).length;
    }

    function getStreakLabel(habit, streakCount) {
        const goalType = habit.goal ? habit.goal.type : 'daily';

        if (goalType === 'weekly') {
            // Check if on track this week
            const status = getWeeklyStatus(habit);
            if (status.overdue) {
                return status.text;
            }
            return streakCount + (streakCount === 1 ? ' week streak' : ' weeks streak');
        } else if (goalType === 'everyXDays') {
            const status = getEveryXDaysStatus(habit);
            return status.text;
        } else {
            // Daily - check if done today
            const status = getDailyStatus(habit);
            if (status.overdue) {
                return status.text;
            }
            return streakCount + (streakCount === 1 ? ' day streak' : ' days streak');
        }
    }

    function getEveryXDaysStatus(habit) {
        const everyXDays = habit.goal.value;
        const completedDates = Object.keys(habit.completedDates).sort().reverse();

        if (completedDates.length === 0) {
            return { text: 'Due today' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Parse the date string manually to avoid timezone issues
        const lastDateStr = completedDates[0];
        const parts = lastDateStr.split('-');
        const lastCompletion = new Date(
            parseInt(parts[0]),      // year
            parseInt(parts[1]) - 1,  // month (0-indexed)
            parseInt(parts[2])       // day
        );
        lastCompletion.setHours(0, 0, 0, 0);

        const daysSinceLast = Math.round((today - lastCompletion) / (1000 * 60 * 60 * 24));

        if (daysSinceLast === 0) {
            return { text: 'Done · due in ' + everyXDays + ' days' };
        } else if (daysSinceLast < everyXDays) {
            const daysUntilDue = everyXDays - daysSinceLast;
            return { text: 'Due in ' + daysUntilDue + (daysUntilDue === 1 ? ' day' : ' days') };
        } else if (daysSinceLast === everyXDays) {
            return { text: 'Due today' };
        } else {
            const daysOverdue = daysSinceLast - everyXDays;
            return { text: 'Overdue by ' + daysOverdue + (daysOverdue === 1 ? ' day' : ' days') };
        }
    }
    function getDailyStatus(habit) {
        const today = new Date();
        const todayString = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

        if (habit.completedDates[todayString]) {
            return { overdue: false };
        } else {
            return { overdue: true, text: 'Due today' };
        }
    }

    function getWeeklyStatus(habit) {
        const targetPerWeek = habit.goal.value;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get start of current week (Sunday)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());

        // Count completions this week
        let completionsThisWeek = 0;
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(weekStart);
            checkDate.setDate(weekStart.getDate() + i);

            // Don't count future days
            if (checkDate > today) break;

            const dateString = formatDate(
                checkDate.getFullYear(),
                checkDate.getMonth(),
                checkDate.getDate()
            );

            if (habit.completedDates[dateString]) {
                completionsThisWeek++;
            }
        }

        // Days left in week (including today)
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const daysLeftInWeek = 7 - dayOfWeek;

        const remaining = targetPerWeek - completionsThisWeek;

        if (remaining <= 0) {
            return { overdue: false };
        } else if (remaining <= daysLeftInWeek) {
            return { overdue: false }; // Still achievable
        } else {
            return { overdue: true, text: 'Behind this week' };
        }
    }

    function getGoalDescription(habit) {
        const goalType = habit.goal ? habit.goal.type : 'daily';
        const goalValue = habit.goal ? habit.goal.value : 1;

        if (goalType === 'daily') {
            return 'Every day';
        } else if (goalType === 'weekly') {
            return goalValue + 'x per week';
        } else if (goalType === 'everyXDays') {
            return 'Every ' + goalValue + ' days';
        }
        return '';
    }
    // ============ RENDER FUNCTIONS ============

    function renderDashboard() {
        const container = document.getElementById('habits-container');
        container.innerHTML = '';

        // Empty state
        if (state.habits.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<p>No habits yet</p><span>Click "+ Add Habit" to get started</span>';
            container.appendChild(emptyState);
            return;
        }

        // Render each habit card
        state.habits.forEach(function (habit) {
            const card = createHabitCard(habit);
            container.appendChild(card);
        });
    }

    function createHabitCard(habit) {
        const card = document.createElement('div');
        card.className = 'habit-card';

        // Header
        const header = document.createElement('div');
        header.className = 'habit-header';

        const nameContainer = document.createElement('div');
        nameContainer.className = 'habit-name-container';

        const name = document.createElement('span');
        name.className = 'habit-name';
        name.textContent = habit.name;
        name.style.cursor = 'pointer';
        name.addEventListener('click', function () {
            openYearView(habit.id);
        });
        // Add goal description
        const goalDesc = document.createElement('span');
        goalDesc.className = 'habit-goal-desc';
        goalDesc.textContent = getGoalDescription(habit);

        const stats = document.createElement('div');
        stats.className = 'habit-stats';

        const streak = calculateStreak(habit);
        const isStreakActive = streak > 0;

        const bulbSVG = `<svg class="bulb ${isStreakActive ? 'on' : 'off'}" viewBox="0 0 24 24" fill="${isStreakActive ? '#e8b923' : '#555'}">
            <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/>
        </svg>`;

        stats.innerHTML = '<span class="streak-icon">' + bulbSVG + '<span class="streak-count ' + (isStreakActive ? '' : 'off') + '">' + getStreakLabel(habit, streak) + '</span></span> · <span class="total">' + calculateTotalDays(habit) + ' total</span>';

        nameContainer.appendChild(name);
        nameContainer.appendChild(goalDesc);
        nameContainer.appendChild(stats);

        const viewYearBtn = document.createElement('button');
        viewYearBtn.className = 'view-btn';
        viewYearBtn.textContent = 'View Year';
        viewYearBtn.addEventListener('click', function () {
            openYearView(habit.id);
        });

        header.appendChild(nameContainer);
        header.appendChild(viewYearBtn);
        card.appendChild(header);

        // Days grid
        const grid = document.createElement('div');
        grid.className = 'days-grid';

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const todayDate = today.getDate();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            dayElement.textContent = day;

            const dateString = formatDate(currentYear, currentMonth, day);

            if (habit.completedDates[dateString]) {
                dayElement.classList.add('lit');
            }

            if (day > todayDate) {
                dayElement.classList.add('disabled');
            } else {
                dayElement.addEventListener('click', function () {
                    toggleDate(habit.id, dateString);
                    dayElement.classList.toggle('lit');
                    updateHabitStats(habit.id);
                });
            }

            grid.appendChild(dayElement);
        }

        card.appendChild(grid);

        // Store habit ID on the card for reference
        card.dataset.habitId = habit.id;

        return card;
    }

    function updateHabitStats(habitId) {
        const habit = getHabitById(habitId);
        if (!habit) return;

        const card = document.querySelector('.habit-card[data-habit-id="' + habitId + '"]');
        if (!card) return;

        const stats = card.querySelector('.habit-stats');
        if (stats) {
            const streak = calculateStreak(habit);
            const isStreakActive = streak > 0;

            const bulbSVG = `<svg class="bulb ${isStreakActive ? 'on' : 'off'}" viewBox="0 0 24 24" fill="${isStreakActive ? '#e8b923' : '#555'}">
                <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/>
            </svg>`;

            stats.innerHTML = '<span class="streak-icon">' + bulbSVG + '<span class="streak-count ' + (isStreakActive ? '' : 'off') + '">' + getStreakLabel(habit, streak) + '</span></span> · <span class="total">' + calculateTotalDays(habit) + ' total</span>';
        }
    }

    function openYearView(habitId) {
        state.currentHabitId = habitId;
        state.currentViewingYear = new Date().getFullYear();

        dashboardView.classList.add('hidden');
        yearView.classList.remove('hidden');

        renderYearView();
    }

    function renderYearView() {
        const habit = getHabitById(state.currentHabitId);
        if (!habit) return;

        // Update header
        const yearHabitName = document.querySelector('.year-habit-name');
        if (yearHabitName) {
            yearHabitName.textContent = habit.name;
        }

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

                if (habit.completedDates[dateString]) {
                    dayElement.classList.add('lit');
                }

                const isFuture = isDateInFuture(state.currentViewingYear, month, day, todayYear, todayMonth, todayDate);

                if (isFuture) {
                    dayElement.classList.add('disabled');
                } else {
                    dayElement.addEventListener('click', function () {
                        toggleDate(habit.id, dateString);
                        dayElement.classList.toggle('lit');
                    });
                }

                monthColumn.appendChild(dayElement);
            }

            grid.appendChild(monthColumn);
        }
    }

    // ============ MODAL FUNCTIONS ============

    function openModal() {
        addHabitModal.classList.remove('hidden');
        habitNameInput.value = '';
        habitNameInput.focus();
    }

    function closeModal() {
        addHabitModal.classList.add('hidden');
        habitNameInput.value = '';
        // Reset goal options to default
        document.querySelector('input[name="goal-type"][value="daily"]').checked = true;
        document.getElementById('weekly-value').value = '3';
        document.getElementById('every-x-days-value').value = '2';
    }

    function saveNewHabit() {
        const name = habitNameInput.value.trim();

        if (name === '') {
            habitNameInput.focus();
            return;
        }

        // Get selected goal type
        const goalTypeInput = document.querySelector('input[name="goal-type"]:checked');
        const goalType = goalTypeInput.value;

        // Get goal value based on type
        let goalValue = 1;
        if (goalType === 'weekly') {
            goalValue = parseInt(document.getElementById('weekly-value').value);
        } else if (goalType === 'everyXDays') {
            goalValue = parseInt(document.getElementById('every-x-days-value').value);
        }

        const newHabit = {
            id: generateId(),
            name: name,
            completedDates: {},
            goal: {
                type: goalType,
                value: goalValue
            }
        };

        state.habits.push(newHabit);
        saveData();
        closeModal();
        renderDashboard();
    }

    // ============ EVENT LISTENERS ============

    const dashboardView = document.getElementById('dashboard-view');
    const yearView = document.getElementById('year-view');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const addHabitModal = document.getElementById('add-habit-modal');
    const habitNameInput = document.getElementById('habit-name-input');
    const cancelHabitBtn = document.getElementById('cancel-habit-btn');
    const saveHabitBtn = document.getElementById('save-habit-btn');
    const backBtn = document.getElementById('back-btn');
    const prevYearBtn = document.getElementById('prev-year-btn');
    const nextYearBtn = document.getElementById('next-year-btn');

    // Add Habit Modal
    addHabitBtn.addEventListener('click', openModal);
    cancelHabitBtn.addEventListener('click', closeModal);
    saveHabitBtn.addEventListener('click', saveNewHabit);

    // Allow Enter key to save habit
    habitNameInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            saveNewHabit();
        }
    });

    // Close modal when clicking outside
    addHabitModal.addEventListener('click', function (e) {
        if (e.target === addHabitModal) {
            closeModal();
        }
    });

    // Year View Navigation
    backBtn.addEventListener('click', function () {
        yearView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        renderDashboard();
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

    loadData();
    renderDashboard();

});