/* components/logo-wall/LogoWall.js */
class LogoWall {
    constructor(selector, options = {}) {
        this.root = document.querySelector(selector);
        if (!this.root) return;

        this.chips = Array.from(this.root.querySelectorAll('.logo-wall__chip'));
        if (!this.chips.length) return;

        this.radius = options.radius || 260;

        // El índice alimenta un transition-delay en CSS (calc(var(--i) * 40ms))
        // para escalonar la entrada.
        this.chips.forEach((chip, i) => chip.style.setProperty('--i', i));
        this.observeEntrance();

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isTouch = window.matchMedia('(hover: none)').matches;

        if (reducedMotion || isTouch) {
            this.root.classList.add('is-static');
            return;
        }

        this.pointer = { x: -9999, y: -9999 };
        // Lerp manual por chip (mismo patrón que el cursor custom en script.js),
        // en vez de gsap.quickTo: llamar varios quickTo por frame sobre las mismas
        // propiedades de transform del mismo elemento dispara un RangeError
        // ("Maximum call stack size exceeded") dentro de GSAP al resolver el tween.
        this.state = this.chips.map(() => ({ reveal: 0, rotX: 0, rotY: 0, scale: 1 }));

        // Centros de cada chip relativos a la sección. Se miden una vez (y al
        // redimensionar) en vez de llamar getBoundingClientRect() 16 veces por
        // frame: la rotación/escala se aplica sobre el centro, así que el
        // centro no cambia aunque la chip esté transformada.
        this.centers = [];
        this.rafId = null;
        this.tick = () => this.loop();

        this.bindEvents();
    }

    observeEntrance() {
        // Observer propio en vez del IntersectionObserver global de script.js:
        // esta página no usa scroll nativo (hay un #scroll-wrapper con
        // position:fixed + transform simulándolo), y en ese esquema el
        // observer global podía no disparar para alguna chip puntual,
        // dejándola invisible para siempre. Un timeout de respaldo asegura
        // que nunca quede una tarjeta oculta si el observer no llega a notar
        // la intersección por algún motivo.
        const reveal = (chip) => chip.classList.add('is-visible');

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    reveal(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.01 });

        this.chips.forEach(chip => observer.observe(chip));

        setTimeout(() => this.chips.forEach(reveal), 3000);
    }

    measure() {
        const wallRect = this.root.getBoundingClientRect();
        this.centers = this.chips.map(chip => {
            const r = chip.getBoundingClientRect();
            return {
                x: r.left - wallRect.left + r.width / 2,
                y: r.top - wallRect.top + r.height / 2,
                hw: r.width / 2,
                hh: r.height / 2
            };
        });
    }

    start() {
        if (this.rafId === null) this.rafId = requestAnimationFrame(this.tick);
    }

    bindEvents() {
        this.root.addEventListener('pointerenter', () => this.measure());
        window.addEventListener('resize', () => { this.centers = []; });

        this.root.addEventListener('pointermove', (e) => {
            const wallRect = this.root.getBoundingClientRect();
            // Coordenadas relativas a la sección: así no hace falta volver a
            // medir mientras el scroll virtual mueve #scroll-wrapper.
            this.pointer.x = e.clientX - wallRect.left;
            this.pointer.y = e.clientY - wallRect.top;

            this.root.style.setProperty('--lw-mx', `${this.pointer.x}px`);
            this.root.style.setProperty('--lw-my', `${this.pointer.y}px`);
            this.root.classList.add('is-active');
            this.start();
        });

        this.root.addEventListener('pointerleave', () => {
            this.pointer.x = -9999;
            this.pointer.y = -9999;
            this.root.classList.remove('is-active');
            this.start();
        });
    }

    loop() {
        this.rafId = null;
        if (!this.centers.length) this.measure();

        let moving = false;

        this.chips.forEach((chip, i) => {
            const s = this.state[i];
            const c = this.centers[i];
            const dx = this.pointer.x - c.x;
            const dy = this.pointer.y - c.y;
            const target = Math.max(0, 1 - Math.hypot(dx, dy) / this.radius);

            const nx = target > 0.001 ? dx / c.hw : 0;
            const ny = target > 0.001 ? dy / c.hh : 0;
            const targetRotY = Math.max(-9, Math.min(9, nx * 9)) * target;
            const targetRotX = Math.max(-9, Math.min(9, -ny * 9)) * target;
            const targetScale = 1 + 0.035 * target;

            s.reveal += (target - s.reveal) * 0.18;
            s.rotX += (targetRotX - s.rotX) * 0.15;
            s.rotY += (targetRotY - s.rotY) * 0.15;
            s.scale += (targetScale - s.scale) * 0.15;

            const settled =
                Math.abs(target - s.reveal) < 0.001 &&
                Math.abs(targetRotX - s.rotX) < 0.01 &&
                Math.abs(targetRotY - s.rotY) < 0.01 &&
                Math.abs(targetScale - s.scale) < 0.0005;

            if (settled) {
                s.reveal = target;
                s.rotX = targetRotX;
                s.rotY = targetRotY;
                s.scale = targetScale;
            } else {
                moving = true;
            }

            // Solo escribimos estilos si el valor cambió: evita recalcular
            // estilos de las 16 chips en cada frame cuando están quietas.
            const reveal = s.reveal.toFixed(3);
            if (reveal !== s.lastReveal) {
                chip.style.setProperty('--reveal', reveal);
                s.lastReveal = reveal;
            }

            const transform = s.reveal === 0 && s.rotX === 0 && s.rotY === 0 && s.scale === 1
                ? ''
                : `perspective(700px) rotateX(${s.rotX.toFixed(2)}deg) rotateY(${s.rotY.toFixed(2)}deg) scale(${s.scale.toFixed(3)})`;
            if (transform !== s.lastTransform) {
                chip.style.transform = transform;
                s.lastTransform = transform;
            }
        });

        // El loop se detiene solo cuando todo llegó a su destino; el próximo
        // pointermove/pointerleave lo vuelve a arrancar.
        if (moving) this.start();
    }
}
