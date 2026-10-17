/**
 * 1. LETRAS DEL HERO
 *    Cada letra de los textos con la clase "letras" se mete en su propio <span class="letra">,
 *    así después se pueden hacer aparecer de a una.
 */
const textosHero = document.querySelectorAll('.letras');

textosHero.forEach((texto) => {
    const letras = texto.textContent.split('');
    texto.textContent = '';

    letras.forEach((letra) => {
        // Los espacios quedan como texto común (un <span> con un espacio adentro no ocupa lugar)
        if (letra === ' ') {
            texto.append(' ');
            return;
        }
        const span = document.createElement('span');
        span.classList.add('letra');
        span.textContent = letra;
        texto.append(span);
    });
});

// Muestra una letra cada 35 milisegundos, elegida al azar, hasta que no quede ninguna
function mostrarLetras() {
    const letrasOcultas = Array.from(document.querySelectorAll('.letra'));

    const intervalo = setInterval(() => {
        if (letrasOcultas.length === 0) {
            clearInterval(intervalo);
            return;
        }
        const azar = Math.floor(Math.random() * letrasOcultas.length);
        letrasOcultas[azar].classList.add('visible');
        letrasOcultas.splice(azar, 1); // se saca de la lista para no elegirla de nuevo
    }, 35);
}

/**
 * 2. PRELOADER Y ENTRADA DEL HERO
 *    Cuando termina de cargar toda la página se va el preloader y arranca la entrada del hero
 *    (la clase start-anim dispara el panel violeta y las transiciones de style.css).
 */
window.addEventListener('load', () => {
    document.querySelector('.preloader').classList.add('oculto');
    document.body.classList.add('start-anim');
    mostrarLetras();
});

/**
 * 3. PARALLAX
 *    Al scrollear, cada texto del hero se mueve a su propia velocidad (el data-speed del HTML).
 */
const elementosParallax = document.querySelectorAll('.parallax');

window.addEventListener('scroll', () => {
    elementosParallax.forEach((elemento) => {
        const velocidad = elemento.dataset.speed;
        elemento.style.transform = `translateY(${window.scrollY * velocidad}px)`;
    });
});
