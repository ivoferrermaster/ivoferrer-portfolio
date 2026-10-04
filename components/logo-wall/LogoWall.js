/* components/logo-wall/LogoWall.js
   Grilla de logos de clientes. Las tarjetas (.logo-wall__chip) aparecen escalonadas al entrar
   en pantalla. Con mouse, las cercanas al cursor se iluminan (--reveal, de 0 a 1), se inclinan
   hacia él y crecen un poco; además un halo sigue al cursor (--lw-mx / --lw-my en el CSS).
   En táctil o con movimiento reducido quedan fijas e iluminadas (clase is-static). */
class LogoWall {
    constructor(selector) {
        this.root = document.querySelector(selector);
        this.chips = Array.from(this.root.querySelectorAll('.logo-wall__chip'));
        this.radius = 260; // distancia (px) a la que el cursor empieza a afectar una tarjeta

        // El índice alimenta el retraso escalonado de la entrada en el CSS
        this.chips.forEach((chip, i) => chip.style.setProperty('--i', i));
        this.observeEntrance();

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isTouch = window.matchMedia('(hover: none)').matches;
        if (reducedMotion || isTouch) {
            this.root.classList.add('is-static');
            return;
        }

        this.pointer = { x: -9999, y: -9999 }; // lejos de todo = sin efecto
        // Valores actuales de cada tarjeta: en cada frame se acercan un poco a su objetivo
        this.state = this.chips.map(() => ({ reveal: 0, rotX: 0, rotY: 0, scale: 1 }));
        // Centro de cada tarjeta (se mide al entrar el mouse, no en cada frame)
        this.centers = [];
        this.rafId = null;
        this.loop = this.loop.bind(this);

        this.bindEvents();
    }

    // Entrada: cada tarjeta aparece al entrar en pantalla. Por las dudas, a los 3 s aparecen todas.
    observeEntrance() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.01 });

        this.chips.forEach(chip => observer.observe(chip));
        setTimeout(() => this.chips.forEach(chip => chip.classList.add('is-visible')), 3000);
    }

    // Centros relativos a la sección: no cambian con el scroll ni con la inclinación de la tarjeta
    measure() {
        const wallRect = this.root.getBoundingClientRect();
        this.centers = this.chips.map(chip => {
            const r = chip.getBoundingClientRect();
            return {
                x: r.left - wallRect.left + r.width / 2,
                y: r.top - wallRect.top + r.height / 2,
                halfW: r.width / 2,
                halfH: r.height / 2
            };
        });
    }

    // Arranca el loop si estaba detenido
    start() {
        if (this.rafId === null) this.rafId = requestAnimationFrame(this.loop);
    }

    bindEvents() {
        this.root.addEventListener('pointerenter', () => this.measure());
        window.addEventListener('resize', () => { this.centers = []; });

        this.root.addEventListener('pointermove', (e) => {
            const wallRect = this.root.getBoundingClientRect();
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

        const clamp9 = (v) => Math.max(-9, Math.min(9, v)); // inclinación máxima: 9 grados
        let moving = false;

        this.chips.forEach((chip, i) => {
            const s = this.state[i];
            const c = this.centers[i];
            const dx = this.pointer.x - c.x;
            const dy = this.pointer.y - c.y;

            // Cercanía al cursor: 1 encima de la tarjeta, 0 a partir de `radius`
            const near = Math.max(0, 1 - Math.hypot(dx, dy) / this.radius);
            const targetRotY = clamp9(dx / c.halfW * 9) * near;
            const targetRotX = clamp9(-dy / c.halfH * 9) * near;
            const targetScale = 1 + 0.035 * near;

            s.reveal += (near - s.reveal) * 0.18;
            s.rotX += (targetRotX - s.rotX) * 0.15;
            s.rotY += (targetRotY - s.rotY) * 0.15;
            s.scale += (targetScale - s.scale) * 0.15;

            const settled =
                Math.abs(near - s.reveal) < 0.001 &&
                Math.abs(targetRotX - s.rotX) < 0.01 &&
                Math.abs(targetRotY - s.rotY) < 0.01 &&
                Math.abs(targetScale - s.scale) < 0.0005;

            if (settled) {
                s.reveal = near;
                s.rotX = targetRotX;
                s.rotY = targetRotY;
                s.scale = targetScale;
            } else {
                moving = true;
            }

            // Solo se escriben los estilos que cambiaron (evita recalcular las 16 tarjetas en cada frame)
            const reveal = s.reveal.toFixed(3);
            if (reveal !== s.lastReveal) {
                chip.style.setProperty('--reveal', reveal);
                s.lastReveal = reveal;
            }

            const atRest = s.reveal === 0 && s.rotX === 0 && s.rotY === 0 && s.scale === 1;
            const transform = atRest
                ? ''
                : `perspective(700px) rotateX(${s.rotX.toFixed(2)}deg) rotateY(${s.rotY.toFixed(2)}deg) scale(${s.scale.toFixed(3)})`;
            if (transform !== s.lastTransform) {
                chip.style.transform = transform;
                s.lastTransform = transform;
            }
        });

        // El loop se detiene cuando todo llegó a su objetivo; el próximo movimiento lo vuelve a arrancar
        if (moving) this.start();
    }
}
