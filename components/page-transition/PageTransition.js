/* components/page-transition/PageTransition.js
 *
 * "Sub-preloader": transición corta entre páginas del sitio (inicio ↔ trabajo).
 * El preloader completo (Preloader.js) queda solo para cuando se entra al sitio
 * o se recarga la página; navegar entre secciones usa esta cortina.
 *
 * Funciona en dos mitades, una en cada página:
 *   - Salida:  al hacer clic en un enlace interno, la cortina con el logo tapa la
 *              pantalla, se deja una marca en sessionStorage y recién ahí se navega.
 *   - Llegada: un script inline en <head> detecta la marca y agrega la clase
 *              `pt-arriving` antes del primer pintado (la página nace tapada);
 *              acá se espera a que cargue y la cortina se abre.
 *
 * Quien necesite sincronizarse con la llegada (p. ej. la entrada del hero)
 * puede usar PageTransition.arrived y PageTransition.revealStart.
 */
class PageTransition {
    static STORAGE_KEY = 'ivo:pt';
    // La marca solo vale unos segundos: evita que una visita futura la herede
    static MAX_AGE = 10000;
    // Tiempo mínimo con la página tapada (se ve el logo) y tope de espera por carga
    static HOLD = 250;
    static MAX_WAIT = 3000;

    // ¿Esta página se abrió desde una transición? Se lee una vez, antes de que se quite la clase.
    static arrived = document.documentElement.classList.contains('pt-arriving');
    // Se resuelve cuando la cortina empieza a abrirse
    static revealStart = new Promise((resolve) => { PageTransition._resolveReveal = resolve; });

    constructor() {
        this.panel = document.querySelector('.page-transition');
        if (!this.panel) {
            document.documentElement.classList.remove('pt-arriving');
            PageTransition._resolveReveal();
            return;
        }

        this.logo = this.panel.querySelector('.page-transition__logo');
        this.canAnimate = typeof gsap !== 'undefined'
            && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.leaving = false;

        if (PageTransition.arrived) this.reveal();
        else PageTransition._resolveReveal();

        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('click', (e) => this.onClick(e));

        // Volver con "atrás" puede restaurar la página desde caché con la cortina
        // todavía tapando: se la retira.
        window.addEventListener('pageshow', (e) => {
            if (!e.persisted) return;
            this.leaving = false;
            this.hidePanel();
        });
    }

    /* ---------- Salida ---------- */

    onClick(e) {
        if (!this.canAnimate || this.leaving || e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const link = e.target.closest('a[href]');
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        // Mismo documento (anclas, rutas con # del carrusel): no es un cambio de página
        if (PageTransition.normalizePath(url.pathname) === PageTransition.normalizePath(location.pathname)) return;

        e.preventDefault();
        this.leaving = true;
        try { sessionStorage.setItem(PageTransition.STORAGE_KEY, String(Date.now())); } catch (err) { /* sin storage: igual navega */ }

        this.cover().then(() => { location.href = url.href; });
    }

    static normalizePath(path) {
        return path.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
    }

    cover() {
        this.panel.style.visibility = 'visible';
        return new Promise((resolve) => {
            gsap.fromTo(this.panel,
                { clipPath: 'inset(0% 50% 0% 50%)' },
                { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.inOut', onComplete: resolve });
            gsap.fromTo(this.logo, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.2, ease: 'power1.out' });
        });
    }

    /* ---------- Llegada ---------- */

    async reveal() {
        try { sessionStorage.removeItem(PageTransition.STORAGE_KEY); } catch (err) { /* nada que limpiar */ }

        if (!this.canAnimate) {
            this.hidePanel();
            PageTransition._resolveReveal();
            return;
        }

        // Que la página ya esté lista debajo antes de abrir (con tope de espera)
        const ready = new Promise((resolve) => {
            if (document.readyState === 'complete') resolve();
            else window.addEventListener('load', resolve, { once: true });
        });
        const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
        const hold = new Promise((resolve) => setTimeout(resolve, PageTransition.HOLD));
        const cap = new Promise((resolve) => setTimeout(resolve, PageTransition.MAX_WAIT));
        await Promise.race([Promise.all([ready, fonts, hold]), cap]);

        PageTransition._resolveReveal();
        gsap.to(this.logo, { opacity: 0, duration: 0.3, ease: 'power1.in' });
        gsap.to(this.panel, {
            clipPath: 'inset(0% 50% 0% 50%)',
            duration: 0.8,
            ease: 'expo.inOut',
            onComplete: () => this.hidePanel()
        });
    }

    hidePanel() {
        document.documentElement.classList.remove('pt-arriving');
        gsap.killTweensOf([this.panel, this.logo]);
        this.panel.style.visibility = '';
        this.panel.style.clipPath = '';
        this.logo.style.opacity = '';
    }
}

new PageTransition();
