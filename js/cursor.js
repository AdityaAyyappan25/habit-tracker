// Custom Cursor
(function () {
    const cursorGlow = document.querySelector('.cursor-glow');
    const cursorDot = document.querySelector('.cursor-dot');

    if (!cursorGlow || !cursorDot) return;

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
    });

    function animateGlow() {
        glowX += (mouseX - glowX) * 0.15;
        glowY += (mouseY - glowY) * 0.15;
        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';
        requestAnimationFrame(animateGlow);
    }
    animateGlow();

    // Use event delegation for better performance
    document.addEventListener('mouseover', (e) => {
        if (e.target.matches('button, input, select, a, .day:not(.disabled), .habit-name, .stat-card, .action-btn, .view-btn, .add-btn, .modal-btn')) {
            cursorGlow.classList.add('hover');
            cursorDot.classList.add('hover');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.matches('button, input, select, a, .day:not(.disabled), .habit-name, .stat-card, .action-btn, .view-btn, .add-btn, .modal-btn')) {
            cursorGlow.classList.remove('hover');
            cursorDot.classList.remove('hover');
        }
    });

    document.addEventListener('mousedown', () => {
        cursorGlow.classList.add('click');
        cursorDot.classList.add('click');
    });

    document.addEventListener('mouseup', () => {
        cursorGlow.classList.remove('click');
        cursorDot.classList.remove('click');
    });

    document.addEventListener('mouseleave', () => {
        cursorGlow.style.opacity = '0';
        cursorDot.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
        cursorGlow.style.opacity = '1';
        cursorDot.style.opacity = '1';
    });
})();