/* trabajo.js — arranque de la vista /trabajo */
document.addEventListener('DOMContentLoaded', () => {
    // El menú necesita GSAP (CDN): si no cargó, se saltea y el resto de la página igual funciona
    if (window.gsap) new StaggeredMenu('#main-menu');

    new WorkCarousel(document.getElementById('work-carousel'), window.PROYECTOS);
    new WorkViews(window.PROYECTOS);
});
