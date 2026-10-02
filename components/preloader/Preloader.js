/* components/preloader/Preloader.js
 *
 * Preloader de entrada: cortina de canvas que se abre en dos fases (una
 * rendija vertical y luego una apertura horizontal), un logo en el centro y
 * una barra de 1px que crece desde el centro. Al terminar, el logo "cae" sobre
 * la barra, esta se contrae y el preloader se retira.
 *
 * Es una adaptación de la secuencia del preloader de resn.co.nz, con el logo
 * propio en lugar de la gota. Requiere GSAP 3.
 *
 * Callbacks:
 *   onPreHidden  empieza la salida (el logo cae). Acá arranca la entrada del hero.
 *   onHidden     el preloader ya se retiró del DOM.
 */
class Preloader {
    // Proporción del logo (viewBox de logoivo.svg)
    static LOGO_RATIO = 1202 / 938;
    // Alto del logo en px
    static LOGO_HEIGHT = { desktop: 40, mobile: 30 };
    // Gris de la cortina (valor RGB final)
    static CURTAIN_GREY = 35;
    // Tope de espera si algún recurso nunca termina de cargar
    static MAX_WAIT = 15000;

    constructor(selector, options = {}) {
        this.el = document.querySelector(selector);
        if (!this.el) return;

        this.onPreHidden = options.onPreHidden || (() => {});
        this.onHidden = options.onHidden || (() => {});

        this.inner = this.el.querySelector('.preloader__inner');
        this.logo = this.el.querySelector('.preloader__logo');
        this.barWrapper = this.el.querySelector('.preloader__bar');
        this.barProgress = this.el.querySelector('.preloader__bar-fill');

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const ready = this.inner && this.logo && this.barWrapper && this.barProgress;

        // Sin GSAP, con movimiento reducido o con markup incompleto no se
        // anima: se retira el preloader y el sitio sigue su curso.
        if (typeof gsap === 'undefined' || reduceMotion || !ready) {
            this.skip();
            return;
        }

        this.isMobile = window.matchMedia('(max-width: 767px)').matches;
        // Parte de la barra que avanza "de mentira" mientras carga lo real
        this.STARTING_PROGRESS = this.isMobile ? 0.2 : 0.3;

        this.w = 0;
        this.h = 0;
        this.pixelRatio = 1;
        this.fauxPr = 0;
        this.fauxClipped = false;
        this.loadProgress = 0;
        this.tgPr = 0;
        this.pr = 0;
        this.renderBar = false;
        this.bgDone = false;
        this.isComplete = false;
        this.tw = { bgMaskScaleXPr: 0, bgMaskScaleYPr: 0, alphaDropPr: 0, alphaBgPr: 0 };

        this.cnv = document.createElement('canvas');
        this.cnv.className = 'preloader__canvas';
        this.ctx = this.cnv.getContext('2d');
        // Silueta negra del logo (la que se ve sobre la cortina gris)
        this.logoCnv = document.createElement('canvas');
        this.el.append(this.cnv);

        this.onResize = this.onResize.bind(this);
        this.update = this.update.bind(this);

        this.onResize();
        window.addEventListener('resize', this.onResize);
        this.prepareLogo();
        this.trackLoad();
        this.start();
    }

    /* ---------- Salida rápida (sin animación) ---------- */

    skip() {
        this.el.remove();
        // Asíncrono para que quien instancia ya haya terminado de configurarse
        Promise.resolve().then(() => {
            this.onPreHidden();
            this.onHidden();
        });
    }

    /* ---------- Progreso real de carga (0 → 1) ---------- */

