/* components/sidemenu/SideMenu.js
   Menú lateral. El botón del header abre y cierra el panel: el JS solo pone o saca la clase
   is-open y todas las animaciones están en side-menu.css.
   Mientras está abierto: la página no scrollea, el resto de la página queda inert (el Tab no
   sale del menú), Escape lo cierra y un clic afuera del panel también.

   Marcado necesario: un button.menu-toggle (con .menu-toggle__text adentro) cuyo
   aria-controls apunta al id del menú, y el menú (.side-menu, con el atributo inert) con su
   .side-menu__panel y los .side-menu__link. Ver index.html. */
class SideMenu {
    constructor(selector) {
        this.menu = document.querySelector(selector);
        this.toggle = document.querySelector(`.menu-toggle[aria-controls="${this.menu.id}"]`);
        this.toggleText = this.toggle.querySelector('.menu-toggle__text');
        this.header = this.toggle.closest('header');
        this.links = Array.from(this.menu.querySelectorAll('.side-menu__link'));
        this.isOpen = false;

        // El índice de cada enlace alimenta su retraso escalonado en el CSS
        this.links.forEach((link, i) => link.style.setProperty('--i', i));

        this.bindEvents();
    }

    setOpen(open) {
        this.isOpen = open;
        this.menu.classList.toggle('is-open', open);
        this.menu.inert = !open;
        this.toggle.setAttribute('aria-expanded', String(open));
        this.toggleText.textContent = open ? 'Cerrar' : 'Menu';

        // Bloquea el scroll de la página mientras el menú está abierto
        document.documentElement.style.overflow = open ? 'hidden' : '';

        // Todo lo que no es el header ni el menú queda fuera del Tab y de los lectores de pantalla
        Array.from(document.body.children).forEach((el) => {
            if (el !== this.header && el !== this.menu) el.inert = open;
        });
    }

    bindEvents() {
        this.toggle.addEventListener('click', () => {
            this.setOpen(!this.isOpen);
            // Al abrir, el foco pasa al primer enlace del menú
            if (this.isOpen) this.links[0].focus({ preventScroll: true });
        });

        // Elegir un enlace cierra el menú
        this.links.forEach((link) => {
            link.addEventListener('click', () => this.setOpen(false));
        });

        // Un clic en el fondo oscuro (afuera del panel) también lo cierra
        this.menu.addEventListener('click', (e) => {
            if (e.target === this.menu) this.setOpen(false);
        });

        // Escape cierra y devuelve el foco al botón
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !this.isOpen) return;
            e.preventDefault(); // así la ficha de /trabajo no se cierra con la misma tecla
            this.setOpen(false);
            this.toggle.focus({ preventScroll: true });
        });
    }
}
