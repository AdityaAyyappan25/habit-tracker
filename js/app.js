// ================================================
// HABIT TRACKER - MAIN APPLICATION
// ================================================
// 
// Structure:
// 1. Authentication
// 2. State Management
// 3. Database Operations (CRUD)
// 4. Habit Helpers (goals, streaks, status)
// 5. Counter Logic
// 6. Render Functions
// 7. Modal Functions
// 8. Statistics
// 9. Drag and Drop
// 10. Event Listeners
// 11. Initialization
//
// ================================================

document.addEventListener('DOMContentLoaded', function () {

    // ================================================
    // 1. AUTHENTICATION
    // ================================================

    async function checkAuth() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        return session.user;
    }

    // Initialize app only if logged in
    checkAuth().then(user => {
        if (user) {
            initApp(user);
        }
    });

    // ================================================
    // MAIN APP INITIALIZATION
    // ================================================

    async function initApp(user) {

        // ================================================
        // 2. STATE MANAGEMENT
        // ================================================

        const state = {
            currentViewingYear: new Date().getFullYear(),
            currentHabitId: null,
            editingHabitId: null,
            habits: [],
            userId: user.id,
            habitsLoaded: false
        };

        // ================================================
        // 3. DATABASE OPERATIONS (CRUD)
        // ================================================

        // Load all habits and completions from Supabase
        async function loadHabits() {
            const { data: habits, error: habitsError } = await sb
                .from('habits')
                .select('*')
                .eq('user_id', state.userId)
                .order('display_order', { ascending: true });

            if (habitsError) {
                console.error('Error loading habits:', habitsError);
                return;
            }

            const { data: completions, error: compError } = await sb
                .from('completions')
                .select('*')
                .eq('user_id', state.userId);

            if (compError) {
                console.error('Error loading completions:', compError);
                return;
            }

            state.habits = habits.map(h => {
                const habitCompletions = completions.filter(c => c.habit_id === h.id);
                const completedDates = {};
                habitCompletions.forEach(c => {
                    completedDates[c.completed_date] = true;
                });

                return {
                    id: h.id,
                    name: h.name,
                    goal: { type: h.goal_type, value: h.goal_value },
                    completedDates: completedDates,
                    isCounter: h.is_counter || false,
                    targetCount: h.target_count || 1,
                    currentCount: h.current_count || 0,
                    autoReset: h.auto_reset !== false,
                    lastResetDate: h.last_reset_date
                };
            });

            state.habitsLoaded = true;
            renderDashboard();
            displayWelcome();
        }

        // Display AI-generated welcome message
        async function displayWelcome() {
            const { data } = await sb.from('profiles')
                .select('username')
                .eq('id', state.userId)
                .single();

            const username = data?.username || 'there';

            $('welcome-message').innerHTML = `<span style="opacity: 0.5;">✦ Preparing your message...</span>`;

            if (state.habits.length > 0 || state.habitsLoaded) {
                try {
                    const aiMessage = await generateWelcomeMessage(username, state.habits);
                    $('welcome-message').innerHTML = `${aiMessage}`;
                } catch (error) {
                    $('welcome-message').innerHTML = `${getGreeting()}, <span>@${username}</span>!`;
                }
            } else {
                $('welcome-message').innerHTML = `${getGreeting()}, <span>@${username}</span>!`;
            }
        }

        // Create a new habit
        async function createHabit(name, goalType, goalValue) {
            const { data, error } = await sb
                .from('habits')
                .insert({
                    user_id: state.userId,
                    name: name,
                    goal_type: goalType,
                    goal_value: goalValue
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating habit:', error);
                return null;
            }

            return {
                id: data.id,
                name: data.name,
                goal: { type: data.goal_type, value: data.goal_value },
                completedDates: {}
            };
        }

        // Update an existing habit
        async function updateHabit(habitId, name, goalType, goalValue) {
            const { error } = await sb
                .from('habits')
                .update({
                    name: name,
                    goal_type: goalType,
                    goal_value: goalValue,
                    updated_at: new Date().toISOString()
                })
                .eq('id', habitId);

            if (error) {
                console.error('Error updating habit:', error);
                return false;
            }
            return true;
        }

        // Delete a habit
        async function deleteHabit(habitId) {
            const { error } = await sb
                .from('habits')
                .delete()
                .eq('id', habitId);

            if (error) {
                console.error('Error deleting habit:', error);
                return false;
            }
            return true;
        }

        // Toggle completion for a specific date
        async function toggleCompletion(habitId, dateString) {
            const habit = getHabitById(habitId);
            if (!habit) return;

            if (habit.completedDates[dateString]) {
                const { error } = await sb
                    .from('completions')
                    .delete()
                    .eq('habit_id', habitId)
                    .eq('completed_date', dateString);

                if (!error) {
                    delete habit.completedDates[dateString];
                }
            } else {
                const { error } = await sb
                    .from('completions')
                    .insert({
                        habit_id: habitId,
                        user_id: state.userId,
                        completed_date: dateString
                    });

                if (!error) {
                    habit.completedDates[dateString] = true;
                }
            }
        }

        // Get habit by ID
        function getHabitById(id) {
            return state.habits.find(h => h.id === id);
        }

        // ================================================
        // 4. HABIT HELPERS (Goals, Streaks, Status)
        // ================================================

        // Get human-readable goal description
        function getGoalDescription(habit) {
            const { type, value } = habit.goal || { type: 'daily', value: 1 };
            if (type === 'daily') return 'Every day';
            if (type === 'weekly') return `${value}x per week`;
            if (type === 'everyXDays') return `Every ${value} days`;
            return '';
        }

        // Extract goal settings from form
        function getGoalFromForm(prefix) {
            const type = $q(`input[name="${prefix}goal-type"]:checked`)?.value || 'daily';
            let value = 1;
            if (type === 'weekly') value = parseInt($(`${prefix}weekly-value`).value);
            if (type === 'everyXDays') value = parseInt($(`${prefix}every-x-days-value`).value);
            return { type, value };
        }

        // Set goal in form from habit data
        function setGoalInForm(habit, prefix) {
            const { type, value } = habit.goal || { type: 'daily', value: 1 };
            const radio = $q(`input[name="${prefix}goal-type"][value="${type}"]`);
            if (radio) radio.checked = true;
            if (type === 'weekly' && $(`${prefix}weekly-value`)) $(`${prefix}weekly-value`).value = value;
            if (type === 'everyXDays' && $(`${prefix}every-x-days-value`)) $(`${prefix}every-x-days-value`).value = value;
        }

        // Reset goal form to defaults
        function resetGoalForm(prefix) {
            const radio = $q(`input[name="${prefix}goal-type"][value="daily"]`);
            if (radio) radio.checked = true;
            if ($(`${prefix}weekly-value`)) $(`${prefix}weekly-value`).value = '3';
            if ($(`${prefix}every-x-days-value`)) $(`${prefix}every-x-days-value`).value = '2';
        }

        // --- Streak Calculations ---

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

        // --- Status Labels ---

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

        // ================================================
        // 5. COUNTER LOGIC
        // ================================================

        async function incrementCounter(habitId) {
            const habit = getHabitById(habitId);
            if (!habit || !habit.isCounter) return;
            if (habit.currentCount >= habit.targetCount) return;

            habit.currentCount = (habit.currentCount || 0) + 1;

            const { error } = await sb
                .from('habits')
                .update({ current_count: habit.currentCount })
                .eq('id', habitId);

            if (error) {
                console.error('Error updating counter:', error);
                return;
            }

            playTickerSound();
            updateCounterCard(habitId);

            // Auto-mark today as complete when target reached
            if (habit.currentCount >= habit.targetCount) {
                playCompleteSound();
                const today = getTodayString();
                if (!habit.completedDates[today]) {
                    await toggleCompletion(habitId, today);
                    const card = document.querySelector(`.habit-card[data-habit-id="${habitId}"]`);
                    const todayDate = new Date().getDate();
                    const dayEls = card.querySelectorAll('.days-grid .day');
                    if (dayEls[todayDate - 1]) {
                        dayEls[todayDate - 1].classList.add('lit');
                    }
                    updateHabitStats(habitId);
                }
            }
        }

        async function resetCounter(habitId) {
            const habit = getHabitById(habitId);
            if (!habit) return;

            habit.currentCount = 0;

            const { error } = await sb
                .from('habits')
                .update({
                    current_count: 0,
                    last_reset_date: new Date().toISOString().split('T')[0]
                })
                .eq('id', habitId);

            if (error) {
                console.error('Error resetting counter:', error);
                return;
            }

            playResetSound();
            updateCounterCard(habitId);
        }

        function updateCounterCard(habitId) {
            const habit = getHabitById(habitId);
            const card = document.querySelector(`.habit-card[data-habit-id="${habitId}"]`);
            if (!habit || !card || !habit.isCounter) return;

            const counterSection = card.querySelector('.counter-section');
            if (!counterSection) return;

            const current = habit.currentCount || 0;
            const target = habit.targetCount || 1;
            const isComplete = current >= target;
            const percentage = Math.min((current / target) * 100, 100);

            // Update gauge
            const radius = 50;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (percentage / 100) * circumference;
            const gaugeProgress = counterSection.querySelector('.gauge-progress');
            if (gaugeProgress) {
                gaugeProgress.style.strokeDashoffset = offset;
                gaugeProgress.classList.toggle('complete', isComplete);
            }

            // Update count display with flip animation
            const countEl = counterSection.querySelector('.mini-gauge-count');
            if (countEl && countEl.textContent !== String(current)) {
                countEl.classList.add('flip');
                setTimeout(() => {
                    countEl.textContent = current;
                    countEl.classList.remove('flip');
                }, 150);
            }

            // Update completion badge
            let badge = counterSection.querySelector('.counter-complete-badge');
            if (isComplete && !badge) {
                badge = document.createElement('span');
                badge.className = 'counter-complete-badge';
                badge.textContent = '✓';
                counterSection.appendChild(badge);
            } else if (!isComplete && badge) {
                badge.remove();
            }

            // Update button
            const clickBtn = counterSection.querySelector('.click-btn');
            if (clickBtn) {
                clickBtn.classList.toggle('completed', isComplete);
                clickBtn.textContent = isComplete ? '✓' : '+';
                clickBtn.onclick = isComplete ? null : () => incrementCounter(habitId);
            }
        }

        // Check and perform auto-reset for counter habits
        async function checkAutoReset() {
            const today = new Date().toISOString().split('T')[0];

            for (const habit of state.habits) {
                if (habit.isCounter && habit.autoReset) {
                    if (habit.lastResetDate !== today && habit.currentCount > 0) {
                        await resetCounter(habit.id);
                    }
                }
            }
        }

        // ================================================
        // 6. RENDER FUNCTIONS
        // ================================================

        const BULB_SVG = (active) => `<svg class="bulb ${active ? 'on' : 'off'}" viewBox="0 0 24 24" fill="${active ? '#e8b923' : '#555'}"><path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/></svg>`;

        function renderDashboard() {
            const container = $('habits-container');
            container.innerHTML = '';

            if (state.habits.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No habits yet</p>
                        <span>Click "+ Add Habit" to get started</span>
                    </div>
                `;
                return;
            }

            state.habits.forEach(habit => {
                container.appendChild(createHabitCard(habit));
            });

            checkAutoReset();
        }

        function createHabitCard(habit) {
            const card = document.createElement('div');
            card.className = 'habit-card';
            card.dataset.habitId = habit.id;
            card.draggable = true;

            const streak = calculateStreak(habit);
            const active = streak > 0;
            const total = Object.keys(habit.completedDates).length;

            // Counter values (if enabled)
            const hasCounter = habit.isCounter || false;
            const current = habit.currentCount || 0;
            const target = habit.targetCount || 1;
            const isComplete = hasCounter && current >= target;
            const percentage = Math.min((current / target) * 100, 100);

            // Gauge calculations
            const radius = 50;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (percentage / 100) * circumference;

            // Counter HTML (only if habit has counter)
            const counterHTML = hasCounter ? `
                <div class="counter-section">
                    ${isComplete ? '<span class="counter-complete-badge">✓</span>' : ''}
                    <div class="mini-gauge-container">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle class="gauge-bg" cx="60" cy="60" r="${radius}"/>
                            <circle class="gauge-progress ${isComplete ? 'complete' : ''}" 
                                    cx="60" cy="60" r="${radius}"
                                    stroke-dasharray="${circumference}"
                                    stroke-dashoffset="${offset}"/>
                        </svg>
                        <div class="mini-gauge-center">
                            <span class="mini-gauge-count">${current}</span>
                            <span class="mini-gauge-target">of ${target}</span>
                        </div>
                    </div>
                    <div class="counter-controls">
                        <button class="counter-btn click-btn ${isComplete ? 'completed' : ''}">
                            ${isComplete ? '✓' : '+'}
                        </button>
                        <button class="counter-btn reset-btn" title="Reset counter">↺</button>
                    </div>
                    <span class="counter-reset-info">${habit.autoReset ? 'Auto-reset' : 'Manual'}</span>
                </div>
            ` : '';

            card.innerHTML = `
                <span class="drag-handle">⋮⋮</span>
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
                <div class="habit-body">
                    <div class="days-grid"></div>
                    ${counterHTML}
                </div>
            `;

            // Event listeners - header buttons
            card.querySelector('.habit-name').onclick = () => openYearView(habit.id);
            card.querySelector('.view-year-btn').onclick = () => openYearView(habit.id);
            card.querySelector('.edit-btn').onclick = () => openEditModal(habit.id);
            card.querySelector('.delete-btn').onclick = () => openDeleteModal(habit.id);

            // Event listeners - counter buttons (if counter exists)
            if (hasCounter) {
                const clickBtn = card.querySelector('.click-btn');
                if (!isComplete) {
                    clickBtn.onclick = () => incrementCounter(habit.id);
                }
                card.querySelector('.reset-btn').onclick = () => resetCounter(habit.id);
            }

            // Build days grid
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
                    dayEl.onclick = async () => {
                        await toggleCompletion(habit.id, dateStr);
                        dayEl.classList.toggle('lit');
                        updateHabitStats(habit.id);
                        playSound();
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

        // --- Year View ---

        function openYearView(habitId) {
            state.currentHabitId = habitId;
            state.currentViewingYear = new Date().getFullYear();
            $('dashboard-view').classList.add('hidden');
            $('year-view').classList.remove('hidden');
            renderYearView();
            updateYearNavigationButtons();
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

            // Always render full year grid (all 12 months, all days)
            for (let month = 0; month < 12; month++) {
                const col = document.createElement('div');
                col.className = 'month-column';
                col.innerHTML = `<div class="month-label">${MONTHS[month]}</div>`;

                const daysInMonth = new Date(state.currentViewingYear, month + 1, 0).getDate();

                // Render all days in the month
                for (let day = 1; day <= daysInMonth; day++) {
                    const dayEl = document.createElement('div');
                    dayEl.className = 'day';
                    dayEl.textContent = day;
                    const dateStr = formatDate(state.currentViewingYear, month, day);

                    if (habit.completedDates[dateStr]) dayEl.classList.add('lit');

                    // Disable future dates
                    if (isFutureDate(state.currentViewingYear, month, day)) {
                        dayEl.classList.add('disabled');
                    } else {
                        dayEl.onclick = async () => {
                            await toggleCompletion(habit.id, dateStr);
                            dayEl.classList.toggle('lit');
                            playSound();
                        };
                    }

                    col.appendChild(dayEl);
                }
                grid.appendChild(col);
            }
        }


        // ================================================
        // 7. MODAL FUNCTIONS
        // ================================================

        // --- Add Habit Modal ---

        function openAddModal() {
            resetGoalForm('');
            $('add-habit-modal').classList.remove('hidden');
            $('habit-name-input').value = '';
            $('habit-name-input').focus();

            // Reset habit type to regular
            document.querySelector('input[name="habit-type"][value="regular"]').checked = true;
            $('counter-options').classList.add('hidden');
            document.querySelector('.goal-options').classList.remove('hidden');
        }

        function closeAddModal() {
            $('add-habit-modal').classList.add('hidden');
        }

        async function saveNewHabit() {
            const name = $('habit-name-input').value.trim();
            if (!name) return $('habit-name-input').focus();

            const habitType = document.querySelector('input[name="habit-type"]:checked').value;

            if (habitType === 'counter') {
                const targetCount = parseInt($('target-count').value) || 1;
                const autoReset = document.querySelector('input[name="reset-type"]:checked').value === 'auto';

                const { data, error } = await sb
                    .from('habits')
                    .insert({
                        user_id: state.userId,
                        name: name,
                        is_counter: true,
                        target_count: targetCount,
                        current_count: 0,
                        auto_reset: autoReset,
                        last_reset_date: new Date().toISOString().split('T')[0],
                        goal_type: 'daily',
                        goal_value: 1
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('Error creating counter habit:', error);
                    return;
                }

                state.habits.push({
                    id: data.id,
                    name: data.name,
                    isCounter: true,
                    targetCount: data.target_count,
                    currentCount: 0,
                    autoReset: data.auto_reset,
                    lastResetDate: data.last_reset_date,
                    goal: { type: 'daily', value: 1 },
                    completedDates: {}
                });
            } else {
                const goal = getGoalFromForm('');
                const newHabit = await createHabit(name, goal.type, goal.value);
                if (newHabit) {
                    state.habits.push(newHabit);
                }
            }

            closeAddModal();
            renderDashboard();
        }

        // --- Edit Habit Modal ---

        function openEditModal(habitId) {
            state.editingHabitId = habitId;
            const habit = getHabitById(habitId);
            if (!habit) return;

            $('edit-habit-modal').classList.remove('hidden');
            $('edit-habit-name-input').value = habit.name;
            $('edit-habit-name-input').focus();
            setGoalInForm(habit, 'edit-');

            // Set counter options
            const enableCounter = $('edit-enable-counter');
            const counterOptions = $('edit-counter-options');

            enableCounter.checked = habit.isCounter || false;

            if (habit.isCounter) {
                counterOptions.classList.remove('hidden');
                $('edit-target-count').value = habit.targetCount || 8;

                const resetType = habit.autoReset ? 'auto' : 'manual';
                const resetRadio = document.querySelector(`input[name="edit-reset-type"][value="${resetType}"]`);
                if (resetRadio) resetRadio.checked = true;
            } else {
                counterOptions.classList.add('hidden');
            }
        }

        function closeEditModal() {
            $('edit-habit-modal').classList.add('hidden');
            state.editingHabitId = null;
        }

        async function saveEditedHabit() {
            const habit = getHabitById(state.editingHabitId);
            if (!habit) return;

            const name = $('edit-habit-name-input').value.trim();
            if (!name) return $('edit-habit-name-input').focus();

            const goal = getGoalFromForm('edit-');

            // Get counter settings
            const enableCounter = $('edit-enable-counter').checked;
            const targetCount = parseInt($('edit-target-count').value) || 8;
            const autoReset = document.querySelector('input[name="edit-reset-type"]:checked')?.value === 'auto';

            // Update in database
            const { error } = await sb
                .from('habits')
                .update({
                    name: name,
                    goal_type: goal.type,
                    goal_value: goal.value,
                    is_counter: enableCounter,
                    target_count: enableCounter ? targetCount : null,
                    auto_reset: enableCounter ? autoReset : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', habit.id);

            if (error) {
                console.error('Error updating habit:', error);
                return;
            }

            // Update local state
            habit.name = name;
            habit.goal = goal;
            habit.isCounter = enableCounter;
            habit.targetCount = enableCounter ? targetCount : null;
            habit.autoReset = enableCounter ? autoReset : null;

            // Reset counter if just enabled
            if (enableCounter && !habit.currentCount) {
                habit.currentCount = 0;
            }

            closeEditModal();

            if ($('year-view').classList.contains('hidden')) {
                renderDashboard();
            } else {
                renderYearView();
            }
        }

        // --- Delete Habit Modal ---

        function openDeleteModal(habitId) {
            state.editingHabitId = habitId;
            const habit = getHabitById(habitId);
            if (!habit) return;

            $('delete-habit-modal').classList.remove('hidden');
            $('delete-habit-name').textContent = habit.name;
        }

        function closeDeleteModal() {
            $('delete-habit-modal').classList.add('hidden');
            state.editingHabitId = null;
        }

        async function confirmDelete() {
            const success = await deleteHabit(state.editingHabitId);
            if (success) {
                state.habits = state.habits.filter(h => h.id !== state.editingHabitId);
                closeDeleteModal();

                if ($('year-view').classList.contains('hidden')) {
                    renderDashboard();
                } else {
                    $('year-view').classList.add('hidden');
                    $('dashboard-view').classList.remove('hidden');
                    renderDashboard();
                }
            }
        }

        // ================================================
        // 8. STATISTICS
        // ================================================

        function openStatsView() {
            $('dashboard-view').classList.add('hidden');
            $('stats-view').classList.remove('hidden');
            renderStats();
        }

        function closeStatsView() {
            $('stats-view').classList.add('hidden');
            $('dashboard-view').classList.remove('hidden');
        }

        function renderStats() {
            renderOverviewStats();
            renderWeekComparison();
            renderMonthlyChart();
            renderHabitBreakdown();
        }

        function renderOverviewStats() {
            // Total completions
            const totalCompletions = state.habits.reduce((sum, h) => sum + Object.keys(h.completedDates).length, 0);
            $('stat-total-completions').textContent = totalCompletions;

            // This month completion rate
            const today = getToday();
            const daysThisMonth = today.getDate();
            const possibleCompletions = state.habits.length * daysThisMonth;

            let monthCompletions = 0;
            state.habits.forEach(h => {
                Object.keys(h.completedDates).forEach(d => {
                    const date = parseDate(d);
                    if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
                        monthCompletions++;
                    }
                });
            });

            const rate = possibleCompletions > 0 ? Math.round((monthCompletions / possibleCompletions) * 100) : 0;
            $('stat-completion-rate').textContent = rate + '%';

            // Best streak
            const bestStreak = Math.max(...state.habits.map(h => calculateStreak(h)), 0);
            $('stat-best-streak').textContent = bestStreak;

            // Active habits
            $('stat-active-habits').textContent = state.habits.length;
        }

        function renderWeekComparison() {
            const today = getToday();

            // This week
            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(today.getDate() - today.getDay());

            // Last week
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(thisWeekStart);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

            let thisWeekCount = 0;
            let lastWeekCount = 0;

            state.habits.forEach(h => {
                Object.keys(h.completedDates).forEach(d => {
                    const date = parseDate(d);
                    if (date >= thisWeekStart && date <= today) thisWeekCount++;
                    if (date >= lastWeekStart && date <= lastWeekEnd) lastWeekCount++;
                });
            });

            const maxCount = Math.max(thisWeekCount, lastWeekCount, 1);

            $('val-this-week').textContent = thisWeekCount;
            $('val-last-week').textContent = lastWeekCount;
            $('bar-this-week').style.width = (thisWeekCount / maxCount * 100) + '%';
            $('bar-last-week').style.width = (lastWeekCount / maxCount * 100) + '%';
        }

        function renderMonthlyChart() {
            const chart = $('monthly-chart');
            chart.innerHTML = '';

            const today = getToday();
            const year = today.getFullYear();
            const monthCounts = [];

            for (let month = 0; month < 12; month++) {
                let count = 0;
                state.habits.forEach(h => {
                    count += Object.keys(h.completedDates).filter(d => {
                        const compDate = parseDate(d);
                        return compDate.getMonth() === month && compDate.getFullYear() === year;
                    }).length;
                });

                monthCounts.push({
                    label: MONTHS[month],
                    count: count
                });
            }

            const maxCount = Math.max(...monthCounts.map(m => m.count), 1);

            monthCounts.forEach((m, index) => {
                const bar = document.createElement('div');
                bar.className = 'month-bar';
                bar.innerHTML = `
                    <span class="month-bar-value">${m.count}</span>
                    <div class="month-bar-fill" style="height: 0%"></div>
                    <span class="month-bar-label">${m.label}</span>
                `;
                chart.appendChild(bar);

                setTimeout(() => {
                    const fill = bar.querySelector('.month-bar-fill');
                    fill.style.height = (m.count / maxCount * 100) + '%';
                }, 100 + (index * 100));
            });
        }

        function renderHabitBreakdown() {
            const breakdown = $('habit-breakdown');
            breakdown.innerHTML = '';

            if (state.habits.length === 0) {
                breakdown.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No habits yet. Add some habits to see your breakdown!</p>';
                return;
            }

            const maxCompletions = Math.max(...state.habits.map(h => Object.keys(h.completedDates).length), 1);

            state.habits.forEach((h, index) => {
                const count = Object.keys(h.completedDates).length;
                const percent = (count / maxCompletions * 100);

                const row = document.createElement('div');
                row.className = 'habit-stat-row';
                row.innerHTML = `
                    <span class="habit-stat-name">${h.name}</span>
                    <div class="habit-stat-bar-container">
                        <div class="habit-stat-bar" style="width: 0%"></div>
                    </div>
                    <span class="habit-stat-value">${count}</span>
                `;
                breakdown.appendChild(row);

                setTimeout(() => {
                    const bar = row.querySelector('.habit-stat-bar');
                    bar.style.width = percent + '%';
                }, 100 + (index * 150));
            });
        }

        // ================================================
        // 9. DRAG AND DROP
        // ================================================

        function initDragAndDrop() {
            const container = $('habits-container');
            let draggedCard = null;

            container.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('habit-card')) {
                    draggedCard = e.target;
                    draggedCard.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                }
            });

            container.addEventListener('dragend', (e) => {
                if (draggedCard) {
                    draggedCard.classList.remove('dragging');
                    document.querySelectorAll('.habit-card').forEach(card => {
                        card.classList.remove('drag-over');
                    });
                    draggedCard = null;
                }
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                const card = e.target.closest('.habit-card');
                if (card && card !== draggedCard) {
                    card.classList.add('drag-over');
                }
            });

            container.addEventListener('dragleave', (e) => {
                const card = e.target.closest('.habit-card');
                if (card) {
                    card.classList.remove('drag-over');
                }
            });

            container.addEventListener('drop', async (e) => {
                e.preventDefault();
                const dropTarget = e.target.closest('.habit-card');

                if (dropTarget && draggedCard && dropTarget !== draggedCard) {
                    const cards = [...container.querySelectorAll('.habit-card')];
                    const draggedIndex = cards.indexOf(draggedCard);
                    const dropIndex = cards.indexOf(dropTarget);

                    if (draggedIndex < dropIndex) {
                        dropTarget.after(draggedCard);
                    } else {
                        dropTarget.before(draggedCard);
                    }

                    await saveHabitOrder();
                }

                document.querySelectorAll('.habit-card').forEach(card => {
                    card.classList.remove('drag-over');
                });
            });
        }

        async function saveHabitOrder() {
            const cards = document.querySelectorAll('.habit-card');
            const updates = [];

            cards.forEach((card, index) => {
                const habitId = card.dataset.habitId;
                const habit = getHabitById(habitId);
                if (habit) {
                    habit.displayOrder = index;
                    updates.push(
                        sb.from('habits')
                            .update({ display_order: index })
                            .eq('id', habitId)
                    );
                }
            });

            await Promise.all(updates);
            state.habits.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        }

        // ================================================
        // 10. EVENT LISTENERS
        // ================================================

        // Add habit modal
        $('add-habit-btn').onclick = openAddModal;
        $('cancel-habit-btn').onclick = closeAddModal;
        $('save-habit-btn').onclick = saveNewHabit;
        $('habit-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveNewHabit();
        });
        $('add-habit-modal').addEventListener('click', (e) => {
            if (e.target === $('add-habit-modal')) closeAddModal();
        });

        // Edit habit modal
        $('cancel-edit-btn').onclick = closeEditModal;
        $('save-edit-btn').onclick = saveEditedHabit;
        $('edit-habit-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveEditedHabit();
        });
        $('edit-habit-modal').addEventListener('click', (e) => {
            if (e.target === $('edit-habit-modal')) closeEditModal();
        });

        // Edit modal - counter toggle
        $('edit-enable-counter').addEventListener('change', (e) => {
            const counterOptions = $('edit-counter-options');
            if (e.target.checked) {
                counterOptions.classList.remove('hidden');
            } else {
                counterOptions.classList.add('hidden');
            }
        });

        // Delete habit modal
        $('cancel-delete-btn').onclick = closeDeleteModal;
        $('confirm-delete-btn').onclick = confirmDelete;
        $('delete-habit-modal').addEventListener('click', (e) => {
            if (e.target === $('delete-habit-modal')) closeDeleteModal();
        });

        // Year view
        $('back-btn').onclick = () => {
            $('year-view').classList.add('hidden');
            $('dashboard-view').classList.remove('hidden');
            renderDashboard();
        };
        $('prev-year-btn').onclick = () => {
            state.currentViewingYear--;
            renderYearView();
            updateYearNavigationButtons();
        };

        $('next-year-btn').onclick = () => {
            const currentYear = new Date().getFullYear();
            if (state.currentViewingYear < currentYear) {
                state.currentViewingYear++;
                renderYearView();
                updateYearNavigationButtons();
            }
        };

        // Helper function to update button states
        function updateYearNavigationButtons() {
            const currentYear = new Date().getFullYear();
            const nextBtn = $('next-year-btn');

            if (state.currentViewingYear >= currentYear) {
                nextBtn.style.opacity = '0.3';
                nextBtn.style.cursor = 'not-allowed';
            } else {
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            }
        }
        $('year-edit-btn').onclick = () => openEditModal(state.currentHabitId);
        $('year-delete-btn').onclick = () => openDeleteModal(state.currentHabitId);

        // Logout
        $('logout-btn').onclick = async () => {
            await sb.auth.signOut();
            window.location.href = 'login.html';
        };

        // Add modal - habit type toggle
        document.querySelectorAll('input[name="habit-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const counterOptions = $('counter-options');
                const goalOptions = document.querySelector('.goal-options');

                if (e.target.value === 'counter') {
                    counterOptions.classList.remove('hidden');
                    goalOptions.classList.add('hidden');
                } else {
                    counterOptions.classList.add('hidden');
                    goalOptions.classList.remove('hidden');
                }
            });
        });

        // Stats
        $('stats-btn').onclick = openStatsView;
        $('stats-back-btn').onclick = closeStatsView;

        // ================================================
        // 11. INITIALIZATION
        // ================================================

        loadHabits();
        initDragAndDrop();

    } // End of initApp

}); // End of DOMContentLoaded
