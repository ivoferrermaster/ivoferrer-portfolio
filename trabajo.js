/* trabajo.js — arranque de la vista /trabajo */
document.addEventListener('DOMContentLoaded', () => {
    new SideMenu('#main-menu');
    new WorkCarousel(document.getElementById('work-carousel'), window.PROYECTOS);
    new WorkViews(window.PROYECTOS);
});
