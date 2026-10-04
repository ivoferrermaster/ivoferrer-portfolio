/* components/work-views/WorkViews.js
   Ficha de proyecto en /trabajo, con rutas por hash (sin recargar la página):
     #/proyecto/<slug>  → se abre la ficha encima del carrusel
     (otra cosa)        → solo el carrusel
   El HTML de la ficha está en trabajo.html; acá se completa con los datos y se muestra u oculta.
   Mientras está abierta el carrusel queda `inert` (fuera del foco y de los lectores de pantalla). */
class WorkViews {
    constructor(projects) {
        this.projects = projects;
        this.baseTitle = document.title;
        this.isOpen = false;

        this.carousel = document.getElementById('work-carousel');
        this.closeLink = document.querySelector('.work-close');
        this.detail = document.getElementById('work-detail');

        window.addEventListener('hashchange', () => this.route());

        // Escape cierra la ficha (salvo que el menú esté abierto)
        document.addEventListener('keydown', (e) => {
            const menuOpen = !document.getElementById('main-menu').inert;
            if (e.key === 'Escape' && this.isOpen && !e.defaultPrevented && !menuOpen) {
                window.location.hash = '#/';
            }
        });

        this.route();
    }

    renderDetail(index) {
        const n = this.projects.length;
        const p = this.projects[index];
        const prev = this.projects[(index - 1 + n) % n];
        const next = this.projects[(index + 1) % n];
        const find = (selector) => this.detail.querySelector(selector);

        find('.work-detail__title').textContent = p.titulo;
        find('.work-detail__lead').textContent = p.descripcion;

        // "Año" y el botón "Visitar sitio" solo aparecen si el proyecto tiene esos datos
        find('.work-detail__meta').innerHTML = `
            <div><dt>Cliente</dt><dd>${p.cliente}</dd></div>
            <div><dt>Rol</dt><dd>${p.rol}</dd></div>
            ${p.anio ? `<div><dt>Año</dt><dd>${p.anio}</dd></div>` : ''}`;

        find('.work-detail__cta').innerHTML = p.url
            ? `<a class="work-btn" href="${p.url}" target="_blank" rel="noopener noreferrer"
                  aria-label="Visitar el sitio de ${p.titulo} (se abre en una pestaña nueva)">Visitar sitio</a>`
            : '';

        const img = find('.work-detail__media img');
        img.src = p.poster;
        img.alt = `Captura de pantalla del sitio web de ${p.cliente}`;

        const prevLink = find('.work-pn--prev');
        prevLink.href = '#/proyecto/' + prev.slug;
        prevLink.firstElementChild.textContent = `Proyecto anterior: ${prev.titulo}`;

        const nextLink = find('.work-pn--next');
        nextLink.href = '#/proyecto/' + next.slug;
        nextLink.firstElementChild.textContent = `Proyecto siguiente: ${next.titulo}`;
    }

    route() {
        const index = this.projects.findIndex((p) => window.location.hash === '#/proyecto/' + p.slug);
        const wasOpen = this.isOpen;
        this.isOpen = index !== -1;

        this.detail.hidden = !this.isOpen;
        this.carousel.inert = this.isOpen;
        this.closeLink.hidden = !this.isOpen;

        if (this.isOpen) {
            this.renderDetail(index);
            document.title = `${this.projects[index].titulo} · ${this.baseTitle}`;
            this.detail.scrollTop = 0;
            this.detail.focus({ preventScroll: true });
        } else {
            document.title = this.baseTitle;
            // Al cerrar, el foco vuelve al título activo del carrusel
            if (wasOpen) this.carousel.querySelector('.work-item.is-active a').focus({ preventScroll: true });
        }
    }
}
