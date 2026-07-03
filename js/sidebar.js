document.addEventListener('DOMContentLoaded', function() {
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
});
