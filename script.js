/**
 * TRABAJO SELECCIONADO
 *    Las filas de la lista se arman con los proyectos de data/proyectos.js (los mismos que muestra
 *    trabajo.html).
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
    <li>
        <a href="trabajo.html#/proyecto/${project.slug}">
            <span class="projects-list__title">${project.titulo}</span>
            <span class="projects-list__client">${splitLetters(project.cliente)}</span>
            <img class="projects-list__thumb" src="${project.poster}" alt="" loading="lazy" decoding="async">
        </a>
    </li>`).join('');

/**
 * PRELOADER
 *    Cuando termina de cargar toda la página, se le pone la clase "oculto" y desaparece.
 */
window.addEventListener('load', () => {
    document.querySelector('.preloader').classList.add('oculto');
});
