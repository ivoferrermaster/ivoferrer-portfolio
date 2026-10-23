/* PARALLAX DEL HERO */
const elementosParallax = document.querySelectorAll('.parallax');

window.addEventListener('scroll', () => {
    elementosParallax.forEach((elemento) => {
        const velocidad = elemento.dataset.speed;
        elemento.style.transform = `translateY(${window.scrollY * velocidad}px)`;
    });
});
