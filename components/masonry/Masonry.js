/* components/masonry/Masonry.js */
class Masonry {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.options = {
            duration: 0.8,
            stagger: 0.05,
            animateFrom: 'bottom', // 'bottom', 'top', 'random'
            hoverScale: 1.15,
            blurToFocus: true,
            ...options
        };

        this.items = Array.from(this.container.querySelectorAll('.masonry-item'));
        this.init();
    }

    init() {
        this.updateColumns();
        window.addEventListener('resize', () => this.updateColumns());
        this.bindEvents();
        this.animateIn();
    }

    // Actualiza un atributo en el contenedor para que CSS sepa cuántas columnas hay y aplique el sube/baja
    updateColumns() {
        const width = window.innerWidth;
        let cols = 3; // Por defecto en tu diseño anterior
        if (width >= 1000) cols = 4; // Amplía a 4 en pantallas más grandes si lo deseas
        if (width < 600) cols = 2; // Reduce en móviles
        
        this.container.setAttribute('data-cols', cols);
    }

    animateIn() {
        // Configuramos la posición inicial basada en la dirección elegida
        const startY = this.options.animateFrom === 'bottom' ? 100 : (this.options.animateFrom === 'top' ? -100 : 0);
        
        gsap.set(this.items, {
            y: startY,
            opacity: 0,
            filter: this.options.blurToFocus ? 'blur(10px)' : 'none'
        });

        // Revelación en cascada usando ScrollTrigger o IntersectionObserver. 
        // Aquí usamos un Observer básico de JS puro para disparar la animación de GSAP.
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                gsap.to(this.items, {
                    y: 0, // Regresan a su posición natural dictada por CSS (donde aplica el offset de translateY)
                    opacity: 1,
                    filter: 'blur(0px)',
                    duration: this.options.duration,
                    ease: 'power3.out',
                    stagger: this.options.stagger,
                    clearProps: "y" // Limpiamos 'y' para que el translateY nativo del CSS Grid retome el control
                });
                observer.disconnect();
            }
        }, { threshold: 0.1 });

        observer.observe(this.container);
    }

    bindEvents() {
        this.items.forEach(item => {
            const bg = item.querySelector('.masonry-item__bg');
            
            item.addEventListener('mouseenter', () => {
                if (bg) {
                    gsap.to(bg, {
                        scale: this.options.hoverScale,
                        duration: 0.4,
                        ease: 'power2.out'
                    });
                }
            });

            item.addEventListener('mouseleave', () => {
                if (bg) {
                    gsap.to(bg, {
                        scale: 1,
                        duration: 0.4,
                        ease: 'power2.out'
                    });
                }
            });
        });
    }
}