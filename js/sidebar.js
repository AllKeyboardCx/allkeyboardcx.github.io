document.addEventListener('DOMContentLoaded', function() {
    applyTimeBasedTheme();

    function applyTimeBasedTheme() {
        try {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const totalMinutes = hour * 60 + minute;

            let theme = 'theme-night';

            if (totalMinutes >= 300 && totalMinutes < 540) {
                theme = 'theme-dawn';
            } else if (totalMinutes >= 540 && totalMinutes < 720) {
                theme = 'theme-morning';
            } else if (totalMinutes >= 720 && totalMinutes < 840) {
                theme = 'theme-noon';
            } else if (totalMinutes >= 840 && totalMinutes < 1020) {
                theme = 'theme-afternoon';
            } else if (totalMinutes >= 1020 && totalMinutes < 1200) {
                theme = 'theme-dusk';
            }

            document.body.classList.add(theme);
        } catch (error) {
            document.body.classList.add('theme-night');
        }
    }

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const openBtn = document.getElementById('open-sidebar-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');

    function openSidebar() {
        sidebar.classList.add('open');
        mainContent.classList.add('sidebar-open');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        mainContent.classList.remove('sidebar-open');
        document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        openSidebar();
    });

    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeSidebar();
    });

    mainContent.addEventListener('click', function(e) {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // 回到顶部按钮
    const backToTopBtn = document.createElement('button');
    backToTopBtn.id = 'back-to-top';
    backToTopBtn.innerHTML = '⬆';
    backToTopBtn.setAttribute('aria-label', '回到顶部');
    backToTopBtn.title = '回到顶部';
    document.body.appendChild(backToTopBtn);

    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    // 点击爆炸特效（仅电脑端）
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const hasHover = window.matchMedia('(hover: hover)').matches;
    if (isFinePointer && hasHover) {
        const emojis = ['🎉', '🎊', '✨', '💥', '💫', '⭐', '🌟', '🔥', '💖', '💝', '🥳', '😎', '🤩', '😋', '🚀', '💎', '🌈', '🎈', '🎁', '⚡'];

        document.addEventListener('click', function(e) {
            // 忽略表单元素、按钮、链接的点击（避免影响交互）
            const target = e.target;
            if (target.closest('input, textarea, select, button, a, form, .reply-form, #back-to-top, #sidebar, #live2d-widget, #live2d-shrink-btn, #live2d-expand-btn')) {
                return;
            }

            const x = e.clientX;
            const y = e.clientY;

            // 烟花粒子
            const particleCount = 16;
            const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff', '#ff8e3c', '#c780fa', '#ff5ebc'];
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'click-particle';
                const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
                const distance = 60 + Math.random() * 60;
                const dx = Math.cos(angle) * distance;
                const dy = Math.sin(angle) * distance;
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.setProperty('--dx', dx + 'px');
                particle.style.setProperty('--dy', dy + 'px');
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 800);
            }

            // 随机表情
            const emojiCount = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < emojiCount; i++) {
                const emoji = document.createElement('div');
                emoji.className = 'click-emoji';
                emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                emoji.style.left = (x + (Math.random() - 0.5) * 40) + 'px';
                emoji.style.top = y + 'px';
                const drift = (Math.random() - 0.5) * 80;
                emoji.style.setProperty('--drift', drift + 'px');
                const scale = 1.5 + Math.random() * 1.5;
                emoji.style.setProperty('--scale', scale);
                document.body.appendChild(emoji);
                setTimeout(() => emoji.remove(), 1500);
            }
        });
    }
});