    trackLoad() {
        const tasks = [];

        if (document.fonts && document.fonts.load) {
            tasks.push(document.fonts.load('400 1em "Work Sans"'));
            tasks.push(document.fonts.load('400 1em "Moul"'));
        }

        // Solo imágenes que cargan de entrada; las lazy no deben retener el preloader
        Array.from(document.images)
            .filter((img) => img.loading !== 'lazy')
            .forEach((img) => {
                tasks.push(img.decode ? img.decode() : new Promise((res) => {
                    if (img.complete) res(); else img.addEventListener('load', res, { once: true });
                }));
            });

        tasks.push(document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise((res) => window.addEventListener('load', res, { once: true })));

        let done = 0;
        const step = () => { this.loadProgress = ++done / tasks.length; };
        // Un recurso que falla cuenta como terminado: no debe trabar el sitio
        tasks.forEach((task) => Promise.resolve(task).catch(() => {}).then(step));

        setTimeout(() => { this.loadProgress = 1; }, Preloader.MAX_WAIT);
    }

    /* ---------- Logo ---------- */

    prepareLogo() {
        this.logoReady = false;
        const build = () => { this.logoReady = true; this.rasterizeLogo(); };
        if (this.logo.complete) build();
        else this.logo.addEventListener('load', build, { once: true });
    }

    // El SVG es blanco; para la cortina se necesita su silueta en negro
    rasterizeLogo() {
        if (!this.logoReady) return;
        const dpr = this.pixelRatio;
        const c = this.logoCnv;
        c.width = Math.ceil(this.dropW * dpr);
        c.height = Math.ceil(this.dropH * dpr);
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(this.logo, 0, 0, c.width, c.height);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#000';
        g.fillRect(0, 0, c.width, c.height);
    }

    /* ---------- Secuencia ---------- */

    start() {
        // Los tweens usan el mismo ticker de GSAP: un único rAF para todo
        gsap.ticker.add(this.update);

        gsap.set([this.barWrapper, this.barProgress], { scaleX: 0 });
        gsap.to(this, { fauxPr: this.STARTING_PROGRESS, duration: 7, ease: 'power1.inOut' });

        // Primer frame ya pintado (negro): se retira el fondo negro de seguridad
        this.drawBg();
        this.el.classList.add('is-ready');

        gsap.to(this.tw, { alphaBgPr: 1, duration: 0.64, delay: 0.23, ease: 'cubic.inOut' });
        gsap.delayedCall(0.6, () => this.animateBgIn());
    }

    animateBgIn() {
        this.inner.style.opacity = 1;
        gsap.to(this.tw, { alphaDropPr: 1, duration: 1, ease: 'cubic.inOut' });
        // Fase 1: rendija vertical de arriba hacia abajo
        gsap.to(this.tw, { bgMaskScaleYPr: 1, duration: 0.7, delay: 1, ease: 'power2.in' });
        // Fase 2: la rendija se abre hacia los costados
        gsap.to(this.tw, {
            bgMaskScaleXPr: 1,
            duration: 1.1,
            delay: 1.75,
            ease: 'expo.inOut',
            onComplete: () => this.onAnimBgComplete()
        });
        gsap.delayedCall(1.75, () => this.animateBarIn());
    }

    animateBarIn() {
        gsap.to(this.barWrapper, { scaleX: 1, duration: 1.15, ease: 'expo.inOut', force3D: true });
    }

    onAnimBgComplete() {
        // Cortina totalmente abierta: se limpia una última vez y se deja de dibujar
        this.drawBg();
        this.bgDone = true;
        this.cnv.style.display = 'none';
        // Recién ahora la barra empieza a seguir el progreso real
        this.renderBar = true;
    }

    complete() {
        if (this.isComplete) return;
        this.isComplete = true;
        this.animateBarOut();
    }

    animateBarOut() {
        this.onPreHidden();

        // El logo cae hasta la barra y queda recortado por el borde inferior
        gsap.to(this.logo, { y: this.innerH, duration: 0.62, ease: 'expo.in', force3D: true });
        gsap.to(this.barWrapper, { scaleX: 0, duration: 0.79, delay: 0.144, ease: 'expo.inOut', force3D: true });

        gsap.delayedCall(0.79, () => {
            this.destroy();
            this.onHidden();
        });
    }

