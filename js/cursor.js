// Spark Cursor with Trail
(function () {
    const spark = document.querySelector('.cursor-spark');
    const glow = document.querySelector('.cursor-glow');

    if (!spark || !glow) return;

    let mouseX = 0, mouseY = 0;
    let sparkX = 0, sparkY = 0;
    let lastTrailTime = 0;
    const trailDelay = 50;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Create trail
        const now = Date.now();
        if (now - lastTrailTime > trailDelay) {
            createTrail(mouseX, mouseY);
            lastTrailTime = now;
        }
    });

    function animate() {
        // Smooth follow
        sparkX += (mouseX - sparkX) * 0.2;
        sparkY += (mouseY - sparkY) * 0.2;

        spark.style.left = sparkX + 'px';
        spark.style.top = sparkY + 'px';
        glow.style.left = sparkX + 'px';
        glow.style.top = sparkY + 'px';

        requestAnimationFrame(animate);
    }
    animate();

    function createTrail(x, y) {
        const particle = document.createElement('div');
        particle.className = 'trail-particle';

        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        document.body.appendChild(particle);

        setTimeout(() => particle.remove(), 600);
    }

    // Hover
    document.addEventListener('mouseover', (e) => {
        if (e.target.matches('button, input, select, a, .day:not(.disabled), .habit-name, .stat-card, .action-btn, .view-btn, .add-btn, .modal-btn, .drag-handle')) {
            spark.classList.add('hover');
            glow.classList.add('hover');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.matches('button, input, select, a, .day:not(.disabled), .habit-name, .stat-card, .action-btn, .view-btn, .add-btn, .modal-btn, .drag-handle')) {
            spark.classList.remove('hover');
            glow.classList.remove('hover');
        }
    });

    // Click
    document.addEventListener('mousedown', () => {
        spark.classList.add('click');
        glow.classList.add('click');
        for (let i = 0; i < 4; i++) {
            setTimeout(() => createTrail(mouseX, mouseY), i * 30);
        }
    });

    document.addEventListener('mouseup', () => {
        spark.classList.remove('click');
        glow.classList.remove('click');
    });

    // Hide when leaving
    document.addEventListener('mouseleave', () => {
        spark.style.opacity = '0';
        glow.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
        spark.style.opacity = '1';
        glow.style.opacity = '1';
    });
})();