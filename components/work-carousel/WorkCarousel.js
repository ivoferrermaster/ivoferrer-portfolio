/* components/work-carousel/WorkCarousel.js
   Carrusel horizontal de proyectos (vista /trabajo).
   - Un póster fijo y centrado; la tira de títulos es la que se desplaza (loop infinito).
   - En reposo los títulos vecinos solo "asoman" por los bordes; al arrastrar se juntan
     y el póster retrocede en Z. Al soltar, se acomoda en el proyecto más cercano.
   - Control: arrastre, flechas del teclado, rueda, botones y toque. */

// Ajustes del carrusel (las fracciones son del ancho de la pantalla)
const PEEK = 0.045;        // cuánto asoma el título vecino por el borde en reposo
const DRAG_REACH = 0.208;  // distancia del centro al título vecino mientras se arrastra
const GAP_EXTRA = 0.08;    // aire extra entre títulos que no son vecinos directos
const TILT = 3.2;          // inclinación 3D máxima del póster, en grados
const DEPTH = 26;          // cuánto retrocede el póster al arrastrar, en px
const MAX_THROW = 2;       // cuántos proyectos puede "lanzar" un arrastre rápido

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
// Resto siempre positivo (mod(-1, 4) = 3): sirve para dar la vuelta al loop
const mod = (n, m) => ((n % m) + m) % m;

const createEl = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

/* Efecto de texto: mientras el carrusel se mueve, el título se dibuja en un canvas cortado en
   franjas horizontales que ondulan según la velocidad (el título "se derrite"). El texto real
   sigue en el DOM: solo se vuelve transparente mientras dura el efecto. */
class TitleFx {
    constructor(h2, link) {
        this.h2 = h2;
        this.link = link;
        this.canvas = createEl('canvas', 'work-fx');
        this.canvas.setAttribute('aria-hidden', 'true');
        this.ctx = this.canvas.getContext('2d');
        this.src = document.createElement('canvas'); // el título limpio, dibujado una sola vez
        h2.append(this.canvas);
    }

    resize() {
        const w = this.h2.offsetWidth;
        const h = this.h2.offsetHeight;
        if (!w || !h) return;

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        this.w = w;
        this.h = h;
        this.dpr = dpr;
        this.canvas.width = this.src.width = Math.ceil(w * dpr);
        this.canvas.height = this.src.height = Math.ceil(h * dpr);

        // Se copia la tipografía del enlace y se centra el texto en vertical
        const style = getComputedStyle(this.link);
        const s = this.src.getContext('2d');
        s.setTransform(dpr, 0, 0, dpr, 0, 0);
        s.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        s.letterSpacing = style.letterSpacing;
        s.fillStyle = '#fff';
        s.textBaseline = 'alphabetic';
        const m = s.measureText('Mg');
        const ascent = m.fontBoundingBoxAscent;
        const descent = m.fontBoundingBoxDescent;
        const padLeft = parseFloat(getComputedStyle(this.h2).paddingLeft) || 0;
        s.fillText(this.link.textContent, padLeft, (h - (ascent + descent)) / 2 + ascent);
    }

    // level: intensidad del efecto, de 0 a 1
    draw(level) {
        if (!this.w) return;
        this.h2.classList.add('has-fx');

        const { ctx, w, h, dpr } = this;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const slice = 2; // alto de cada franja, en px
        const shift = level * h * 0.17;
        const t = performance.now() / 90;
        for (let y = 0; y < h; y += slice) {
            const dx = Math.sin(y * 0.09 + t) * shift;
            ctx.drawImage(this.src, 0, y * dpr, this.src.width, slice * dpr, dx, y, w, slice);
        }
    }

