/**
 * PREFERENCIA DE MOVIMIENTO REDUCIDO
 */
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = reduceMotionQuery.matches;
reduceMotionQuery.addEventListener('change', (e) => reduceMotion = e.matches);

/**
 * 0. PRELOADER & ENTRANCE ANIMATION
 */
document.addEventListener("DOMContentLoaded", () => {
    const preloaderBar = document.getElementById('preloader-bar');
    const preloaderPercentage = document.getElementById('preloader-percentage');
    const preloader = document.getElementById('preloader');

    // 1. Preparar las letras del Hero dividiéndolas en spans.
    //    El texto completo queda en un span oculto para lectores de pantalla
    //    y las letras sueltas se marcan aria-hidden para que no se lean de a una.
    const heroTexts = document.querySelectorAll('.hero-content > *');

    heroTexts.forEach(el => {
        const srText = document.createElement('span');
        srText.className = 'visually-hidden';
        const visual = document.createElement('span');
        visual.setAttribute('aria-hidden', 'true');

        el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                srText.append(node.textContent);
                for (const char of node.textContent) {
                    if (char.trim() === '') {
                        visual.append(char); // Mantiene espacios
                    } else {
                        const letter = document.createElement('span');
                        letter.className = 'rand-letter';
                        letter.textContent = char;
                        visual.append(letter);
                    }
                }
            } else {
                srText.append(' ');
                visual.append(node.cloneNode(true)); // Mantiene etiquetas como <br>
            }
        });
        el.replaceChildren(srText, visual);
    });

    // Guardamos todas las letras ocultas en un array
    const allLetters = Array.from(document.querySelectorAll('.rand-letter'));

    if (!preloaderBar || !preloaderPercentage || !preloader) return;

    let progress = 0;

    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 8) + 4;

        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);

            preloaderBar.style.width = `100%`;
            preloaderPercentage.innerText = `100%`;

            setTimeout(() => {
                preloader.classList.add('loaded');
                document.body.classList.add('start-anim');

                // 2. Revela las letras de a una, en orden aleatorio
                const revealInterval = setInterval(() => {
                    if (allLetters.length === 0) {
                        clearInterval(revealInterval);
                        return;
                    }
                    const randomIndex = Math.floor(Math.random() * allLetters.length);
                    const letter = allLetters.splice(randomIndex, 1)[0];
                    letter.classList.add('revealed');
                }, 35);

                setTimeout(() => {
                    document.body.classList.remove('loading');
                    preloader.remove();

                    // Si se entró con un #ancla en la URL, se respeta ahora que se puede hacer scroll
                    const initialTarget = location.hash && document.getElementById(location.hash.slice(1));
                    if (initialTarget) scrollToElement(initialTarget);
                }, 3000);
            }, 400);
        } else {
            preloaderBar.style.width = `${progress}%`;
            preloaderPercentage.innerText = `${progress}%`;
        }
    }, 120);
});

/**
 * 1. SMOOTH SCROLL & PARALLAX
 */
const body = document.body;
const scrollWrapper = document.getElementById('scroll-wrapper');
const siteHeader = document.querySelector('.site-header');
const parallaxElements = document.querySelectorAll('.parallax');

let currentScrollY = 0;
let targetScrollY = 0;
const ease = 0.08;

function setBodyHeight() {
    body.style.height = `${scrollWrapper.getBoundingClientRect().height}px`;
}

window.addEventListener('load', setBodyHeight);
window.addEventListener('resize', setBodyHeight);

const resizeObserver = new ResizeObserver(() => {
    setBodyHeight();
});
resizeObserver.observe(scrollWrapper);

window.addEventListener('scroll', () => {
    targetScrollY = window.scrollY;
});

