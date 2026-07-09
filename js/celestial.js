(function() {
    'use strict';

    const canvas = document.getElementById('celestial-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DEFAULT_LAT = 39.9042, DEFAULT_LNG = 116.4074;
    let W, H, dpr;
    let celestialData = null;

    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function dayOfYear(d) {
        const start = new Date(d.getFullYear(), 0, 0);
        return Math.floor((d - start) / 86400000);
    }

    function calcSun(date, lat) {
        const N = dayOfYear(date) + 1;
        const decl = -23.45 * Math.cos(2 * Math.PI / 365 * (N + 10));
        const latRad = lat * Math.PI / 180;
        const declRad = decl * Math.PI / 180;
        const cosH = -Math.tan(latRad) * Math.tan(declRad);
        const H = Math.acos(Math.max(-1, Math.min(1, cosH)));
        const Hhours = H * 180 / Math.PI / 15;
        return { sunrise: 12 - Hhours, sunset: 12 + Hhours };
    }

    function moonPhase(date) {
        const ref = Date.UTC(2000, 0, 6, 18, 14) / 1000;
        const synodic = 29.53058867 * 86400;
        const now = date.getTime() / 1000;
        let phase = ((now - ref) % synodic) / synodic;
        if (phase < 0) phase += 1;
        return phase;
    }

    function moonPhaseName(p) {
        if (p < 0.03 || p > 0.97) return '新月';
        if (p < 0.22) return '蛾眉月';
        if (p < 0.28) return '上弦月';
        if (p < 0.47) return '盈凸月';
        if (p < 0.53) return '满月';
        if (p < 0.72) return '亏凸月';
        if (p < 0.78) return '下弦月';
        return '残月';
    }

    function calcMoon(sunrise, sunset, phase) {
        const moonrise = (sunrise + phase * 24) % 24;
        const moonset = (moonrise + 12.4) % 24;
        return { moonrise, moonset };
    }

    function parseHour(iso) {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    }

    function getPosition() {
        return new Promise(resolve => {
            const cached = localStorage.getItem('celestial_pos');
            if (cached) {
                try { return resolve(JSON.parse(cached)); } catch (e) {}
            }
            if (!navigator.geolocation) return resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
            navigator.geolocation.getCurrentPosition(
                pos => {
                    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    localStorage.setItem('celestial_pos', JSON.stringify(p));
                    resolve(p);
                },
                () => resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG }),
                { timeout: 4000, maximumAge: 86400000 }
            );
        });
    }

    function fallbackData(now, lat) {
        const { sunrise, sunset } = calcSun(now, lat);
        const phase = moonPhase(now);
        const { moonrise, moonset } = calcMoon(sunrise, sunset, phase);
        return { sunrise, sunset, moonrise, moonset, phase, source: '天文公式估算' };
    }

    async function getCelestialData() {
        const now = new Date();
        const todayKey = now.toISOString().slice(0, 10);
        const cacheKey = 'celestial_v3_' + todayKey;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try { return JSON.parse(cached); } catch (e) {}
        }
        const pos = await getPosition();
        const fb = fallbackData(now, pos.lat);
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat.toFixed(3)}&longitude=${pos.lng.toFixed(3)}&daily=sunrise,sunset&timezone=auto`;
            const r = await fetch(url);
            if (!r.ok) throw new Error('api error');
            const data = await r.json();
            const d = data.daily;
            let sunrise = parseHour(d.sunrise[0]);
            let sunset = parseHour(d.sunset[0]);
            if (sunrise === null) sunrise = fb.sunrise;
            if (sunset === null) sunset = fb.sunset;
            const phase = fb.phase;
            const { moonrise, moonset } = calcMoon(sunrise, sunset, phase);
            const result = { sunrise, sunset, moonrise, moonset, phase, source: '日出日落·实时API' };
            localStorage.setItem(cacheKey, JSON.stringify(result));
            return result;
        } catch (e) {
            return fallbackData(now, pos.lat);
        }
    }

    function normalizeMoonTimes(moonrise, moonset, nowH) {
        if (moonset < moonrise && nowH < moonset) {
            return { rise: moonrise - 24, set: moonset };
        }
        return { rise: moonrise, set: moonset };
    }

    function bodyPos(rise, set, now, cx, cy, Rx, Ry) {
        let progress;
        if (set > rise) {
            if (now >= rise && now <= set) progress = (now - rise) / (set - rise);
            else return null;
        } else {
            if (now >= rise) progress = (now - rise) / (24 - rise + set);
            else if (now <= set) progress = (24 - rise + now) / (24 - rise + set);
            else return null;
        }
        const angle = Math.PI * (1 - progress);
        return { x: cx + Rx * Math.cos(angle), y: cy - Ry * Math.sin(angle), elev: Math.sin(angle), progress };
    }

    function smoothstep(a, b, x) {
        const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    }

    function lerpColor(c1, c2, t) {
        return [
            Math.round(c1[0] + (c2[0] - c1[0]) * t),
            Math.round(c1[1] + (c2[1] - c1[1]) * t),
            Math.round(c1[2] + (c2[2] - c1[2]) * t)
        ];
    }

    function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

    function skyColors(sunElev) {
        const nightTop = [8, 12, 28], nightBot = [22, 28, 48];
        const dawnTop = [90, 50, 90], dawnBot = [240, 130, 90];
        const dayTop = [60, 120, 200], dayBot = [150, 200, 235];
        const t = smoothstep(-0.12, 0.18, sunElev);
        const dawnMix = Math.max(0, 1 - Math.abs(sunElev) * 6);
        let top, bot;
        top = lerpColor(nightTop, dayTop, t);
        bot = lerpColor(nightBot, dayBot, t);
        top = lerpColor(top, dawnTop, dawnMix * 0.7);
        bot = lerpColor(bot, dawnBot, dawnMix * 0.8);
        return { top, bot };
    }

    function drawSky(sunElev) {
        const { top, bot } = skyColors(sunElev);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgb(top));
        g.addColorStop(1, rgb(bot));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    function drawStars(sunElev, time) {
        if (sunElev > 0.05) return;
        const alpha = Math.max(0, 1 - sunElev * 8);
        ctx.save();
        for (let i = 0; i < 80; i++) {
            const sx = (i * 137.5) % W;
            const sy = (i * 73.3) % (H * 0.7);
            const tw = (Math.sin(time / 1000 + i) + 1) / 2;
            ctx.globalAlpha = alpha * (0.3 + tw * 0.7);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawArc(cx, cy, Rx, Ry, color, glow, riseStr, setStr) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 9]);
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Rx, Ry, 0, Math.PI, 0, true);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(240,246,252,0.7)';
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(riseStr, cx - Rx, cy + 18);
        ctx.fillText(setStr, cx + Rx, cy + 18);
    }

    function drawSun(x, y, r) {
        ctx.save();
        const corona = ctx.createRadialGradient(x, y, r, x, y, r * 7);
        corona.addColorStop(0, 'rgba(255,200,80,0.3)');
        corona.addColorStop(0.5, 'rgba(255,160,60,0.12)');
        corona.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = corona;
        ctx.beginPath();
        ctx.arc(x, y, r * 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,210,100,0.55)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(255,200,80,0.7)';
        ctx.shadowBlur = 6;
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const inner = r * 1.4;
            const outer = i % 2 === 0 ? r * 3.2 : r * 2.2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
            ctx.lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
        halo.addColorStop(0, 'rgba(255,240,180,0.6)');
        halo.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, '#fff8e0');
        grad.addColorStop(0.4, '#ffd24d');
        grad.addColorStop(0.8, '#ff9d2e');
        grad.addColorStop(1, '#e85d2e');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,210,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawMoon(x, y, r, phase) {
        ctx.save();
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        glow.addColorStop(0, 'rgba(210,225,255,0.38)');
        glow.addColorStop(0.5, 'rgba(210,225,255,0.13)');
        glow.addColorStop(1, 'rgba(210,225,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
        ctx.fill();
        const moonGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.2);
        moonGrad.addColorStop(0, '#fdfcf0');
        moonGrad.addColorStop(0.6, '#e8e4d0');
        moonGrad.addColorStop(1, '#a8a48c');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(150,145,128,0.25)';
        const craters = [[-0.3, -0.1, 0.18], [0.25, 0.2, 0.14], [0.1, -0.35, 0.1], [-0.15, 0.35, 0.12]];
        craters.forEach(c => {
            ctx.beginPath();
            ctx.arc(x + c[0] * r, y + c[1] * r, c[2] * r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = 'rgba(18,22,40,0.94)';
        ctx.shadowColor = 'rgba(18,22,40,0.6)';
        ctx.shadowBlur = r * 0.25;
        const ang = 2 * Math.PI * phase;
        const cosT = Math.cos(ang);
        ctx.beginPath();
        if (phase < 0.5) {
            ctx.arc(x, y, r, 0.5 * Math.PI, 1.5 * Math.PI, false);
            ctx.ellipse(x, y, r * Math.abs(cosT), r, 0, 1.5 * Math.PI, 0.5 * Math.PI, cosT > 0);
        } else {
            ctx.arc(x, y, r, -0.5 * Math.PI, 0.5 * Math.PI, false);
            ctx.ellipse(x, y, r * Math.abs(cosT), r, 0, 0.5 * Math.PI, 1.5 * Math.PI, cosT > 0);
        }
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(240,238,220,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawMountains(cy) {
        const layers = [
            { color: 'rgba(20,28,45,0.5)', amp: 30, base: cy - 20, seed: 1 },
            { color: 'rgba(12,18,32,0.85)', amp: 22, base: cy - 5, seed: 2 },
            { color: 'rgba(6,10,20,1)', amp: 16, base: cy + 10, seed: 3 }
        ];
        layers.forEach(L => {
            ctx.fillStyle = L.color;
            ctx.beginPath();
            ctx.moveTo(0, H);
            ctx.lineTo(0, L.base);
            for (let x = 0; x <= W; x += 20) {
                const y = L.base - Math.abs(Math.sin(x * 0.008 + L.seed) + Math.sin(x * 0.02 + L.seed * 2) * 0.5) * L.amp;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fill();
        });
        ctx.strokeStyle = 'rgba(88,166,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(W, cy);
        ctx.stroke();
    }

    function drawLabels(cx, cy, Rx, Ry, sunData, moonData) {
        ctx.save();
        ctx.fillStyle = 'rgba(240,246,252,0.5)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('东', cx - Rx, cy + 34);
        ctx.fillText('南', cx, cy - Ry - 14);
        ctx.fillText('西', cx + Rx, cy + 34);
        if (sunData) {
            ctx.fillStyle = 'rgba(255,210,77,0.85)';
            ctx.fillText('日', sunData.x, sunData.y - 22);
        }
        if (moonData) {
            ctx.fillStyle = 'rgba(220,230,255,0.85)';
            ctx.fillText('月', moonData.x, moonData.y - 22);
        }
        ctx.restore();
    }

    function fmt(h) {
        if (h === null || h === undefined || isNaN(h)) return '--:--';
        let hh = Math.floor((h % 24 + 24) % 24);
        let mm = Math.floor(Math.abs(h - Math.floor(h)) * 60);
        return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    function render(time) {
        const now = new Date();
        const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
        const data = celestialData || fallbackData(now, DEFAULT_LAT);

        const cx = W / 2;
        const cy = H * 0.82;
        const Rx = W * 0.47;
        const Ry = H * 0.62;
        const mRx = Rx * 0.97;
        const mRy = Ry * 0.93;

        const sun = bodyPos(data.sunrise, data.sunset, nowH, cx, cy, Rx, Ry);
        const moonNorm = normalizeMoonTimes(data.moonrise, data.moonset, nowH);
        const moon = bodyPos(moonNorm.rise, moonNorm.set, nowH, cx, cy, mRx, mRy);
        const sunElev = sun ? sun.elev : -0.3;

        ctx.clearRect(0, 0, W, H);
        drawSky(sunElev);
        drawStars(sunElev, time);
        drawArc(cx, cy, Rx, Ry, 'rgba(255,210,77,0.55)', 'rgba(255,210,77,0.6)', fmt(data.sunrise), fmt(data.sunset));
        drawArc(cx, cy, mRx, mRy, 'rgba(220,230,255,0.45)', 'rgba(220,230,255,0.5)', fmt(data.moonrise), fmt(data.moonset));
        if (sun) drawSun(sun.x, sun.y, Math.max(16, Rx * 0.05));
        if (moon) drawMoon(moon.x, moon.y, Math.max(14, mRx * 0.045), data.phase);
        drawMountains(cy);
        drawLabels(cx, cy, Rx, Ry, sun, moon);

        const clockEl = document.getElementById('celestial-clock');
        const phaseEl = document.getElementById('celestial-phase');
        if (clockEl) clockEl.textContent = now.toTimeString().slice(0, 5);
        if (phaseEl) {
            phaseEl.textContent = `${moonPhaseName(data.phase)} · 日出 ${fmt(data.sunrise)} 日落 ${fmt(data.sunset)} · 月出 ${fmt(data.moonrise)} 月落 ${fmt(data.moonset)} · ${data.source}`;
        }
    }

    function loop(t) {
        render(t);
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => { resize(); });
    resize();
    requestAnimationFrame(loop);
    getCelestialData().then(data => { celestialData = data; });
})();