    clear() {
        if (!this.h2.classList.contains('has-fx')) return;
        this.h2.classList.remove('has-fx');
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class WorkCarousel {
    constructor(root, projects) {
        this.root = root;
        this.projects = projects;
        this.n = projects.length;
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Cada valor animado tiene su "objetivo": en cada frame se acerca un poco a él.
        // pos/target están en proyectos (1.0 = un proyecto).
        this.pos = 0;
        this.target = 0;
        this.drag = 0;           // 0 = reposo, 1 = arrastrando
        this.dragTarget = 0;
        this.tilt = { x: 0, y: 0, tx: 0, ty: 0 };
        this.fxLevel = 0;        // intensidad del efecto de texto
        this.active = 0;
        this.raf = null;
        this.lastTime = 0;

        // Puntero
        this.pressed = false;
        this.dragging = false;
        this.away = false;       // póster oculto mientras se arrastra
        this.startX = 0;
        this.lastX = 0;
        this.lastMoveTime = 0;
        this.velocity = 0;
        this.downTarget = null;

        // Rueda
        this.wheelAcc = 0;
        this.wheelTime = 0;
        this.wheelStepTime = 0;

        this.vw = window.innerWidth;
        this.widths = [];    // ancho de cada título
        this.offsets = [];   // posición horizontal de cada título

        this.tick = this.tick.bind(this);

        this.build();
        this.bindEvents();
        this.measure();
        this.setActive(0);
        this.render();

        // Los anchos de los títulos dependen de la fuente: se miden de nuevo cuando carga
        document.fonts.ready.then(() => {
            this.measure();
            this.render();
            this.root.classList.add('is-ready');
        });
    }

    /* ---------- DOM ---------- */

    build() {
        // Póster: una imagen por proyecto, solo se ve la activa (decorativo para lectores de pantalla)
        this.poster = createEl('figure', 'work-poster');
        this.poster.setAttribute('aria-hidden', 'true');
        this.posters = this.projects.map((p) => {
            const img = createEl('img', 'work-poster__img');
            img.src = p.poster;
            img.alt = '';
            img.draggable = false;
            this.poster.append(img);
            return img;
        });

        // Tira de títulos: lista semántica, cada título es un enlace a su proyecto
        this.track = createEl('ul', 'work-track');
        this.items = this.projects.map((p) => {
            const li = createEl('li', 'work-item');
            const h2 = createEl('h2', 'work-title');
            const link = createEl('a', '', p.titulo);
            link.href = '#/proyecto/' + p.slug;
            link.tabIndex = -1;
            h2.append(link);
            li.append(h2, createEl('p', 'work-client', p.cliente));
            this.track.append(li);
            return { li, h2, link, fx: new TitleFx(h2, link) };
        });

        // Flechas, contador y aviso para lectores de pantalla ya están en trabajo.html
        this.prevBtn = this.root.querySelector('.work-arrow--prev');
        this.nextBtn = this.root.querySelector('.work-arrow--next');
        this.count = this.root.querySelector('.work-count');
        this.status = this.root.querySelector('.work-status');

        this.root.prepend(this.poster, this.track);
    }

    measure() {
        this.vw = window.innerWidth;
        this.widths = this.items.map((it) => it.h2.offsetWidth);
        this.items.forEach((it) => it.fx.resize());
    }

    /* ---------- Estado ---------- */

    setActive(i) {
        const pad = (num) => String(num).padStart(2, '0');
        this.active = i;
        this.items.forEach((it, k) => {
            const on = k === i;
            it.li.classList.toggle('is-active', on);
            it.link.tabIndex = on ? 0 : -1;
            if (on) it.link.setAttribute('aria-current', 'true');
            else it.link.removeAttribute('aria-current');
            this.posters[k].classList.toggle('is-active', on);
        });
        this.poster.style.setProperty('--scrim', this.projects[i].scrim ?? 0.3);
        this.count.textContent = `${pad(i + 1)} / ${pad(this.n)}`;
    }

    // Se espera un poco para no anunciar cada proyecto que pasa durante un arrastre
    announce() {
        clearTimeout(this.announceTimer);
        this.announceTimer = setTimeout(() => {
            const p = this.projects[this.active];
            this.status.textContent = `${p.titulo}, proyecto ${this.active + 1} de ${this.n}`;
        }, 450);
    }

    // Va al proyecto `index` por el camino más corto (puede dar la vuelta al loop)
    goTo(index) {
        const current = Math.round(this.target);
        let diff = mod(index - current, this.n);
        if (diff > this.n / 2) diff -= this.n;
        this.target = current + diff;
        this.start();
    }

    // Avanza (dir = 1) o retrocede (dir = -1) un proyecto
    step(dir, moveFocus = false) {
        this.target = Math.round(this.target) + dir;
        if (moveFocus) this.items[mod(this.target, this.n)].link.focus({ preventScroll: true });
        this.start();
    }

    open(index) {
        window.location.hash = '#/proyecto/' + this.projects[index].slug;
    }

    /* ---------- Render ---------- */

    render() {
        const vw = this.vw;
        const n = this.n;

        // edge = distancia del centro de la pantalla al borde del título vecino.
        // En reposo el vecino solo asoma por el borde; al arrastrar se acerca.
        // En pantallas angostas tiene un mínimo para que el título más ancho no pise a su vecino.
        const widest = Math.max(...this.widths);
        const dragEdge = Math.max(vw * DRAG_REACH, widest / 2 + 28);
        const edge = lerp(vw / 2 - vw * PEEK, dragEdge, this.drag);
        const extra = vw * GAP_EXTRA;

        this.items.forEach((it, i) => {
            // u = distancia (en proyectos) al centro, llevada al rango [-n/2, n/2] para el loop
            let u = i - this.pos;
            u -= n * Math.round(u / n);
            const a = Math.abs(u);

            const offset = Math.sign(u) * (a * (edge + this.widths[i] / 2) + Math.max(0, a - 1) * extra);
            // Con pocos proyectos, el que salta de un lado al otro se desvanece para que no se vea el salto
            const opacity = clamp((n / 2 - a) / 0.35, 0, 1);

            this.offsets[i] = offset;
            it.li.style.setProperty('--x', `${offset.toFixed(2)}px`);
            it.li.style.opacity = opacity.toFixed(3);
            it.li.style.zIndex = String(10 - Math.round(a * 2));
        });

        const index = mod(Math.round(this.pos), n);
        if (index !== this.active) {
            this.setActive(index);
            this.announce();
        }

        this.root.style.setProperty('--z', `${(-DEPTH * this.drag).toFixed(2)}px`);
        this.root.style.setProperty('--rx', `${this.tilt.x.toFixed(3)}deg`);
        this.root.style.setProperty('--ry', `${this.tilt.y.toFixed(3)}deg`);
    }

    // Dibuja el efecto de texto solo en los títulos que están en pantalla
    renderFx() {
        const visible = this.fxLevel >= 0.03;
        this.items.forEach((it, i) => {
            const onScreen = Math.abs(this.offsets[i]) < this.vw / 2 + this.widths[i];
            if (visible && onScreen) it.fx.draw(this.fxLevel);
            else it.fx.clear();
        });
    }

    // Arranca el loop de animación si estaba detenido
    start() {
        if (this.raf === null) {
            this.lastTime = performance.now();
            this.raf = requestAnimationFrame(this.tick);
        }
    }

    tick(now) {
        const dt = Math.min(64, now - this.lastTime);
        this.lastTime = now;

        // Suavizado que no depende de los FPS; con movimiento reducido salta directo al objetivo
        const ease = (tau) => (this.reduceMotion ? 1 : 1 - Math.exp(-dt / tau));

        const before = this.pos;
        this.pos += (this.target - this.pos) * ease(this.dragging ? 70 : 150);
        this.drag += (this.dragTarget - this.drag) * ease(180);
        this.tilt.x += (this.tilt.tx - this.tilt.x) * ease(220);
        this.tilt.y += (this.tilt.ty - this.tilt.y) * ease(220);

        this.render();

        // El póster vuelve cuando se suelta y el proyecto elegido ya casi llegó al centro
        if (this.away && !this.dragging && Math.abs(this.target - this.pos) < 0.04) {
            this.away = false;
            this.root.classList.remove('is-away');
        }

        // Efecto de texto: proporcional a la velocidad (proyectos por segundo), se apaga de a poco
        const speed = Math.abs(this.pos - before) / Math.max(1, dt) * 1000;
        const goal = this.reduceMotion ? 0 : clamp(speed * 0.4, 0, 1);
        this.fxLevel += (goal - this.fxLevel) * ease(120);
        this.renderFx();

        const settled =
            this.fxLevel < 0.02 &&
            Math.abs(this.target - this.pos) < 0.0005 &&
            Math.abs(this.dragTarget - this.drag) < 0.001 &&
            Math.abs(this.tilt.tx - this.tilt.x) < 0.01 &&
            Math.abs(this.tilt.ty - this.tilt.y) < 0.01;

        // Todo llegó a su objetivo: se fija el valor exacto y se detiene el loop
        if (settled && !this.dragging) {
            this.pos = this.target;
            this.drag = this.dragTarget;
            this.tilt.x = this.tilt.tx;
            this.tilt.y = this.tilt.ty;
            this.render();
            this.raf = null;
        } else {
            this.raf = requestAnimationFrame(this.tick);
        }
    }

    /* ---------- Eventos ---------- */

    bindEvents() {
        const root = this.root;

        this.prevBtn.addEventListener('click', () => this.step(-1));
        this.nextBtn.addEventListener('click', () => this.step(1));

        root.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || e.target.closest('.work-controls')) return;
            this.pressed = true;
            this.dragging = false;
            this.startX = this.lastX = e.clientX;
            this.lastMoveTime = performance.now();
            this.velocity = 0;
            this.downTarget = e.target;
            root.setPointerCapture(e.pointerId);
        });

