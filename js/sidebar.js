(function() {
    'use strict';

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const openBtn = document.getElementById('open-sidebar-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');

    function openSidebar() {
        if (sidebar && mainContent) {
            sidebar.classList.add('open');
            mainContent.classList.add('sidebar-open');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeSidebar() {
        if (sidebar && mainContent) {
            sidebar.classList.remove('open');
            mainContent.classList.remove('sidebar-open');
            document.body.style.overflow = '';
        }
    }

    if (openBtn) {
        openBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openSidebar();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeSidebar();
        });
    }

    if (mainContent) {
        mainContent.addEventListener('click', function(e) {
            if (sidebar && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target)) {
                    closeSidebar();
                }
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

})();
