/* components/masonry/Masonry.js */
class Masonry {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.options = {
            duration: 0.8,
            stagger: 0.05,
            animateFrom: 'bottom', // 'bottom', 'top', 'random'
            blurToFocus: true,
            ...options
        };

        this.items = Array.from(this.container.querySelectorAll('.masonry-item'));
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
    }

    // Las columnas (4 / 3 / 2), el efecto sube y baja y el hover de la
    // cubierta se resuelven en masonry.css
    init() {
        if (this.reduceMotion || typeof gsap === 'undefined') {
            this.items.forEach(item => {
                item.style.opacity = 1;
                item.style.filter = 'none';
            });
            return;
        }
        this.animateIn();
    }

    animateIn() {
        // Configuramos la posición inicial basada en la dirección elegida
        const startY = this.options.animateFrom === 'bottom' ? 100 : (this.options.animateFrom === 'top' ? -100 : 0);

        gsap.set(this.items, {
            y: startY,
            opacity: 0,
            filter: this.options.blurToFocus ? 'blur(10px)' : 'none'
        });

        // Un Observer básico de JS puro dispara la animación de GSAP.
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
}
