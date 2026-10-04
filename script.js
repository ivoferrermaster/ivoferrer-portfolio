/**
 * PREFERENCIA DE MOVIMIENTO REDUCIDO
 */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * SCROLL SUAVE Y PARALLAX (components/smoothscroll)
 */
const smoothScroll = new SmoothScroll();

/**
 * TRABAJO SELECCIONADO
 *    Las filas de la lista se arman con los proyectos de data/proyectos.js (los mismos que muestra
 *    trabajo.html). Va antes que el resto porque el cursor y las apariciones al hacer scroll
 *    buscan las filas cuando arrancan.
 */

// El cliente va letra por letra para que suban una a una (ver .projects-list__client en style.css);
// --i es su orden, que el CSS usa como retraso. Las letras de una palabra van juntas en un
// .reveal-word para que no se corte a la mitad. El texto completo queda oculto para lectores de pantalla.
function splitLetters(text) {
    let i = 0;
    const words = text.split(' ').map(word => {
        const letters = [...word].map(char => `<span class="reveal-char" style="--i: ${i++}">${char}</span>`);
        i++; // el espacio entre palabras también cuenta en el orden
        return `<span class="reveal-word">${letters.join('')}</span>`;
    });
    return `<span class="visually-hidden">${text}</span><span aria-hidden="true">${words.join(' ')}</span>`;
}

document.querySelector('.projects-list').innerHTML = window.PROYECTOS.map(project => `
    <li class="hidden-element">
        <a href="trabajo.html#/proyecto/${project.slug}">
            <span class="projects-list__title">${project.titulo}</span>
            <span class="projects-list__client">${splitLetters(project.cliente)}</span>
            <img class="projects-list__thumb" src="${project.poster}" alt="" loading="lazy" decoding="async">
        </a>
    </li>`).join('');

/**
 * 0. ENTRADA DEL HERO
 *    script.js se carga con defer: cuando corre, el HTML ya está listo.
 */

// Cada letra del hero va en su propio span para revelarlas de a una. El texto completo queda
// en un span oculto para lectores de pantalla y las letras se marcan aria-hidden.
document.querySelectorAll('.hero-content > *').forEach(el => {
    const nodes = [...el.childNodes];
    // Los nodos que no son texto son <br>: se mantienen (y para el lector de pantalla son un espacio)
    const srText = nodes.map(node => node.nodeType === Node.TEXT_NODE ? node.textContent : ' ').join('');
    const letters = nodes.map(node => node.nodeType === Node.TEXT_NODE
        ? [...node.textContent].map(char => char.trim() ? `<span class="rand-letter">${char}</span>` : char).join('')
        : '<br>').join('');

    el.innerHTML = `<span class="visually-hidden">${srText}</span><span aria-hidden="true">${letters}</span>`;
});

const hiddenLetters = [...document.querySelectorAll('.rand-letter')];

// Arranca cuando el preloader empieza a cerrarse (el logo cae sobre la barra) o cuando se abre
// la cortina de la transición entre páginas.
// arrivedAtAnchor: se llegó directo a una sección (ya se saltó ahí mientras la cortina tapaba),
// así que no hay que volver a hacer scroll.
function startEntrance(arrivedAtAnchor = false) {
    document.body.classList.add('start-anim');

    // Revela una letra cada 35ms, en orden aleatorio
    const revealInterval = setInterval(() => {
        if (hiddenLetters.length === 0) {
            clearInterval(revealInterval);
            return;
        }
        const randomIndex = Math.floor(Math.random() * hiddenLetters.length);
        hiddenLetters.splice(randomIndex, 1)[0].classList.add('revealed');
    }, 35);

    setTimeout(() => {
        document.body.classList.remove('loading');

        // Si se entró con un #ancla en la URL, se respeta ahora que se puede hacer scroll
        if (arrivedAtAnchor) return;
        const hashTarget = location.hash && document.getElementById(location.hash.slice(1));
        if (hashTarget) smoothScroll.scrollTo(hashTarget);
    }, arrivedAtAnchor ? 600 : 3000);
}