        root.addEventListener('pointermove', (e) => {
            // Recién después de 4px de movimiento se considera un arrastre (si no, es un click)
            if (this.pressed && !this.dragging && Math.abs(e.clientX - this.startX) > 4) {
                this.dragging = true;
                this.dragTarget = 1;
                this.away = true;
                root.classList.add('is-dragging', 'is-away');
            }

            if (this.dragging) {
                const now = performance.now();
                const dx = e.clientX - this.lastX;
                const moved = -dx / (this.vw * 0.28);   // un proyecto cada 28% del ancho
                this.target += moved;
                const dt = Math.max(1, now - this.lastMoveTime);
                this.velocity = lerp(this.velocity, moved / dt, 0.35);
                this.lastMoveTime = now;
                if (dx !== 0) root.dataset.dir = dx < 0 ? 'left' : 'right';
                this.lastX = e.clientX;
                this.start();
            }

            // Inclinación 3D del póster siguiendo al cursor (solo mouse y sin movimiento reducido)
            if (e.pointerType === 'mouse' && !this.reduceMotion) {
                const x = clamp((e.clientX - this.vw / 2) / (this.vw / 2), -1, 1);
                const y = clamp((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2), -1, 1);
                this.tilt.ty = x * TILT;
                this.tilt.tx = -y * TILT;
                this.start();
            }
        });

