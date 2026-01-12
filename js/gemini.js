// Gemini AI - Frontend (calls serverless function)

async function generateWelcomeMessage(username, habits) {
    try {
        // Prepare habit data
        const habitData = habits.map(h => ({
            name: h.name,
            streak: calculateStreakForGemini(h)
        }));

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, habits: habitData })
        });

        if (!response.ok) throw new Error('API error');

        const data = await response.json();
        return data.message || getFallbackMessage(username);

    } catch (error) {
        console.error('Gemini error:', error);
        return getFallbackMessage(username);
    }
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

function getFallbackMessage(username) {
    const timeOfDay = getTimeOfDay();
    const fallbacks = {
        morning: `Good morning, @${username}. Rise and shine.`,
        afternoon: `Good afternoon, @${username}. Keep going.`,
        evening: `Good evening, @${username}. Finish strong.`,
        night: `Good night, @${username}. Rest well.`
    };
    return fallbacks[timeOfDay];
}

function calculateStreakForGemini(habit) {
    const dates = Object.keys(habit.completedDates).sort().reverse();
    if (dates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
        const [y, m, d] = dates[i].split('-').map(Number);
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);

        const habitDate = new Date(y, m - 1, d);

        if (habitDate.getTime() === checkDate.getTime()) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}