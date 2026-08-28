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

// Implementación de ResizeObserver para recalcular dinámicamente la altura 
// durante las animaciones fluidas (como el hover de las cards de servicios)
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
