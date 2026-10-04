/* components/smoothscroll/SmoothScroll.js
   Scroll suave con inercia sobre el scroll real del navegador (usa la librería Lenis, que se
   carga desde CDN en index.html) y parallax para los elementos .parallax según su data-speed.

   - Con "movimiento reducido" Lenis no aplica inercia y el parallax queda apagado.
   - Mientras <html> tiene overflow: hidden (preloader, menú abierto) la rueda no mueve la página. */
class SmoothScroll {
    constructor() {
        this.lenis = new Lenis({
            autoRaf: true,
            lerp: 0.08, // cuánto se acerca el scroll a su destino en cada frame (8%)
            // Con la página bloqueada, Lenis deja pasar la rueda sin tocarla (y como <html> no
            // scrollea, no se mueve nada). No se usa lenis.stop(): frenar y reactivar Lenis
            // corta cualquier scroll animado en curso, como el de un enlace del menú.
            virtualScroll: () => getComputedStyle(document.documentElement).overflow !== 'hidden'
        });

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.parallaxElements = document.querySelectorAll('.parallax');
        if (!reduceMotion) {
            this.lenis.on('scroll', () => this.updateParallax());
            this.updateParallax();
        }
    }

    // Cada elemento se corre en vertical una fracción (data-speed) de lo scrolleado
    updateParallax() {
        this.parallaxElements.forEach(el => {
            el.style.transform = `translate3d(0, ${this.lenis.scroll * parseFloat(el.dataset.speed)}px, 0)`;
        });
    }

    // Lleva el scroll hasta un elemento o una posición en px (immediate: de golpe, sin animación)
    scrollTo(target, immediate = false) {
        this.lenis.scrollTo(target, { immediate });
    }

    // Posición (en px) a la que se dirige el scroll; si no se está animando, es la actual
    get destination() {
        return this.lenis.targetScroll;
    }
}