    destroy() {
        window.removeEventListener('resize', this.onResize);
        gsap.ticker.remove(this.update);
        this.el.remove();
    }

    /* ---------- Frame ---------- */

    update(time, deltaTime) {
        this.updateProgress();

        if (this.renderBar) {
            // Lerp de 6% por frame a 60fps, independiente del refresco del monitor
            const k = 1 - Math.pow(0.94, (deltaTime || 16.667) / 16.667);
            this.pr += k * (this.tgPr - this.pr);
        }

        if (!this.bgDone) this.drawBg();
        gsap.set(this.barProgress, { scaleX: this.pr, force3D: true });

        if (this.tgPr >= 0.999 && this.pr > 0.99) this.complete();
    }

    updateProgress() {
        // Casi todo cargado: la parte "de mentira" se completa rápido
        if (this.loadProgress >= 0.95 && !this.fauxClipped) {
            this.fauxClipped = true;
            gsap.killTweensOf(this, 'fauxPr');
            gsap.to(this, { fauxPr: this.STARTING_PROGRESS, duration: 0.3, ease: 'power1.inOut' });
        }
        // La barra nunca retrocede
        const target = this.fauxPr + this.loadProgress * (1 - this.STARTING_PROGRESS);
        if (target > this.tgPr) this.tgPr = Math.min(target, 1);
    }

    /* ---------- Dibujo ---------- */

    drawBg() {
        const { bgMaskScaleXPr: sx, bgMaskScaleYPr: sy, alphaBgPr, alphaDropPr } = this.tw;
        const ctx = this.ctx;
        const grey = Math.round(Preloader.CURTAIN_GREY * alphaBgPr);

        ctx.clearRect(0, 0, this.w, this.h);

        ctx.save();
        ctx.fillStyle = `rgb(${grey},${grey},${grey})`;
        ctx.fillRect(0, 0, this.w, this.h);
        if (this.logoReady && alphaDropPr > 0) {
            ctx.globalAlpha = alphaDropPr;
            ctx.drawImage(this.logoCnv, this.logoX, this.logoY, this.dropW, this.dropH);
        }
        ctx.restore();

        // La rendija recorta la cortina (logo incluido) y deja ver lo que hay debajo
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0.5 * (this.w - 1) - 0.5 * this.w * sx, 0, 2 + this.w * sx, this.h * sy);
        ctx.restore();
    }

    onResize() {
        const dpr = (this.pixelRatio = window.devicePixelRatio || 1);
        this.w = window.innerWidth;
        this.h = window.innerHeight;

        this.cnv.width = dpr * this.w;
        this.cnv.height = dpr * this.h;
        this.cnv.style.width = `${this.w}px`;
        this.cnv.style.height = `${this.h}px`;
        this.ctx.scale(dpr, dpr);

        const logoH = Preloader.LOGO_HEIGHT[this.isMobile ? 'mobile' : 'desktop'];
        this.dropH = logoH;
        this.dropW = logoH * Preloader.LOGO_RATIO;

        // Caja central: ancho máx. 500px; el alto deja siempre aire entre logo y barra
        this.innerW = Math.min(0.6 * this.w, 500);
        this.innerH = Math.max(0.1 * this.h, this.dropH + 28);
        const innerLeft = Math.round(0.5 * (this.w - this.innerW));
        const innerTop = Math.round(0.5 * (this.h - this.innerH));
        Object.assign(this.inner.style, {
            left: `${innerLeft}px`,
            top: `${innerTop}px`,
            width: `${this.innerW}px`,
            height: `${this.innerH}px`
        });

        // El logo del DOM (blanco) y el del canvas (negro) comparten posición exacta
        this.logoX = Math.ceil(0.5 * (this.w - this.dropW));
        this.logoY = innerTop;
        Object.assign(this.logo.style, {
            width: `${this.dropW}px`,
            height: `${this.dropH}px`,
            left: `${this.logoX - innerLeft}px`
        });

        this.rasterizeLogo();
        if (!this.bgDone) this.drawBg();
    }
}