if (pageArrived) {
    // Se llegó desde otra página: sin preloader. La cortina de page-transition hace de
    // "sub-preloader" y el hero entra cuando empieza a abrirse.
    document.getElementById('preloader').remove();

    // Si el destino es una sección (ej. #contacto), se salta ahí de golpe mientras la cortina
    // todavía tapa: así no se ve pasar por el hero.
    const anchorTarget = location.hash && document.getElementById(location.hash.slice(1));
    if (anchorTarget) {
        window.addEventListener('load', () => smoothScroll.scrollTo(anchorTarget, true), { once: true });
    }
    pageRevealStart.then(() => startEntrance(Boolean(anchorTarget)));
} else {
    // Entrada al sitio o recarga: preloader completo (components/preloader/Preloader.js)
    new Preloader(startEntrance);

    // Si la URL trae un #ancla, el navegador salta solo ahí mientras está el preloader: se vuelve
    // arriba para que se vea la entrada del hero (al terminar, startEntrance baja hasta el ancla)
    if (location.hash) window.addEventListener('load', () => smoothScroll.scrollTo(0, true), { once: true });
}

/**
 * 1. NAVEGACIÓN CON ANCLAS Y TECLADO
 */
const siteHeader = document.querySelector('.site-header');
let skipFocusScroll = false;

// Enlaces a una sección (#servicios...): se llega con scroll suave y el foco pasa al destino,
// así la navegación con Tab sigue desde ahí
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    const target = link && document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;

    e.preventDefault();
    smoothScroll.scrollTo(target);

    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    skipFocusScroll = true;
    target.focus({ preventScroll: true });
    skipFocusScroll = false;

    history.pushState(null, '', link.getAttribute('href'));
});

// Al tabular, si el elemento enfocado queda tapado por el header (que es fijo) o fuera de
// pantalla, se lo lleva a un tercio de la altura. Se calcula contra el destino del scroll
// (puede estar a mitad de una animación), no contra la posición de este instante.
document.addEventListener('focusin', (e) => {
    if (skipFocusScroll || !e.target.closest('main, .footer')) return;

    const rect = e.target.getBoundingClientRect();
    const docTop = rect.top + window.scrollY;               // posición dentro de la página
    const viewTop = docTop - smoothScroll.destination;      // dónde va a quedar en pantalla
    if (viewTop < siteHeader.offsetHeight || viewTop + rect.height > window.innerHeight) {
        smoothScroll.scrollTo(docTop - window.innerHeight / 3);
    }
});

/**
 * 2. CURSOR PERSONALIZADO
 *    Sigue al mouse con un poco de retraso (se acerca un 20% por frame)
 *    y se agranda sobre los elementos interactivos.
 */
const cursor = document.getElementById('cursor');
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function updateCursor() {
    cursorX += (mouseX - cursorX) * 0.2;
    cursorY += (mouseY - cursorY) * 0.2;
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(updateCursor);
}
updateCursor();

document.querySelectorAll('button, a, .service-row, .insight-card, .testimonial-fan').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover-active'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover-active'));
});

/**
 * 3. APARICIÓN AL HACER SCROLL
 *    Los .hidden-element pasan a .visible-element la primera vez que entran en pantalla.
 */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.replace('hidden-element', 'visible-element');
        revealObserver.unobserve(entry.target);
    });
}, { threshold: 0.15 });

document.querySelectorAll('.hidden-element').forEach(el => revealObserver.observe(el));

/**
 * 4. BOTONES MAGNÉTICOS
 *    El botón (30%) y su texto (20%) se corren hacia el mouse; al salir vuelven a su lugar.
 */
