/* components/work-views/WorkViews.js
   Vistas secundarias de /trabajo, con rutas por hash (sin recargar la página):
     #/proyectos        → listado "Todos los proyectos"
     #/proyecto/<slug>  → ficha del proyecto
     (otra cosa)        → el carrusel
   Mientras hay una vista abierta el carrusel queda `inert` (fuera del foco y de los lectores de pantalla). */
(() => {
    const mod = (n, m) => ((n % m) + m) % m;

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };

    class WorkViews {
        constructor({ projects, carousel, host, closeLink, allLink, baseTitle }) {
            this.projects = projects;
            this.carousel = carousel;
            this.host = host;
            this.closeLink = closeLink;
            this.allLink = allLink;
            this.baseTitle = baseTitle || document.title;
            this.current = null;      // 'overview' | 'detail' | null
            this.cameFrom = null;
            this.firstRoute = true;

            this.buildOverview();
            this.buildDetail();

            window.addEventListener('hashchange', () => this.route());
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.current && !e.defaultPrevented && !this.menuOpen()) {
                    window.location.hash = '#/';
                }
            });
            this.route();
        }

        menuOpen() {
            const menu = document.getElementById('main-menu');
            return !!menu && !menu.inert;
        }

        /* ---------- Listado ---------- */

        buildOverview() {
            const sec = el('section', 'work-view work-overview');
            sec.id = 'work-overview';
            sec.hidden = true;
            sec.tabIndex = -1;
            sec.setAttribute('aria-labelledby', 'work-overview-title');

            const head = el('header', 'work-overview__head');
            const title = el('h2', 'work-overview__title', 'Todos los proyectos');
            title.id = 'work-overview-title';
            head.append(el('p', 'work-eyebrow', 'Portfolio'), title);

            const list = el('ul', 'work-overview__list');
            this.projects.forEach((p) => {
                const li = el('li');
                const a = el('a', 'work-card');
                a.href = '#/proyecto/' + p.slug;
                const img = el('img', 'work-card__img');
                img.src = p.poster;
                img.alt = '';
                img.loading = 'lazy';
                img.decoding = 'async';
                a.append(img, el('h3', 'work-card__title', p.titulo), el('p', 'work-card__client', p.cliente));
                li.append(a);
                list.append(li);
            });

            sec.append(head, list);
            this.host.append(sec);
            this.overview = sec;
        }

        /* ---------- Ficha ---------- */

        buildDetail() {
            const art = el('article', 'work-view work-detail');
            art.id = 'work-detail';
            art.hidden = true;
            art.tabIndex = -1;
            art.setAttribute('aria-labelledby', 'work-detail-title');

            this.dTitle = el('h2', 'work-detail__title');
            this.dTitle.id = 'work-detail-title';
            this.dLead = el('p', 'work-detail__lead');
            this.dMeta = el('dl', 'work-detail__meta');
            this.dCta = el('p', 'work-detail__cta');
            this.dMedia = el('figure', 'work-detail__media');
            this.dImg = el('img');
            this.dMedia.append(this.dImg);

            // Anterior / siguiente: flechas verticales a los costados, como la referencia
            this.dPrev = el('a', 'work-pn work-pn--prev');
            this.dPrev.rel = 'prev';
            this.dNext = el('a', 'work-pn work-pn--next');
            this.dNext.rel = 'next';
            this.dPrevText = el('span', 'visually-hidden');
            this.dNextText = el('span', 'visually-hidden');
            this.dPrev.append(this.dPrevText);
            this.dNext.append(this.dNextText);

            art.append(this.dTitle, this.dLead, this.dMeta, this.dCta, this.dMedia, this.dPrev, this.dNext);

            this.host.append(art);
            this.detail = art;
        }

        renderDetail(index) {
            const p = this.projects[index];
            const n = this.projects.length;
            const prev = this.projects[mod(index - 1, n)];
            const next = this.projects[mod(index + 1, n)];

            this.dTitle.textContent = p.titulo;
            this.dLead.textContent = p.descripcion || '';

            // Metadatos: solo se muestran los campos que existen
            this.dMeta.replaceChildren();
            const addMeta = (label, value) => {
                if (!value) return;
                const group = el('div');
                group.append(el('dt', '', label), el('dd', '', value));
                this.dMeta.append(group);
            };
            addMeta('Cliente', p.cliente);
            addMeta('Rol', p.rol);
            addMeta('Año', p.anio);
            this.dCta.replaceChildren();
            if (p.url) {
                const a = el('a', 'work-btn', 'Visitar sitio');
                a.href = p.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.setAttribute('aria-label', `Visitar el sitio de ${p.titulo} (se abre en una pestaña nueva)`);
                this.dCta.append(a);
            }

            this.dImg.src = p.poster;
            this.dImg.alt = `Captura de pantalla del sitio web de ${p.cliente}`;

            this.dPrev.href = '#/proyecto/' + prev.slug;
            this.dNext.href = '#/proyecto/' + next.slug;
            this.dPrevText.textContent = `Proyecto anterior: ${prev.titulo}`;
            this.dNextText.textContent = `Proyecto siguiente: ${next.titulo}`;
        }

        /* ---------- Rutas ---------- */

        route() {
            const hash = window.location.hash;
            let view = null;
            let index = -1;

            if (hash === '#/proyectos') {
                view = 'overview';
            } else if (hash.startsWith('#/proyecto/')) {
                index = this.projects.findIndex((p) => p.slug === hash.slice('#/proyecto/'.length));
                if (index !== -1) view = 'detail';
            }

            const previous = this.current;
            this.current = view;
            const open = view !== null;

            this.overview.hidden = view !== 'overview';
            this.detail.hidden = view !== 'detail';
            this.carousel.inert = open;
            if (this.allLink) this.allLink.closest('.work-all').inert = open;
            document.body.classList.toggle('has-view', open);

            if (this.closeLink) {
                this.closeLink.hidden = !open;
                this.closeLink.textContent = view === 'detail' ? 'Cerrar proyecto' : 'Cerrar proyectos';
            }

            if (view === 'detail') {
                this.renderDetail(index);
                document.title = `${this.projects[index].titulo} · ${this.baseTitle}`;
            } else if (view === 'overview') {
                document.title = `Todos los proyectos · ${this.baseTitle}`;
            } else {
                document.title = this.baseTitle;
            }

            const shown = view === 'detail' ? this.detail : view === 'overview' ? this.overview : null;
            if (shown) {
                shown.scrollTop = 0;
                if (previous === null) this.cameFrom = this.lastTrigger();
                shown.focus({ preventScroll: true });
            } else if (previous !== null && !this.firstRoute) {
                // Al volver, el foco regresa a donde estaba antes de abrir la vista
                const target = this.cameFrom === 'overview' && this.allLink
                    ? this.allLink
                    : this.carousel.querySelector('.work-item.is-active a');
                if (target) target.focus({ preventScroll: true });
            }
            this.firstRoute = false;
        }

        /* Desde dónde se abrió la vista: el enlace "Ver todos" o el carrusel */
        lastTrigger() {
            return document.activeElement === this.allLink ? 'overview' : 'carousel';
        }
    }

    window.WorkViews = WorkViews;
})();
