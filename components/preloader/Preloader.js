/* components/preloader/Preloader.js

   Preloader de entrada (adaptación del de resn.co.nz con el logo propio). Requiere GSAP 3.
   1. Una cortina gris (dibujada en un canvas) se abre en dos fases: una rendija vertical
      y después una apertura hacia los costados.
   2. Debajo aparece el logo y una barra de 1px que avanza con la carga real de la página.
   3. Al completarse, el logo "cae" sobre la barra, esta se contrae y el preloader se retira.

   onClose: se llama cuando empieza la salida (el logo cae). Ahí arranca la entrada del hero. */
class Preloader {
    constructor(onClose) {
        this.el = document.getElementById('preloader');
        this.onClose = onClose;

        // Sin GSAP o con movimiento reducido no se anima: se retira y el sitio sigue
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!window.gsap || reduceMotion) {
            this.el.remove();
            onClose();
            return;
        }

        this.inner = this.el.querySelector('.preloader__inner');
        this.logo = this.el.querySelector('.preloader__logo');
        this.bar = this.el.querySelector('.preloader__bar');
        this.barFill = this.el.querySelector('.preloader__bar-fill');

        this.isMobile = window.matchMedia('(max-width: 767px)').matches;
        // Parte de la barra que avanza "de mentira" mientras carga lo real
        this.fakePart = this.isMobile ? 0.2 : 0.3;

        // Progreso de la barra (todo de 0 a 1)
        this.fakeProgress = 0;     // la parte "de mentira"
        this.loadProgress = 0;     // la carga real
        this.target = 0;           // a dónde tiene que llegar la barra
        this.progress = 0;         // dónde está la barra ahora
        this.fakeRushed = false;   // ¿ya se apuró la parte "de mentira"?
        this.barActive = false;    // la barra sigue al progreso recién cuando se abrió la cortina
        this.curtainOpen = false;
        this.closing = false;

        // Valores que anima GSAP para dibujar la cortina
        this.anim = { maskX: 0, maskY: 0, logoAlpha: 0, greyAlpha: 0 };

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'preloader__canvas';
        this.ctx = this.canvas.getContext('2d');
        this.el.append(this.canvas);

        // Silueta negra del logo, la que se ve sobre la cortina gris
        this.logoCanvas = document.createElement('canvas');
        this.logoReady = this.logo.complete;
        if (!this.logoReady) {
            this.logo.addEventListener('load', () => {
                this.logoReady = true;
                this.drawLogoSilhouette();
            }, { once: true });
        }

        this.onResize = this.onResize.bind(this);
        this.update = this.update.bind(this);