        const release = (e) => {
            if (!this.pressed) return;
            this.pressed = false;

            if (this.dragging) {
                this.dragging = false;
                this.dragTarget = 0;
                root.classList.remove('is-dragging');
                delete root.dataset.dir;
                // Si se soltó en movimiento, la inercia lo lleva unos proyectos más
                const stopped = performance.now() - this.lastMoveTime > 90;
                const velocity = stopped ? 0 : this.velocity;
                const thrown = clamp(velocity * 260, -MAX_THROW, MAX_THROW);
                this.target = Math.round(this.target + thrown);
            } else if (e.type === 'pointerup') {
                this.tap(this.downTarget);
            }
            this.downTarget = null;
            this.start();
        };
        root.addEventListener('pointerup', release);
        root.addEventListener('pointercancel', release);

        root.addEventListener('pointerleave', (e) => {
            if (e.pointerType !== 'mouse') return;
            this.tilt.tx = 0;
            this.tilt.ty = 0;
            this.start();
        });

        // Rueda / trackpad: un proyecto por gesto (la página no hace scroll)
        root.addEventListener('wheel', (e) => {
            e.preventDefault();
            const now = performance.now();
            if (now - this.wheelTime > 220) this.wheelAcc = 0;
            this.wheelTime = now;
            this.wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(this.wheelAcc) > 60 && now - this.wheelStepTime > 550) {
                this.step(this.wheelAcc > 0 ? 1 : -1);
                this.wheelStepTime = now;
                this.wheelAcc = 0;
            }
        }, { passive: false });

        document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
            // Con el menú abierto, o una vista (listado/ficha) encima, las flechas no mueven el carrusel
            const menuOpen = !document.getElementById('main-menu').inert;
            if (menuOpen || root.inert) return;

            // Si el foco está en un título, el foco acompaña al carrusel
            const inTrack = !!e.target.closest('.work-track');
            if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1, inTrack); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1, inTrack); }
            else if (e.key === 'Home') { e.preventDefault(); this.goTo(0); }
            else if (e.key === 'End') { e.preventDefault(); this.goTo(this.n - 1); }
        });

        window.addEventListener('resize', () => { this.measure(); this.start(); });
    }

    /* Un toque/click sin arrastre: un título vecino se centra; el póster o el activo abre el proyecto. */
    tap(target) {
        const li = target.closest('.work-item');
        const index = this.items.findIndex((it) => it.li === li);
        if (index !== -1 && index !== this.active) this.goTo(index);
        else this.open(this.active);
    }
}
