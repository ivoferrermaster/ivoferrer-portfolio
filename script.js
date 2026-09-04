/**
 * 0. PRELOADER & ENTRANCE ANIMATION
 */
document.addEventListener("DOMContentLoaded", () => {
    const preloaderBar = document.getElementById('preloader-bar');
    const preloaderPercentage = document.getElementById('preloader-percentage');
    const preloader = document.getElementById('preloader');
    
    // 1. Preparar las letras del Hero dividiéndolas en spans
    const heroTexts = document.querySelectorAll('.hero-content > *');
    let allLetters = [];
    
    heroTexts.forEach(el => {
        let newHtml = '';
        el.childNodes.forEach(node => {
            if(node.nodeType === 3) { // Si es texto puro
                const text = node.textContent;
                for(let i=0; i<text.length; i++) {
                    if(text[i].trim() === '') {
                        newHtml += text[i]; // Mantiene espacios
                    } else {
                        newHtml += `<span class="rand-letter">${text[i]}</span>`;
                    }
                }
            } else {
                newHtml += node.outerHTML || ''; // Mantiene etiquetas como <br>
            }
        });
        el.innerHTML = newHtml;
    });
    
    // Guardamos todas las letras ocultas en un array
    allLetters = Array.from(document.querySelectorAll('.rand-letter'));

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

                // 2. Lógica para revelar letras de a 2 aleatoriamente
                const revealInterval = setInterval(() => {
                    for(let i = 0; i < 1; i++) {
                        if(allLetters.length === 0) {
                            clearInterval(revealInterval);
                            break;
                        }
                        // Selecciona un índice al azar, lo extrae del array y lo revela
                        const randomIndex = Math.floor(Math.random() * allLetters.length);
                        const letter = allLetters.splice(randomIndex, 1)[0];
                        letter.classList.add('revealed');
                    }
                }, 35); // Velocidad: Aparecen 2 letras cada 35 milisegundos

                setTimeout(() => {
                    document.body.classList.remove('loading');
                    preloader.remove();
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
    currentScrollY += (targetScrollY - currentScrollY) * ease;
    scrollWrapper.style.transform = `translate3d(0, -${currentScrollY}px, 0)`;

    parallaxElements.forEach(el => {
        const speed = parseFloat(el.getAttribute('data-speed'));
        const yPos = currentScrollY * speed;
        el.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });

    requestAnimationFrame(updateScroll);
}

updateScroll();


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

document.querySelectorAll('button, a, .project-card, .service-row, .insight-card').forEach(el => {
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
    if (!isMouseInFooter) return;

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
 * 6. FAQ ACCORDION
 */
const faqItems = document.querySelectorAll('.faq-question');
faqItems.forEach(item => {
    item.addEventListener('click', function() {
        const answer = this.nextElementSibling;
        const isOpen = answer.style.maxHeight;

        document.querySelectorAll('.faq-answer').forEach(ans => ans.style.maxHeight = null);
        document.querySelectorAll('.faq-question .icon').forEach(icon => icon.textContent = '+');

        if (!isOpen) {
            answer.style.maxHeight = answer.scrollHeight + "px";
            this.querySelector('.icon').textContent = '-';
        }
    });
});

/**
 * 7. COUNTER ANIMATION (STATS)
 */
const statCounters = document.querySelectorAll('.stat-number');
const animationDuration = 2000; // 2 segundos de animación

const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counterElement = entry.target;
            const targetValue = parseInt(counterElement.getAttribute('data-target'));
            
            let startTimestamp = null;
            
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                // Calculamos el progreso (de 0 a 1)
                const progress = Math.min((timestamp - startTimestamp) / animationDuration, 1);
                
                // Función de aceleración/desaceleración (ease-out) para que el final sea suave
                const easeOutProgress = 1 - Math.pow(1 - progress, 4);
                
                // Actualizamos el número en el HTML
                counterElement.innerText = Math.floor(easeOutProgress * targetValue);
                
                // Si no hemos terminado, pedimos el siguiente frame
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    counterElement.innerText = targetValue; // Aseguramos el número final exacto
                }
            };
            
            window.requestAnimationFrame(step);
            
            // Dejamos de observar para que la animación solo ocurra la primera vez que se hace scroll
            observer.unobserve(counterElement); 
        }
    });
}, { threshold: 0.5 }); // El 50% del contenedor debe estar visible para que inicie

statCounters.forEach(counter => {
    counterObserver.observe(counter);
});