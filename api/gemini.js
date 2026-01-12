export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    try {
        const { username, habits } = req.body;

        // Build prompt
        const timeOfDay = getTimeOfDay();
        const topHabit = habits?.length > 0 ? habits[0].name : null;
        const totalStreaks = habits?.reduce((sum, h) => sum + (h.streak || 0), 0) || 0;

        const prompt = `Generate a short welcome message (maximum 8 words, no emojis).

Username: @${username}
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

        if (!response.ok) {
            throw new Error('Gemini API error');
        }

        const data = await response.json();
        let message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        // Ensure not too long
        if (message && message.length > 60) {
            message = message.substring(0, 57) + '...';
        }

        return res.status(200).json({ message });

    } catch (error) {
        console.error('Gemini error:', error);
        return res.status(500).json({ error: 'Failed to generate message' });
    }
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}