function updateScroll() {
    // Con movimiento reducido el desplazamiento es inmediato y sin parallax
    currentScrollY += (targetScrollY - currentScrollY) * (reduceMotion ? 1 : ease);
    scrollWrapper.style.transform = `translate3d(0, -${currentScrollY}px, 0)`;

    parallaxElements.forEach(el => {
        const speed = reduceMotion ? 0 : parseFloat(el.getAttribute('data-speed'));
        const yPos = currentScrollY * speed;
        el.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });

    requestAnimationFrame(updateScroll);
}

updateScroll();

/**
 * 1.1 NAVEGACIÓN ACCESIBLE CON EL SCROLL VIRTUAL
 * Como #scroll-wrapper es fijo, el navegador no puede desplazarse solo hacia
 * los #anclas ni hacia el elemento enfocado con Tab: lo resolvemos a mano.
 */
let skipFocusScroll = false;

// Posición del elemento dentro del documento (independiente del scroll actual)
function getDocumentTop(el) {
    return el.getBoundingClientRect().top + currentScrollY;
}

function scrollToElement(el, offset = 0) {
    const top = Math.max(0, getDocumentTop(el) - offset);
    window.scrollTo(0, top);
    targetScrollY = window.scrollY;
}

document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    scrollToElement(target);

    // Movemos el foco al destino para que Tab continúe desde ahí
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    skipFocusScroll = true;
    target.focus({ preventScroll: true });
    skipFocusScroll = false;

    history.pushState(null, '', `#${id}`);
});

// Mantiene visible el elemento que recibe el foco al tabular
document.addEventListener('focusin', (e) => {
    if (skipFocusScroll || !scrollWrapper.contains(e.target)) return;

    const rect = e.target.getBoundingClientRect();
    const docTop = rect.top + currentScrollY;
    const viewTop = docTop - window.scrollY;
    const headerHeight = siteHeader ? siteHeader.offsetHeight : 0;

    if (viewTop < headerHeight || viewTop + rect.height > window.innerHeight) {
        window.scrollTo(0, Math.max(0, docTop - window.innerHeight / 3));
        targetScrollY = window.scrollY;
    }
});

/**
 * 2. CUSTOM CURSOR & DYNAMIC UPDATES
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
    el.addEventListener('mouseenter', () => {
        cursor.classList.add('hover-active');
    });
    el.addEventListener('mouseleave', () => {
        cursor.classList.remove('hover-active');
    });
});

/**
 * 3. IMAGE TRAIL EFFECT (FOOTER)
 */
const trailContainer = document.getElementById('trail-container');
const footer = document.querySelector('.footer');

let lastMouseX = 0;
let lastMouseY = 0;
let imageIndex = 0;
let isMouseInFooter = false;

const images = [
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500'
];

footer.addEventListener('mouseenter', () => isMouseInFooter = true);
footer.addEventListener('mouseleave', () => isMouseInFooter = false);

window.addEventListener('mousemove', (e) => {
    if (!isMouseInFooter || reduceMotion) return;

    const distance = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY);
    if (distance > 100) {
        createTrailImage(e.clientX, e.clientY + currentScrollY);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

function createTrailImage(x, y) {
    const img = document.createElement('img');
    img.src = images[imageIndex % images.length];
    img.alt = '';
    img.classList.add('trail-img');
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    trailContainer.appendChild(img);
    imageIndex++;

    setTimeout(() => {
        img.style.opacity = '0';
        img.style.transform = 'translate(-50%, -50%) scale(0.5)';
        setTimeout(() => { img.remove(); }, 800);
    }, 100);
}

/**
 * 4. INTERSECTION OBSERVER ANIMATIONS
 */
const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible-element');
            entry.target.classList.remove('hidden-element');
            obs.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.hidden-element').forEach(el => {
    observer.observe(el);
});

/**
 * 5. MAGNETIC BUTTONS
 */