        this.onResize();
        window.addEventListener('resize', this.onResize);
        this.trackLoad();
        this.start();
    }

    /* ---------- Progreso real de carga ---------- */

    trackLoad() {
        const tasks = [
            document.fonts.load('400 1em "Work Sans"'),
            document.fonts.load('400 1em "Moul"'),
            // Solo imágenes que cargan de entrada: las lazy no deben retener el preloader
            ...Array.from(document.images)
                .filter((img) => img.loading !== 'lazy')
                .map((img) => img.decode()),
            new Promise((resolve) => {
                if (document.readyState === 'complete') resolve();
                else window.addEventListener('load', resolve, { once: true });
            })
        ];

        let done = 0;
        // Un recurso que falla cuenta igual como terminado: no debe trabar el sitio
        tasks.forEach((task) => task.catch(() => {}).then(() => {
            this.loadProgress = ++done / tasks.length;
        }));

        // Tope de espera por si algún recurso nunca termina de cargar
        setTimeout(() => { this.loadProgress = 1; }, 15000);
    }

    /* ---------- Secuencia ---------- */

    start() {
        // update() corre en cada frame con el mismo reloj de GSAP
        gsap.ticker.add(this.update);

        gsap.set([this.bar, this.barFill], { scaleX: 0 });
        gsap.to(this, { fakeProgress: this.fakePart, duration: 7, ease: 'power1.inOut' });

        // Primer frame ya pintado (negro): se retira el fondo negro de seguridad del CSS
        this.drawCurtain();
        this.el.classList.add('is-ready');

        gsap.to(this.anim, { greyAlpha: 1, duration: 0.64, delay: 0.23, ease: 'cubic.inOut' });
        gsap.delayedCall(0.6, () => this.openCurtain());
    }

    openCurtain() {
        this.inner.style.opacity = 1;
        gsap.to(this.anim, { logoAlpha: 1, duration: 1, ease: 'cubic.inOut' });
        // Fase 1: rendija vertical de arriba hacia abajo
        gsap.to(this.anim, { maskY: 1, duration: 0.7, delay: 1, ease: 'power2.in' });
        // Fase 2: la rendija se abre hacia los costados (y a la vez aparece la barra)
        gsap.to(this.bar, { scaleX: 1, duration: 1.15, delay: 1.75, ease: 'expo.inOut', force3D: true });
        gsap.to(this.anim, {
            maskX: 1,
            duration: 1.1,
            delay: 1.75,
            ease: 'expo.inOut',
            onComplete: () => {
                // Cortina abierta del todo: se limpia una última vez y se deja de dibujar
                this.drawCurtain();
                this.curtainOpen = true;
                this.canvas.style.display = 'none';
                this.barActive = true;
            }
        });
    }

    close() {
        this.closing = true;
        this.onClose();

        // El logo cae hasta la barra y queda recortado por el borde de abajo
        gsap.to(this.logo, { y: this.innerH, duration: 0.62, ease: 'expo.in', force3D: true });
        gsap.to(this.bar, { scaleX: 0, duration: 0.79, delay: 0.144, ease: 'expo.inOut', force3D: true });

        gsap.delayedCall(0.79, () => {
            window.removeEventListener('resize', this.onResize);
            gsap.ticker.remove(this.update);
            this.el.remove();
        });
    }

    /* ---------- Cada frame ---------- */

    update(time, deltaTime) {
        // Casi todo cargado: la parte "de mentira" se completa rápido
        if (this.loadProgress >= 0.95 && !this.fakeRushed) {
            this.fakeRushed = true;
            gsap.killTweensOf(this, 'fakeProgress');
            gsap.to(this, { fakeProgress: this.fakePart, duration: 0.3, ease: 'power1.inOut' });
        }

        // La barra nunca retrocede
        const target = this.fakeProgress + this.loadProgress * (1 - this.fakePart);
        if (target > this.target) this.target = Math.min(target, 1);

        if (this.barActive) {
            // Se acerca un 6% por frame a 60fps, sin importar el refresco del monitor
            const k = 1 - Math.pow(0.94, (deltaTime || 16.667) / 16.667);
            this.progress += k * (this.target - this.progress);
        }

        if (!this.curtainOpen) this.drawCurtain();
        gsap.set(this.barFill, { scaleX: this.progress, force3D: true });

        if (this.target >= 0.999 && this.progress > 0.99 && !this.closing) this.close();
    }

    /* ---------- Dibujo ---------- */

    drawCurtain() {
        const { maskX, maskY, greyAlpha, logoAlpha } = this.anim;
        const ctx = this.ctx;
        const grey = Math.round(35 * greyAlpha); // mismo gris que la cortina de page-transition

        ctx.clearRect(0, 0, this.w, this.h);

        ctx.save();
        ctx.fillStyle = `rgb(${grey},${grey},${grey})`;
        ctx.fillRect(0, 0, this.w, this.h);
        if (this.logoReady && logoAlpha > 0) {
            ctx.globalAlpha = logoAlpha;
            ctx.drawImage(this.logoCanvas, this.logoX, this.logoY, this.logoW, this.logoH);
        }
        ctx.restore();

        // La rendija recorta la cortina (logo incluido) y deja ver lo que hay debajo
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0.5 * (this.w - 1) - 0.5 * this.w * maskX, 0, 2 + this.w * maskX, this.h * maskY);
        ctx.restore();
    }

    // El SVG del logo es blanco; para la cortina se necesita su silueta en negro
    drawLogoSilhouette() {
        if (!this.logoReady) return;
        const c = this.logoCanvas;
        c.width = Math.ceil(this.logoW * this.dpr);
        c.height = Math.ceil(this.logoH * this.dpr);
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(this.logo, 0, 0, c.width, c.height);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#000';
        g.fillRect(0, 0, c.width, c.height);
    }

    onResize() {
        const dpr = (this.dpr = window.devicePixelRatio || 1);
        this.w = window.innerWidth;
        this.h = window.innerHeight;

        this.canvas.width = dpr * this.w;
        this.canvas.height = dpr * this.h;
        this.canvas.style.width = `${this.w}px`;
        this.canvas.style.height = `${this.h}px`;
        this.ctx.scale(dpr, dpr);

        // Tamaño del logo (1202 / 938 es la proporción del viewBox de logoivo.svg)
        this.logoH = this.isMobile ? 30 : 40;
        this.logoW = this.logoH * (1202 / 938);

        // Caja central: ancho máx. 500px; el alto deja siempre aire entre el logo y la barra
        this.innerW = Math.min(0.6 * this.w, 500);
        this.innerH = Math.max(0.1 * this.h, this.logoH + 28);
        const innerLeft = Math.round(0.5 * (this.w - this.innerW));
        const innerTop = Math.round(0.5 * (this.h - this.innerH));
        Object.assign(this.inner.style, {
            left: `${innerLeft}px`,
            top: `${innerTop}px`,
            width: `${this.innerW}px`,
            height: `${this.innerH}px`
        });

        // El logo del DOM (blanco) y el del canvas (negro) van exactamente en el mismo lugar
        this.logoX = Math.ceil(0.5 * (this.w - this.logoW));
        this.logoY = innerTop;
        Object.assign(this.logo.style, {
            width: `${this.logoW}px`,
            height: `${this.logoH}px`,
            left: `${this.logoX - innerLeft}px`
        });

        this.drawLogoSilhouette();
        if (!this.curtainOpen) this.drawCurtain();
    }
}
