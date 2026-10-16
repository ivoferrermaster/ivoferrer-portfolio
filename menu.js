/* menu.js — menú lateral (lo usan las dos páginas).
   El botón del header le pone o le saca la clase "abierto" al menú.
   La animación de entrada está en base.css. */
const botonMenu = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
const linksMenu = document.querySelectorAll('.menu a');

botonMenu.addEventListener('click', () => {
    menu.classList.toggle('abierto');
});

// Al elegir una sección, el menú se cierra
linksMenu.forEach((link) => {
    link.addEventListener('click', () => {
        menu.classList.remove('abierto');
    });
});
