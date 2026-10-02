/* trabajo.js — arranque de la vista /trabajo */
document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('main-menu');

    // Cada pieza se inicia por separado: si GSAP (CDN) no carga, el carrusel igual funciona.
    try {
        new StaggeredMenu('#main-menu');
    } catch (err) {
        console.warn('Menú no disponible:', err.message);
    }

    new WorkCarousel('#work-carousel', window.PROYECTOS, {
        // Con el menú abierto las flechas del teclado no deben mover el carrusel
        isBlocked: () => !menu.inert
    });
});