document.querySelectorAll('.magnetic-btn').forEach(magBtn => {
    const magText = magBtn.querySelector('.btn-text');

    magBtn.addEventListener('mousemove', (e) => {
        if (reduceMotion) return;
        const rect = magBtn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distX = e.clientX - centerX;
        const distY = e.clientY - centerY;

        magBtn.style.transform = `translate3d(${distX * 0.3}px, ${distY * 0.3}px, 0)`;
        if (magText) magText.style.transform = `translate3d(${distX * 0.2}px, ${distY * 0.2}px, 0)`;
    });

    magBtn.addEventListener('mouseleave', () => {
        magBtn.style.transform = `translate3d(0, 0, 0)`;
        if (magText) magText.style.transform = `translate3d(0, 0, 0)`;
    });
});

/**
 * 6. SERVICIOS (desplegables con teclado, click o tap)
 */
document.querySelectorAll('.service-row__toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isOpen));
        toggle.closest('.service-row').classList.toggle('is-open', !isOpen);
    });
});

/**
 * 7. FAQ ACCORDION
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
 * 8. COUNTER ANIMATION (STATS)
 * Los números animados son aria-hidden: el valor real está en un texto oculto.
 */
const statCounters = document.querySelectorAll('.stat-number');
const animationDuration = 2000; // 2 segundos de animación

const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counterElement = entry.target;
            const targetValue = parseInt(counterElement.getAttribute('data-target'));

            if (reduceMotion) {
                counterElement.innerText = targetValue;
                observer.unobserve(counterElement);
                return;
            }

            let startTimestamp = null;

            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                // Progreso de 0 a 1 con ease-out para que el final sea suave
                const progress = Math.min((timestamp - startTimestamp) / animationDuration, 1);
                const easeOutProgress = 1 - Math.pow(1 - progress, 4);

                counterElement.innerText = Math.floor(easeOutProgress * targetValue);

                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    counterElement.innerText = targetValue; // Aseguramos el número final exacto
                }
            };

            window.requestAnimationFrame(step);

            // La animación solo ocurre la primera vez que se hace scroll
            observer.unobserve(counterElement);
        }
    });
}, { threshold: 0.5 });

statCounters.forEach(counter => {
    counterObserver.observe(counter);
});

/**
 * 9. VIDEO DE FONDO: control de pausa (WCAG 2.2.2)
 */
const bgVideo = document.querySelector('.video-break__media');
const videoToggle = document.querySelector('.video-break__toggle');

function updateVideoToggle() {
    videoToggle.textContent = bgVideo.paused ? 'Reproducir video de fondo' : 'Pausar video de fondo';
}

if (bgVideo && videoToggle) {
    if (reduceMotion) {
        bgVideo.removeAttribute('autoplay');
        bgVideo.pause();
    }
    updateVideoToggle();

    videoToggle.addEventListener('click', () => {
        if (bgVideo.paused) {
            bgVideo.play();
        } else {
            bgVideo.pause();
        }
    });
    bgVideo.addEventListener('play', updateVideoToggle);
    bgVideo.addEventListener('pause', updateVideoToggle);
}

/**
 * 10. FUZZY TEXT (FOOTER)
 */
document.addEventListener("DOMContentLoaded", () => {
    // Retrasamos 500ms para asegurar que el DOM, las fuentes (Moul/Work Sans)
    // y los estilos responsivos estén cargados antes de capturarlos en Canvas.
    setTimeout(() => {
        const leadText = document.querySelector('.footer-cta__lead');
        const linkText = document.querySelector('.footer-cta__link');
        const still = reduceMotion ? { baseIntensity: 0, hoverIntensity: 0 } : null;

        if (leadText) new FuzzyText(leadText, still || { baseIntensity: 0.1, hoverIntensity: 0.4 });
        if (linkText) new FuzzyText(linkText, still || { baseIntensity: 0.15, hoverIntensity: 0.6 });
    }, 500);
});

/**
 * 11. INIT DE COMPONENTES (Menú, Logo Wall)
 */
document.addEventListener("DOMContentLoaded", () => {
    new StaggeredMenu('#main-menu');
    new LogoWall('.logo-wall');
});
