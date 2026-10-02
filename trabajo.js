/* trabajo.js — arranque de la vista /trabajo */
document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('main-menu');

    // Cada pieza se inicia por separado: si GSAP (CDN) no carga, el carrusel igual funciona.
    try {
        new StaggeredMenu('#main-menu');
    } catch (err) {
        console.warn('Menú no disponible:', err.message);
    }

    const carouselEl = document.getElementById('work-carousel');

    new WorkCarousel(carouselEl, window.PROYECTOS, {
        // Con el menú abierto, o una vista (listado/ficha) encima, las flechas no deben mover el carrusel
        isBlocked: () => !menu.inert || carouselEl.inert
    });

    new WorkViews({
        projects: window.PROYECTOS,
        carousel: carouselEl,
        host: document.getElementById('trabajo'),
        closeLink: document.querySelector('.work-close'),
        allLink: document.querySelector('.work-all a')
    });
});
