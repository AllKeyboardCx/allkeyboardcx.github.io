(function() {
    'use strict';

    if (window.matchMedia('(max-width: 991px)').matches || window.matchMedia('(hover: none)').matches) {
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'starfield-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    let width, height, stars = [], particles = [];
    let mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, active: false };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initStars();
    }

    function initStars() {
        stars = [];
        const count = Math.floor((width * height) / 6500);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                baseX: 0,
                baseY: 0,
                size: Math.random() * 1.6 + 0.3,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 0.03 + 0.005,
                hue: 200 + Math.random() * 60,
                opacity: Math.random() * 0.6 + 0.3
            });
            stars[i].baseX = stars[i].x;
            stars[i].baseY = stars[i].y;
        }
    }

    function spawnParticle(x, y) {
        if (particles.length > 60) particles.shift();
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            life: 1,
            size: Math.random() * 2 + 0.8,
            hue: 190 + Math.random() * 70
        });
    }

    function update() {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.x += s.vx;
            s.y += s.vy;
            s.twinkle += s.twinkleSpeed;

            if (s.x < 0) s.x = width;
            if (s.x > width) s.x = 0;
            if (s.y < 0) s.y = height;
            if (s.y > height) s.y = 0;

            if (mouse.active) {
                const dx = s.x - mouse.x;
                const dy = s.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const radius = 150;
                if (dist < radius && dist > 0.1) {
                    const force = (1 - dist / radius) * 1.2;
                    s.x += (dx / dist) * force;
                    s.y += (dy / dist) * force;
                }
            }

            s.baseX += (s.x - s.baseX) * 0.02;
            s.baseY += (s.y - s.baseY) * 0.02;
        }

        if (mouse.active) {
            const dx = mouse.x - mouse.prevX;
            const dy = mouse.y - mouse.prevY;
            const speed = Math.sqrt(dx * dx + dy * dy);
            if (speed > 2) {
                const num = Math.min(3, Math.floor(speed / 8) + 1);
                for (let i = 0; i < num; i++) {
                    spawnParticle(mouse.x + (Math.random() - 0.5) * 10, mouse.y + (Math.random() - 0.5) * 10);
                }
            }
            mouse.prevX = mouse.x;
            mouse.prevY = mouse.y;
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const tw = (Math.sin(s.twinkle) + 1) / 2;
            const alpha = s.opacity * (0.5 + tw * 0.5);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue}, 80%, 75%, ${alpha})`;
            ctx.fill();

            if (s.size > 1.1) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${s.hue}, 80%, 75%, ${alpha * 0.12})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 85%, 70%, ${p.life * 0.8})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 85%, 70%, ${p.life * 0.12})`;
            ctx.fill();
        }

        if (mouse.active) {
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                const dx = s.x - mouse.x;
                const dy = s.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const alpha = (1 - dist / 120) * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(mouse.x, mouse.y);
                    ctx.lineTo(s.x, s.y);
                    ctx.strokeStyle = `hsla(${s.hue}, 80%, 70%, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        update();
        draw();
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', function(e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        if (!mouse.active) {
            mouse.prevX = e.clientX;
            mouse.prevY = e.clientY;
        }
        mouse.active = true;
    });

    window.addEventListener('mouseleave', function() {
        mouse.active = false;
    });

    let visibilityChanged = false;
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            visibilityChanged = true;
        }
    });

    resize();
    animate();
})();