document.querySelectorAll('.magnetic-btn').forEach(btn => {
    const text = btn.querySelector('.btn-text');

    btn.addEventListener('mousemove', (e) => {
        if (reduceMotion) return;
        const rect = btn.getBoundingClientRect();
        const distX = e.clientX - (rect.left + rect.width / 2);
        const distY = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = `translate3d(${distX * 0.3}px, ${distY * 0.3}px, 0)`;
        text.style.transform = `translate3d(${distX * 0.2}px, ${distY * 0.2}px, 0)`;
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate3d(0, 0, 0)';
        text.style.transform = 'translate3d(0, 0, 0)';
    });
});

/**
 * 5. SERVICIOS (desplegables con teclado, click o tap)
 */
document.querySelectorAll('.service-row__toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isOpen));
        toggle.closest('.service-row').classList.toggle('is-open', !isOpen);
    });
});

/**
 * 6. FAQ ACCORDION
 */
const faqButtons = document.querySelectorAll('.faq-question button');

function setFaq(button, open) {
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(open));
    button.querySelector('.icon').textContent = open ? '-' : '+';
    answer.classList.toggle('is-open', open);
    answer.style.maxHeight = open ? `${answer.scrollHeight}px` : null;
}

faqButtons.forEach(button => {
    button.addEventListener('click', () => {
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        faqButtons.forEach(other => setFaq(other, false));
        if (!isOpen) setFaq(button, true);
    });
});

/**
 * 7. CONTADORES (CIFRAS)
 *    Al entrar en pantalla cada número sube de 0 a su valor (data-target) en 2 segundos,
 *    frenando al final. Los números animados son aria-hidden: el valor real está en un texto oculto.
 */
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const counter = entry.target;
        const targetValue = Number(counter.dataset.target);
        counterObserver.unobserve(counter); // solo se anima la primera vez

        if (reduceMotion) {
            counter.textContent = targetValue;
            return;
        }

        let startTime = null;
        const step = (now) => {
            if (!startTime) startTime = now;
            const progress = Math.min((now - startTime) / 2000, 1); // de 0 a 1 en 2 s
            const eased = 1 - Math.pow(1 - progress, 4);              // ease-out: frena al final
            counter.textContent = Math.floor(eased * targetValue);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(counter => counterObserver.observe(counter));

/**
 * 8. VIDEO DE FONDO: botón de pausa (WCAG 2.2.2)
 */
const bgVideo = document.querySelector('.video-break__media');
const videoToggle = document.querySelector('.video-break__toggle');

function updateVideoToggle() {
    videoToggle.textContent = bgVideo.paused ? 'Reproducir video de fondo' : 'Pausar video de fondo';
}

// Con movimiento reducido el video arranca pausado
if (reduceMotion) {
    bgVideo.removeAttribute('autoplay');
    bgVideo.pause();
}
updateVideoToggle();

videoToggle.addEventListener('click', () => {
    if (bgVideo.paused) bgVideo.play();
    else bgVideo.pause();
});
bgVideo.addEventListener('play', updateVideoToggle);
bgVideo.addEventListener('pause', updateVideoToggle);

/**
 * 9. TEXTO VIBRANTE DEL FOOTER (components/fuzzytext)
 *    Se espera medio segundo para que estén las fuentes y los estilos antes de dibujarlo.
 *    Con movimiento reducido se dibuja quieto (intensidad 0).
 */
setTimeout(() => {
    const k = reduceMotion ? 0 : 1;
    new FuzzyText(document.querySelector('.footer-cta__lead'), { baseIntensity: 0.1 * k, hoverIntensity: 0.4 * k });
    new FuzzyText(document.querySelector('.footer-cta__link'), { baseIntensity: 0.15 * k, hoverIntensity: 0.6 * k });
}, 500);

/**
 * 10. INIT DE COMPONENTES (Menú, Logo Wall)
 */
new StaggeredMenu('#main-menu');
new LogoWall('.logo-wall');
