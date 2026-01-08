document.addEventListener('DOMContentLoaded', function () {

    // ============ STATE ============
    const state = {
        currentViewingYear: new Date().getFullYear(),
        currentHabitId: null,
        editingHabitId: null,
        habits: []
    };

    // ============ DOM HELPERS ============
    const $ = (id) => document.getElementById(id);
    const $q = (sel) => document.querySelector(sel);

    // ============ STORAGE ============
    function saveData() {
        localStorage.setItem('habitTrackerData', JSON.stringify(state.habits));
    }

    function loadData() {
        const saved = localStorage.getItem('habitTrackerData');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                state.habits = parsed.map(h => h.goal ? h : { ...h, goal: { type: 'daily', value: 1 } });
            }
        }
    }

    // ============ HELPERS ============
    const clickSound = new Audio('assets/sounds/click.mp3');
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MS_PER_DAY = 86400000;

    function playSound() {
        clickSound.currentTime = 0;
        clickSound.volume = 0.5;
        clickSound.play();
    }

    function formatDate(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function parseDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }

    function getTodayString() {
        const t = getToday();
        return formatDate(t.getFullYear(), t.getMonth(), t.getDate());
    }

    function isFutureDate(year, month, day) {
        return new Date(year, month, day) > getToday();
    }

    function getHabitById(id) {
        return state.habits.find(h => h.id === id);
    }

    function toggleDate(habitId, dateString) {
        const habit = getHabitById(habitId);
        if (!habit) return;
        habit.completedDates[dateString] ? delete habit.completedDates[dateString] : habit.completedDates[dateString] = true;
        saveData();
        playSound();
    }

    // ============ GOAL HELPERS ============
    function getGoalDescription(habit) {
        const { type, value } = habit.goal || { type: 'daily', value: 1 };
        if (type === 'daily') return 'Every day';
        if (type === 'weekly') return `${value}x per week`;
        if (type === 'everyXDays') return `Every ${value} days`;
        return '';
    }

    function getGoalFromForm(prefix) {
        const type = $q(`input[name="${prefix}goal-type"]:checked`)?.value || 'daily';
        let value = 1;
        if (type === 'weekly') value = parseInt($(`${prefix}weekly-value`).value);
        if (type === 'everyXDays') value = parseInt($(`${prefix}every-x-days-value`).value);
        return { type, value };
    }

    function setGoalInForm(habit, prefix) {
        const { type, value } = habit.goal || { type: 'daily', value: 1 };
        const radio = $q(`input[name="${prefix}goal-type"][value="${type}"]`);
        if (radio) radio.checked = true;
        if (type === 'weekly' && $(`${prefix}weekly-value`)) $(`${prefix}weekly-value`).value = value;
        if (type === 'everyXDays' && $(`${prefix}every-x-days-value`)) $(`${prefix}every-x-days-value`).value = value;
    }

    function resetGoalForm(prefix) {
        const radio = $q(`input[name="${prefix}goal-type"][value="daily"]`);
        if (radio) radio.checked = true;
        if ($(`${prefix}weekly-value`)) $(`${prefix}weekly-value`).value = '3';
        if ($(`${prefix}every-x-days-value`)) $(`${prefix}every-x-days-value`).value = '2';
    }

    // ============ STREAK CALCULATIONS ============
    function calculateStreak(habit) {
        const today = getToday();
        const { type, value } = habit.goal || { type: 'daily', value: 1 };

        if (type === 'daily') return calcDailyStreak(habit, today);
        if (type === 'weekly') return calcWeeklyStreak(habit, today, value);
        if (type === 'everyXDays') return calcEveryXStreak(habit, today, value);
        return 0;
    }

    function calcDailyStreak(habit, today) {
        let streak = 0;
        let check = new Date(today);
        if (!habit.completedDates[getTodayString()]) check.setDate(check.getDate() - 1);

        while (habit.completedDates[formatDate(check.getFullYear(), check.getMonth(), check.getDate())]) {
            streak++;
            check.setDate(check.getDate() - 1);
        }
        return streak;
    }

    function calcWeeklyStreak(habit, today, target) {
        let streak = 0;
        let weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);

        let count = countWeekCompletions(habit, weekStart);
        if (count > 0) { streak++; weekStart.setDate(weekStart.getDate() - 7); }
        else { weekStart.setDate(weekStart.getDate() - 7); }

        while (streak <= 52) {
            count = countWeekCompletions(habit, weekStart);
            if (count >= target) { streak++; weekStart.setDate(weekStart.getDate() - 7); }
            else break;
        }
        return streak;
    }

    function countWeekCompletions(habit, weekStart) {
        let count = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            if (habit.completedDates[formatDate(d.getFullYear(), d.getMonth(), d.getDate())]) count++;
        }
        return count;
    }

    function calcEveryXStreak(habit, today, everyX) {
        const dates = Object.keys(habit.completedDates).sort().reverse();
        if (dates.length === 0) return 0;

        const mostRecent = parseDate(dates[0]);
        const daysSince = Math.round((today - mostRecent) / MS_PER_DAY);
        if (daysSince > everyX) return 0;

        let streak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const gap = Math.round((parseDate(dates[i]) - parseDate(dates[i + 1])) / MS_PER_DAY);
            if (gap <= everyX) streak++;
            else break;
        }
        return streak;
    }

    // ============ STATUS LABELS ============
    function getStreakLabel(habit, streak) {
        const { type } = habit.goal || { type: 'daily' };

        if (type === 'weekly') {
            const status = getWeeklyStatus(habit);
            return status.overdue ? status.text : `${streak} ${streak === 1 ? 'week' : 'weeks'} streak`;
        }
        if (type === 'everyXDays') return getEveryXStatus(habit).text;

        const status = getDailyStatus(habit);
        return status.overdue ? status.text : `${streak} ${streak === 1 ? 'day' : 'days'} streak`;
    }

    function getDailyStatus(habit) {
        return habit.completedDates[getTodayString()] ? { overdue: false } : { overdue: true, text: 'Due today' };
    }

    function getWeeklyStatus(habit) {
        const target = habit.goal.value;
        const today = getToday();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());

        let count = 0;
        for (let i = 0; i <= today.getDay(); i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            if (habit.completedDates[formatDate(d.getFullYear(), d.getMonth(), d.getDate())]) count++;
        }

        const remaining = target - count;
        const daysLeft = 7 - today.getDay();
        if (remaining <= 0 || remaining <= daysLeft) return { overdue: false };
        return { overdue: true, text: 'Behind this week' };
    }

    function getEveryXStatus(habit) {
        const everyX = habit.goal.value;
        const dates = Object.keys(habit.completedDates).sort().reverse();
        if (dates.length === 0) return { text: 'Due today' };

        const today = getToday();
        const daysSince = Math.round((today - parseDate(dates[0])) / MS_PER_DAY);

        if (daysSince === 0) return { text: `Done · due in ${everyX} days` };
        if (daysSince < everyX) return { text: `Due in ${everyX - daysSince} ${everyX - daysSince === 1 ? 'day' : 'days'}` };
        if (daysSince === everyX) return { text: 'Due today' };
        const overdue = daysSince - everyX;
        return { text: `Overdue by ${overdue} ${overdue === 1 ? 'day' : 'days'}` };
    }

    // ============ RENDER FUNCTIONS ============
    const BULB_SVG = (active) => `<svg class="bulb ${active ? 'on' : 'off'}" viewBox="0 0 24 24" fill="${active ? '#e8b923' : '#555'}"><path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/></svg>`;

    function renderDashboard() {
        const container = $('habits-container');
        container.innerHTML = '';

        if (state.habits.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No habits yet</p><span>Click "+ Add Habit" to get started</span></div>';
            return;
        }
        state.habits.forEach(habit => container.appendChild(createHabitCard(habit)));
    }

    function createHabitCard(habit) {
        const card = document.createElement('div');
        card.className = 'habit-card';
        card.dataset.habitId = habit.id;

        const streak = calculateStreak(habit);
        const active = streak > 0;
        const total = Object.keys(habit.completedDates).length;

        card.innerHTML = `
            <div class="habit-header">
                <div class="habit-name-container">
                    <span class="habit-name">${habit.name}</span>
                    <span class="habit-goal-desc">${getGoalDescription(habit)}</span>
                    <div class="habit-stats">
                        <span class="streak-icon">${BULB_SVG(active)}<span class="streak-count ${active ? '' : 'off'}">${getStreakLabel(habit, streak)}</span></span>
                        <span class="total">· ${total} total</span>
                    </div>
                </div>
                <div class="habit-header-right">
                    <button class="view-btn view-year-btn">View Year</button>
                    <div class="habit-actions">
                        <button class="action-btn edit-btn">Edit</button>
                        <button class="action-btn danger-btn delete-btn">Delete</button>
                    </div>
                </div>
            </div>
            <div class="days-grid"></div>`;

        // Event listeners
        card.querySelector('.habit-name').onclick = () => openYearView(habit.id);
        card.querySelector('.view-year-btn').onclick = () => openYearView(habit.id);
        card.querySelector('.edit-btn').onclick = () => openEditModal(habit.id);
        card.querySelector('.delete-btn').onclick = () => openDeleteModal(habit.id);

        // Render days grid
        const grid = card.querySelector('.days-grid');
        const today = getToday();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day';
            dayEl.textContent = day;
            const dateStr = formatDate(today.getFullYear(), today.getMonth(), day);

            if (habit.completedDates[dateStr]) dayEl.classList.add('lit');
            if (day > today.getDate()) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.onclick = () => {
                    toggleDate(habit.id, dateStr);
                    dayEl.classList.toggle('lit');
                    updateHabitStats(habit.id);
                };
            }
            grid.appendChild(dayEl);
        }
        return card;
    }

    function updateHabitStats(habitId) {
        const habit = getHabitById(habitId);
        const card = $q(`.habit-card[data-habit-id="${habitId}"]`);
        if (!habit || !card) return;

        const streak = calculateStreak(habit);
        const active = streak > 0;
        const stats = card.querySelector('.habit-stats');
        if (stats) {
            stats.innerHTML = `<span class="streak-icon">${BULB_SVG(active)}<span class="streak-count ${active ? '' : 'off'}">${getStreakLabel(habit, streak)}</span></span><span class="total">· ${Object.keys(habit.completedDates).length} total</span>`;
        }
    }

    function openYearView(habitId) {
        state.currentHabitId = habitId;
        state.currentViewingYear = new Date().getFullYear();
        $('dashboard-view').classList.add('hidden');
        $('year-view').classList.remove('hidden');
        renderYearView();
    }

    function renderYearView() {
        const habit = getHabitById(state.currentHabitId);
        if (!habit) return;

        const yearHabitName = $q('.year-habit-name');
        if (yearHabitName) yearHabitName.textContent = habit.name;
        $('year-display').textContent = state.currentViewingYear;

        const grid = $('year-grid');
        grid.innerHTML = '';
        const today = getToday();

        for (let month = 0; month < 12; month++) {
            const col = document.createElement('div');
            col.className = 'month-column';
            col.innerHTML = `<div class="month-label">${MONTHS[month]}</div>`;

            const daysInMonth = new Date(state.currentViewingYear, month + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'day';
                dayEl.textContent = day;
                const dateStr = formatDate(state.currentViewingYear, month, day);

                if (habit.completedDates[dateStr]) dayEl.classList.add('lit');
                if (isFutureDate(state.currentViewingYear, month, day)) {
                    dayEl.classList.add('disabled');
                } else {
                    dayEl.onclick = () => {
                        toggleDate(habit.id, dateStr);
                        dayEl.classList.toggle('lit');
                    };
                }
                col.appendChild(dayEl);
            }
            grid.appendChild(col);
        }
    }

    // ============ MODAL FUNCTIONS ============
    function openAddModal() {
        resetGoalForm('');
        $('add-habit-modal').classList.remove('hidden');
        $('habit-name-input').value = '';
        $('habit-name-input').focus();
    }

    function closeAddModal() {
        $('add-habit-modal').classList.add('hidden');
    }

    function saveNewHabit() {
        const name = $('habit-name-input').value.trim();
        if (!name) return $('habit-name-input').focus();

        state.habits.push({
            id: Date.now().toString(),
            name,
            completedDates: {},
            goal: getGoalFromForm('')
        });
        saveData();
        closeAddModal();
        renderDashboard();
    }

    function openEditModal(habitId) {
        state.editingHabitId = habitId;
        const habit = getHabitById(habitId);
        if (!habit) return;

        $('edit-habit-modal').classList.remove('hidden');
        $('edit-habit-name-input').focus();
        $('edit-habit-name-input').value = habit.name;  // Set value AFTER focus
        setGoalInForm(habit, 'edit-');
    }

    function closeEditModal() {
        $('edit-habit-modal').classList.add('hidden');
        state.editingHabitId = null;
    }

    function saveEditedHabit() {
        const habit = getHabitById(state.editingHabitId);
        if (!habit) return;

        const name = $('edit-habit-name-input').value.trim();
        if (!name) return $('edit-habit-name-input').focus();

        habit.name = name;
        habit.goal = getGoalFromForm('edit-');
        saveData();
        closeEditModal();

        $('year-view').classList.contains('hidden') ? renderDashboard() : renderYearView();
    }

    function openDeleteModal(habitId) {
        state.editingHabitId = habitId;
        const habit = getHabitById(habitId);
        if (!habit) return;

        $('delete-habit-name').textContent = habit.name;
        $('delete-habit-modal').classList.remove('hidden');
    }

    function closeDeleteModal() {
        $('delete-habit-modal').classList.add('hidden');
        state.editingHabitId = null;
    }

    function confirmDelete() {
        state.habits = state.habits.filter(h => h.id !== state.editingHabitId);
        saveData();
        closeDeleteModal();

        if (!$('year-view').classList.contains('hidden')) {
            $('year-view').classList.add('hidden');
            $('dashboard-view').classList.remove('hidden');
        }
        renderDashboard();
    }

    // ============ EVENT LISTENERS ============
    // Add Modal
    $('add-habit-btn').onclick = openAddModal;
    $('cancel-habit-btn').onclick = closeAddModal;
    $('save-habit-btn').onclick = saveNewHabit;
    $('habit-name-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') saveNewHabit();
    });
    $('add-habit-modal').onclick = e => e.target === $('add-habit-modal') && closeAddModal();

    // Edit Modal
    $('cancel-edit-btn').onclick = closeEditModal;
    $('save-edit-btn').onclick = saveEditedHabit;
    $('edit-habit-name-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') saveEditedHabit();
    });
    $('edit-habit-modal').onclick = e => e.target === $('edit-habit-modal') && closeEditModal();

    // Delete Modal
    $('cancel-delete-btn').onclick = closeDeleteModal;
    $('confirm-delete-btn').onclick = confirmDelete;
    $('delete-habit-modal').onclick = e => e.target === $('delete-habit-modal') && closeDeleteModal();

    // Year View
    $('back-btn').onclick = () => {
        $('year-view').classList.add('hidden');
        $('dashboard-view').classList.remove('hidden');
        renderDashboard();
    };
    $('prev-year-btn').onclick = () => { state.currentViewingYear--; renderYearView(); };
    $('next-year-btn').onclick = () => { state.currentViewingYear++; renderYearView(); };
    $('year-edit-btn').onclick = () => openEditModal(state.currentHabitId);
    $('year-delete-btn').onclick = () => openDeleteModal(state.currentHabitId);

    // ============ INITIALIZE ============
    loadData();
    renderDashboard();

});