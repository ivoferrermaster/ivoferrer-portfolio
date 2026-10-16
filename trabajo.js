/* trabajo.js — arranque de la vista /trabajo (el menú está en menu.js) */
document.addEventListener('DOMContentLoaded', () => {
    new WorkCarousel(document.getElementById('work-carousel'), window.PROYECTOS);
    new WorkViews(window.PROYECTOS);
});
