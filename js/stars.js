(function() {
    'use strict';

    if (window.matchMedia('(max-width: 991px)').matches || window.matchMedia('(hover: none)').matches) {
        return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'starfield-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    let width, height, stars = [], particles = [];
    let mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, active: false };
    let lightTheme = false;

    // 预渲染星星贴图：每帧只做 drawImage，不再逐颗 arc()/fill()，也不再拼 hsla 字符串
    const HUE_STEPS = 12;
    const spritesDark = [];
    const spritesLight = [];

    function makeSprite(hue, sat, light) {
        const size = 64;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grd.addColorStop(0, 'hsla(' + hue + ',' + sat + '%,' + light + '%,1)');
        grd.addColorStop(0.28, 'hsla(' + hue + ',' + sat + '%,' + light + '%,0.62)');
        grd.addColorStop(0.55, 'hsla(' + hue + ',' + sat + '%,' + light + '%,0.18)');
        grd.addColorStop(1, 'hsla(' + hue + ',' + sat + '%,' + light + '%,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, size, size);
        return c;
    }

    function buildSprites() {
        spritesDark.length = 0;
        spritesLight.length = 0;
        for (let i = 0; i < HUE_STEPS; i++) {
            const hue = Math.round(200 + (i * 60) / (HUE_STEPS - 1));
            spritesDark.push(makeSprite(hue, 80, 78));
            spritesLight.push(makeSprite(hue, 45, 52));
        }
    }

    function checkTheme() {
        const newLight = /theme-(dawn|morning|noon|afternoon)/.test(document.body.className);
        if (newLight !== lightTheme) {
            lightTheme = newLight;
            ctx.globalCompositeOperation = lightTheme ? 'source-over' : 'lighter';
        }
    }

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initStars();
    }

    function initStars() {
        stars = [];
        const count = Math.floor((width * height) / 6500);
        for (let i = 0; i < count; i++) {
            const s = {
                x: Math.random() * width,
                y: Math.random() * height,
                baseX: 0,
                baseY: 0,
                size: Math.random() * 2.0 + 0.9,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 0.03 + 0.005,
                hue: Math.floor(Math.random() * HUE_STEPS),
                opacity: Math.random() * 0.4 + 0.55
            };
            s.baseX = s.x;
            s.baseY = s.y;
            stars.push(s);
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
            hue: Math.floor(Math.random() * HUE_STEPS)
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
        checkTheme();
        ctx.clearRect(0, 0, width, height);

        const dim = lightTheme;
        const starAlphaScale = dim ? 0.15 : 1;
        const step = dim ? 2 : 1;
        const sprites = dim ? spritesLight : spritesDark;

        for (let i = 0; i < stars.length; i += step) {
            const s = stars[i];
            if (dim && s.size < 1.3) continue;
            const tw = (Math.sin(s.twinkle) + 1) / 2;
            const alpha = s.opacity * (0.5 + tw * 0.5) * starAlphaScale;
            if (alpha < 0.03) continue;
            const r = s.size * (dim ? 1.8 : 2.6);
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprites[s.hue], s.x - r, s.y - r, r * 2, r * 2);
        }

        const pAlphaScale = dim ? 0.6 : 1;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const r = p.size * 2.4;
            ctx.globalAlpha = p.life * 0.8 * pAlphaScale;
            ctx.drawImage(sprites[p.hue], p.x - r, p.y - r, r * 2, r * 2);
        }

        if (mouse.active) {
            const lineAlphaScale = dim ? 0.4 : 1;
            ctx.globalAlpha = 1;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            let drew = false;
            for (let i = 0; i < stars.length; i += step) {
                const s = stars[i];
                const dx = s.x - mouse.x;
                const dy = s.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const a = (1 - dist / 120) * 0.25 * lineAlphaScale;
                    if (a < 0.02) continue;
                    ctx.moveTo(mouse.x, mouse.y);
                    ctx.lineTo(s.x, s.y);
                    drew = true;
                }
            }
            if (drew) {
                ctx.strokeStyle = dim ? 'hsla(215,45%,52%,0.18)' : 'hsla(215,70%,78%,0.22)';
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
    }

    let rafId = null;
    let frameToggle = false;

    // 每两帧画一次：60Hz 屏上正好 30fps，间隔均等（用时间差判断会抖成 33/50ms 交替）
    function animate() {
        rafId = requestAnimationFrame(animate);
        frameToggle = !frameToggle;
        if (frameToggle) return;
        update();
        draw();
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

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        } else if (!rafId) {
            rafId = requestAnimationFrame(animate);
        }
    });

    buildSprites();
    checkTheme();
    resize();
    rafId = requestAnimationFrame(animate);
})();
