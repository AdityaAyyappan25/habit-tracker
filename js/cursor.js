// Flame Lamp Cursor with Trail
(function () {
    const flame = document.querySelector('.cursor-flame');
    const glow = document.querySelector('.cursor-glow');

    if (!flame || !glow) return;

    let mouseX = 0, mouseY = 0;
    let flameX = 0, flameY = 0;
    let glowX = 0, glowY = 0;
    let lastTrailTime = 0;
    const trailDelay = 30; // ms between trail particles

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Create trail particles
        const now = Date.now();
        if (now - lastTrailTime > trailDelay) {
            createTrailParticle(mouseX, mouseY);
            lastTrailTime = now;
        }
    });

    // Smooth animation for flame and glow
    function animate() {
        // Flame follows quickly
        flameX += (mouseX - flameX) * 0.3;
        flameY += (mouseY - flameY) * 0.3;
        flame.style.left = flameX + 'px';
        flame.style.top = flameY + 'px';

        // Glow follows slower for smooth effect
        glowX += (mouseX - glowX) * 0.15;
        glowY += (mouseY - glowY) * 0.15;
        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';

        requestAnimationFrame(animate);
    }
    animate();

    // Create trail particle
    function createTrailParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'trail-particle';

        // Random size for variety
        const size = Math.random() * 6 + 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        // Slight random offset
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 10;
        particle.style.left = (x + offsetX) + 'px';
        particle.style.top = (y + offsetY) + 'px';

        document.body.appendChild(particle);

        // Remove after animation
        setTimeout(() => {
            particle.remove();
        }, 800);
    }

    // Hover effect on interactive elements
    document.addEventListener('mouseover', (e) => {
        if (e.target.matches('button, input, select, a, .day:not(.disabled), .habit-name, .stat-card, .action-btn, .view-btn, .add-btn, .modal-btn, .drag-handle')) {
            flame.classList.add('hover');
            glow.classList.add('hover');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.matches('button, input, select, a, .day:not(.disabled), .habit-name, .stat-card, .action-btn, .view-btn, .add-btn, .modal-btn, .drag-handle')) {
            flame.classList.remove('hover');
            glow.classList.remove('hover');
        }
    });

    // Click effect
    document.addEventListener('mousedown', () => {
        flame.classList.add('click');
        // Burst of particles on click
        for (let i = 0; i < 5; i++) {
            setTimeout(() => createTrailParticle(mouseX, mouseY), i * 20);
        }
    });

    document.addEventListener('mouseup', () => {
        flame.classList.remove('click');
    });

    // Hide when leaving window
    document.addEventListener('mouseleave', () => {
        flame.style.opacity = '0';
        glow.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
        flame.style.opacity = '1';
        glow.style.opacity = '1';
    });
})();