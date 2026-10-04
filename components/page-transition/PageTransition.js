/* components/page-transition/PageTransition.js

   "Sub-preloader": cortina corta al navegar entre páginas del sitio (inicio ↔ trabajo).
   El preloader completo (Preloader.js) queda solo para la primera entrada o una recarga.

   - Salida:  al hacer clic en un enlace a otra página del sitio, la cortina con el logo tapa
              la pantalla, se deja una marca en sessionStorage y recién ahí se navega.
   - Llegada: si la página encuentra esa marca (o se llegó con atrás/adelante), nace tapada
              y la cortina se abre cuando termina de cargar.

   Este archivo se carga en <head> SIN defer: así la clase `pt-arriving` se pone antes de que
   se pinte la página. script.js usa `pageArrived` y `pageRevealStart` para la entrada del hero. */

const PT_KEY = 'ivo:pt';

/* ---------- Llegada: corre antes del primer pintado ---------- */

let ptMark = null;
try {
    ptMark = sessionStorage.getItem(PT_KEY);
    sessionStorage.removeItem(PT_KEY);
} catch (e) { /* sin storage: no hay marca */ }

// Hubo transición si la marca es de hace menos de 10 s (para no heredarla en una visita futura)
// o si se llegó con los botones atrás/adelante del navegador
const pageArrived = (ptMark && Date.now() - Number(ptMark) < 10000)
    || performance.getEntriesByType('navigation')[0]?.type === 'back_forward';

// Con esta clase page-transition.css muestra la cortina cerrada
if (pageArrived) document.documentElement.classList.add('pt-arriving');

// Promesa que se cumple cuando la cortina empieza a abrirse (o enseguida, si no hubo transición)
let startReveal;
const pageRevealStart = new Promise((resolve) => { startReveal = resolve; });

document.addEventListener('DOMContentLoaded', () => {
    const panel = document.querySelector('.page-transition');
    const logo = panel.querySelector('.page-transition__logo');
    const canAnimate = window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let leaving = false;

    function hidePanel() {
        document.documentElement.classList.remove('pt-arriving');
        if (window.gsap) gsap.killTweensOf([panel, logo]);
        panel.style.visibility = '';
        panel.style.clipPath = '';
        logo.style.opacity = '';
    }

    // Ignora "index.html" y la barra final: "/", "/index.html" y "" son la misma página
    function cleanPath(path) {
        return path.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
    }

    /* ---------- Llegada: abrir la cortina ---------- */

    async function reveal() {
        if (!canAnimate) {
            hidePanel();
            startReveal();
            return;
        }

        // Se espera a que la página esté lista debajo: mínimo 250 ms (para que se vea el logo)
        // y máximo 3 s (por si algo nunca termina de cargar)
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const loaded = new Promise((resolve) => {
            if (document.readyState === 'complete') resolve();
            else window.addEventListener('load', resolve, { once: true });
        });
        await Promise.race([Promise.all([loaded, document.fonts.ready, wait(250)]), wait(3000)]);

        startReveal();
        gsap.to(logo, { opacity: 0, duration: 0.3, ease: 'power1.in' });
        gsap.to(panel, { clipPath: 'inset(0% 50% 0% 50%)', duration: 0.8, ease: 'expo.inOut', onComplete: hidePanel });
    }

    if (pageArrived) reveal();
    else startReveal();

    /* ---------- Salida: tapar la pantalla y navegar ---------- */

    document.addEventListener('click', (e) => {
        if (!canAnimate || leaving || e.defaultPrevented) return;
        // Clic con rueda o con Ctrl/Cmd/Shift/Alt (abrir en otra pestaña, etc.): se deja al navegador
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const link = e.target.closest('a[href]');
        if (!link || link.target === '_blank') return;

        // Solo enlaces a OTRA página de este sitio (no anclas ni las rutas # del carrusel)
        const url = new URL(link.href);
        if (url.origin !== location.origin || cleanPath(url.pathname) === cleanPath(location.pathname)) return;

        e.preventDefault();
        leaving = true;
        try { sessionStorage.setItem(PT_KEY, String(Date.now())); } catch (err) { /* sin storage: igual navega */ }

        panel.style.visibility = 'visible';
        gsap.fromTo(logo, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.2, ease: 'power1.out' });
        gsap.fromTo(panel,
            { clipPath: 'inset(0% 50% 0% 50%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.inOut', onComplete: () => { location.href = url.href; } });
    });

    // Al volver con "atrás", el navegador puede restaurar la página desde su caché con la
    // cortina todavía tapando: se la retira
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        leaving = false;
        hidePanel();
    });
});
