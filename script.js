/**
 * PARALLAX DEL HERO
 *    Al scrollear, cada texto del hero se mueve a su propia velocidad (el data-speed del HTML).
 */
const elementosParallax = document.querySelectorAll('.parallax');

window.addEventListener('scroll', () => {
    elementosParallax.forEach((elemento) => {
        const velocidad = elemento.dataset.speed;
        elemento.style.transform = `translateY(${window.scrollY * velocidad}px)`;
    });
});
