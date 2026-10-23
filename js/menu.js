const botonMenu = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
const linksMenu = document.querySelectorAll('.menu a');

botonMenu.addEventListener('click', () => {
    menu.classList.toggle('abierto');
});

linksMenu.forEach((link) => {
    link.addEventListener('click', () => {
        menu.classList.remove('abierto');
    });
});