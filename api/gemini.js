export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not found');
        return res.status(500).json({ error: 'API key not configured' });
    }

    // Use gemini-1.5-flash (stable model)
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';
    try {
        const { username, habits } = req.body || {};

        const timeOfDay = getTimeOfDay();
        const topHabit = habits?.length > 0 ? habits[0].name : null;
        const totalStreaks = habits?.reduce((sum, h) => sum + (h.streak || 0), 0) || 0;

        const prompt = `Generate a short welcome message (maximum 8 words, no emojis).

Username: @${username || 'user'}
Time: ${timeOfDay}
${topHabit ? `Top habit: ${topHabit}` : 'No habits yet'}
${totalStreaks > 0 ? `Active streak: ${totalStreaks} days` : ''}

Examples:
- "Good morning, @alex! Keep the streak alive."
- "Welcome back, @sam. Time to shine."
- "Evening, @joe. Finish strong today."

Generate only the message. Maximum 8 words.`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 30,
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API error:', JSON.stringify(data));
            // Return fallback message instead of error
            return res.status(200).json({ message: null });
        }

        let message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (message && message.length > 60) {
            message = message.substring(0, 57) + '...';
        }

        return res.status(200).json({ message: message || 'Welcome back!' });

    } catch (error) {
        console.error('Server error:', error.message);
        return res.status(500).json({ error: 'Server error' });
    }
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}