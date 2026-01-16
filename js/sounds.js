// ================================================
// SOUND EFFECTS
// ================================================

// Sound file paths
const SOUNDS = {
    click: 'assets/sounds/click.mp3',
    ticker: 'assets/sounds/ticker.mp3',
    complete: 'assets/sounds/complete.mp3',
    reset: 'assets/sounds/reset.mp3'
};

// Play sound for day circle toggle
function playSound() {
    const sound = new Audio(SOUNDS.click);
    sound.volume = 0.5;
    sound.play().catch(() => { });
}

// Play sound for counter increment
function playTickerSound() {
    const sound = new Audio(SOUNDS.ticker);
    sound.volume = 0.6;
    sound.play().catch(() => { });
}

// Play sound when counter target reached
function playCompleteSound() {
    const sound = new Audio(SOUNDS.complete);
    sound.volume = 0.7;
    sound.play().catch(() => { });
}

// Play sound for counter reset
function playResetSound() {
    const sound = new Audio(SOUNDS.reset);
    sound.volume = 0.5;
    sound.play().catch(() => { });
}