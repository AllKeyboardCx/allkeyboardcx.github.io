// ===== 侧边栏交互控制 =====
(function() {
    'use strict';

    const pageWrapper = document.getElementById('page-wrapper');
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('open-sidebar-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');

    // 打开侧边栏
    function openSidebar() {
        if (pageWrapper && sidebar) {
            pageWrapper.classList.add('sidebar-open');
            sidebar.classList.add('open');
            // 可选：在打开时禁止body滚动（防止背景滚动）
            document.body.style.overflow = 'hidden';
        }
    }

    // 关闭侧边栏
    function closeSidebar() {
        if (pageWrapper && sidebar) {
            pageWrapper.classList.remove('sidebar-open');
            sidebar.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    // 点击打开按钮
    if (openBtn) {
        openBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openSidebar();
        });
    }

    // 点击关闭按钮
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeSidebar();
        });
    }

    // 点击侧边栏外部区域（即主内容区域）关闭侧边栏
    if (pageWrapper) {
        pageWrapper.addEventListener('click', function(e) {
            // 如果点击的是主内容区域（且侧边栏是打开状态）
            if (sidebar && sidebar.classList.contains('open')) {
                // 检查点击事件的目标是否在侧边栏内部
                if (!sidebar.contains(e.target)) {
                    closeSidebar();
                }
            }
        });
    }

    // 按 ESC 键关闭侧边栏
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // 窗口尺寸变化时，如果侧边栏是打开状态，确保显示正常
    window.addEventListener('resize', function() {
        // 如果宽度大于768px且侧边栏是打开状态，保持打开
        // 但不需要额外操作，因为CSS transition会自动适配
    });

})();
