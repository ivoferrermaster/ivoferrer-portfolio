/* components/staggeredmenu/StaggeredMenu.js */
class StaggeredMenu {
    constructor(wrapperSelector) {
        this.wrapper = document.querySelector(wrapperSelector);
        if (!this.wrapper) return;

        // Como el header está afuera, lo buscamos en el documento completo
        this.toggleBtn = document.querySelector('.sm-toggle');
        this.plusH = document.querySelector('#sm-plus-h');
        this.plusV = document.querySelector('#sm-plus-v');
        this.textInner = document.querySelector('.sm-toggle-textInner');
        
        this.panel = this.wrapper.querySelector('.staggered-menu-panel');
        this.preContainer = this.wrapper.querySelector('.sm-prelayers');
        this.preLayers = Array.from(this.wrapper.querySelectorAll('.sm-prelayer'));
        
        this.itemLabels = Array.from(this.wrapper.querySelectorAll('.sm-panel-itemLabel'));
        this.numberEls = Array.from(this.wrapper.querySelectorAll('.sm-panel-item'));
        this.socialTitle = this.wrapper.querySelector('.sm-socials-title');
        this.socialLinks = Array.from(this.wrapper.querySelectorAll('.sm-socials-link'));

        this.isOpen = false;
        this.isAnimating = false;
        this.textLines = ['Menu', 'Cerrar', 'Menu', 'Cerrar']; 

        this.init();
    }

    init() {
        gsap.set(this.preContainer, { opacity: 1 });
        gsap.set(this.preLayers, { xPercent: 100 }); 
        gsap.set(this.panel, { xPercent: 100 });     

        gsap.set(this.plusH, { transformOrigin: '50% 50%', rotate: 0 });
        gsap.set(this.plusV, { transformOrigin: '50% 50%', rotate: 90 });
        // Mantenemos el color en blanco siempre. El mix-blend-mode del CSS lo vuelve negro.
        gsap.set(this.toggleBtn, { color: '#ffffff' }); 
        
        this.bindEvents();
    }

    buildOpenTimeline() {
        const tl = gsap.timeline({ onComplete: () => { this.isAnimating = false; } });

        gsap.set(this.itemLabels, { yPercent: 140, rotate: 10 });
        gsap.set(this.numberEls, { '--sm-num-opacity': 0 });
        if (this.socialTitle) gsap.set(this.socialTitle, { opacity: 0 });
        if (this.socialLinks.length) gsap.set(this.socialLinks, { y: 25, opacity: 0 });

        this.preLayers.forEach((layer, i) => {
            tl.to(layer, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
        });

        const panelInsertTime = this.preLayers.length * 0.07 + 0.08;
        tl.to(this.panel, { xPercent: 0, duration: 0.65, ease: 'power4.out' }, panelInsertTime);

        const itemsStart = panelInsertTime + 0.1;
        if (this.itemLabels.length) {
            tl.to(this.itemLabels, { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: 0.1 }, itemsStart);
            tl.to(this.numberEls, { duration: 0.6, ease: 'power2.out', '--sm-num-opacity': 1, stagger: 0.08 }, itemsStart + 0.1);
        }

        const socialsStart = panelInsertTime + 0.3;
        if (this.socialTitle) tl.to(this.socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
        if (this.socialLinks.length) {
            tl.to(this.socialLinks, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.08, clearProps: 'opacity' }, socialsStart + 0.04);
        }

        return tl;
    }

    openMenu() {
        this.isAnimating = true;
        this.isOpen = true;
        
        // Bloqueo seguro del scroll
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        this.wrapper.style.pointerEvents = 'auto'; // Reactiva los clics en la capa del menú

        // Animaciones del botón
        gsap.to(this.toggleBtn, { borderColor: 'rgba(255,255,255,0.2)', delay: 0.18, duration: 0.3 });
        gsap.to(this.plusH, { rotate: 225, duration: 0.8, ease: 'power4.out' });
        gsap.to(this.plusV, { rotate: 315, duration: 0.8, ease: 'power4.out' }); 
        
        const finalShift = ((this.textLines.length - 1) / this.textLines.length) * 100;
        gsap.to(this.textInner, { yPercent: -finalShift, duration: 0.7, ease: 'power4.out' });

        this.buildOpenTimeline();
    }

    closeMenu() {
        this.isAnimating = true;
        this.isOpen = false;
        
        this.wrapper.style.pointerEvents = 'none'; // Desactiva clics para no tapar la web

        gsap.to(this.toggleBtn, { borderColor: 'rgba(255,255,255,0.2)', duration: 0.3 });
        gsap.to(this.plusH, { rotate: 0, duration: 0.35, ease: 'power3.inOut' });
        gsap.to(this.plusV, { rotate: 90, duration: 0.35, ease: 'power3.inOut' });
        gsap.to(this.textInner, { yPercent: 0, duration: 0.5, ease: 'power3.inOut' });

        const allLayers = [...this.preLayers, this.panel];
        gsap.to(allLayers, {
            xPercent: 100,
            duration: 0.4,
            ease: 'power3.in',
            onComplete: () => { 
                this.isAnimating = false; 
                // Devuelve el scroll de forma segura
                document.documentElement.style.overflow = '';
                document.body.style.overflow = '';
            }
        });
    }

    bindEvents() {
        this.toggleBtn.addEventListener('click', () => {
            if (this.isAnimating) return;
            this.isOpen ? this.closeMenu() : this.openMenu();
        });

        this.numberEls.forEach(link => {
            link.addEventListener('click', () => {
                if (this.isOpen && !this.isAnimating) this.closeMenu();
            });
        });
    }
}