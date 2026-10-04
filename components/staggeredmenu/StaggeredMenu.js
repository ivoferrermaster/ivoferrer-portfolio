/* components/staggeredmenu/StaggeredMenu.js
   Menú lateral: al abrir entran las capas de color, después el panel y por último los enlaces
   escalonados. El botón alterna Menu/Cerrar y su "+" gira hasta formar una "×". Requiere GSAP 3.

   Marcado necesario: header con .sm-toggle (que contiene .sm-toggle-textInner, #sm-plus-h y
   #sm-plus-v) y el wrapper del menú con .sm-prelayer, .staggered-menu-panel, .sm-panel-item
   (con su .sm-panel-itemLabel), .sm-socials-title y .sm-socials-link. Ver index.html. */
class StaggeredMenu {
    constructor(wrapperSelector) {
        this.wrapper = document.querySelector(wrapperSelector);

        // El botón está en el header, afuera del wrapper
        this.toggleBtn = document.querySelector('.sm-toggle');
        this.plusH = document.querySelector('#sm-plus-h');
        this.plusV = document.querySelector('#sm-plus-v');
        this.textInner = document.querySelector('.sm-toggle-textInner');

        this.panel = this.wrapper.querySelector('.staggered-menu-panel');
        this.preContainer = this.wrapper.querySelector('.sm-prelayers');
        this.preLayers = Array.from(this.wrapper.querySelectorAll('.sm-prelayer'));
        this.links = Array.from(this.wrapper.querySelectorAll('.sm-panel-item'));
        this.labels = Array.from(this.wrapper.querySelectorAll('.sm-panel-itemLabel'));
        this.socialTitle = this.wrapper.querySelector('.sm-socials-title');
        this.socialLinks = Array.from(this.wrapper.querySelectorAll('.sm-socials-link'));
        // Elementos enfocables del panel (para mover y atrapar el foco)
        this.focusables = Array.from(this.panel.querySelectorAll('a[href], button'));

        this.isOpen = false;
        this.isAnimating = false;
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Estado inicial: capas y panel fuera de pantalla, a la derecha; el "+" con su línea vertical
        gsap.set(this.preContainer, { opacity: 1 });
        gsap.set(this.preLayers, { xPercent: 100 });
        gsap.set(this.panel, { xPercent: 100, visibility: 'visible' });
        gsap.set(this.plusV, { rotate: 90 });

        this.bindEvents();
    }

    openMenu() {
        this.isAnimating = true;
        this.isOpen = true;

        // Bloquea el scroll de la página mientras el menú está abierto
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        this.wrapper.style.pointerEvents = 'auto';
        this.wrapper.inert = false; // los enlaces del panel vuelven a ser enfocables
        this.toggleBtn.setAttribute('aria-expanded', 'true');

        // Botón: el "+" gira hasta "×" y el texto sube hasta la última línea ("Cerrar")
        gsap.to(this.plusH, { rotate: 225, duration: 0.8, ease: 'power4.out' });
        gsap.to(this.plusV, { rotate: 315, duration: 0.8, ease: 'power4.out' });
        gsap.to(this.textInner, { yPercent: -75, duration: 0.7, ease: 'power4.out' });

        // Punto de partida de los elementos que entran
        gsap.set(this.labels, { yPercent: 140, rotate: 10 });
        gsap.set(this.links, { '--sm-num-opacity': 0 });
        gsap.set(this.socialTitle, { opacity: 0 });
        gsap.set(this.socialLinks, { y: 25, opacity: 0 });

        const tl = gsap.timeline({
            onComplete: () => {
                this.isAnimating = false;
                // Al terminar de abrir, el foco pasa al primer enlace del menú
                if (this.isOpen) this.focusables[0].focus({ preventScroll: true });
            }
        });

        // Capas de color, una tras otra; después el panel, los enlaces y las redes
        this.preLayers.forEach((layer, i) => {
            tl.to(layer, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
        });
        const panelStart = this.preLayers.length * 0.07 + 0.08;
        tl.to(this.panel, { xPercent: 0, duration: 0.65, ease: 'power4.out' }, panelStart);
        tl.to(this.labels, { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: 0.1 }, panelStart + 0.1);
        tl.to(this.links, { '--sm-num-opacity': 1, duration: 0.6, ease: 'power2.out', stagger: 0.08 }, panelStart + 0.2);
        tl.to(this.socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, panelStart + 0.3);
        tl.to(this.socialLinks, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.08, clearProps: 'opacity' }, panelStart + 0.34);

        // Con movimiento reducido se salta directo al final
        if (this.reduceMotion) tl.progress(1);
    }

    closeMenu(returnFocus = false) {
        this.isAnimating = true;
        this.isOpen = false;

        // Cerrado, el panel queda fuera de pantalla: se lo saca del orden de tabulación
        this.wrapper.inert = true;
        this.wrapper.style.pointerEvents = 'none';
        this.toggleBtn.setAttribute('aria-expanded', 'false');
        if (returnFocus) this.toggleBtn.focus({ preventScroll: true });

        gsap.to(this.plusH, { rotate: 0, duration: 0.35, ease: 'power3.inOut' });
        gsap.to(this.plusV, { rotate: 90, duration: 0.35, ease: 'power3.inOut' });
        gsap.to(this.textInner, { yPercent: 0, duration: 0.5, ease: 'power3.inOut' });

        gsap.to([...this.preLayers, this.panel], {
            xPercent: 100,
            duration: this.reduceMotion ? 0 : 0.4,
            ease: 'power3.in',
            onComplete: () => {
                this.isAnimating = false;
                document.documentElement.style.overflow = '';
                document.body.style.overflow = '';
            }
        });
    }

    bindEvents() {
        this.toggleBtn.addEventListener('click', () => {
            if (this.isAnimating) return;
            if (this.isOpen) this.closeMenu();
            else this.openMenu();
        });

        // Al elegir un enlace, el menú se cierra
        this.links.forEach((link) => {
            link.addEventListener('click', () => {
                if (this.isOpen && !this.isAnimating) this.closeMenu();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            // Escape cierra y devuelve el foco al botón
            if (e.key === 'Escape') {
                this.closeMenu(true);
                return;
            }

            // Con el menú abierto, Tab da vueltas entre el botón y los enlaces del panel
            if (e.key === 'Tab') {
                const cycle = [this.toggleBtn, ...this.focusables];
                const index = cycle.indexOf(document.activeElement);
                const next = e.shiftKey
                    ? (index <= 0 ? cycle.length - 1 : index - 1)
                    : (index === -1 || index === cycle.length - 1 ? 0 : index + 1);
                e.preventDefault();
                cycle[next].focus({ preventScroll: true });
            }
        });
    }
}
