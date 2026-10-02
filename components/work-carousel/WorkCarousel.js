/* components/work-carousel/WorkCarousel.js
   Carrusel horizontal de proyectos (vista /trabajo).
   - Un póster fijo y centrado; la tira de títulos es la que se desplaza (loop infinito).
   - En reposo los títulos vecinos solo "asoman" por los bordes; al arrastrar se juntan
     y el póster retrocede en Z. Al soltar, snap al proyecto más cercano.
   - Control: arrastre (pointer events), flechas del teclado, rueda, botones y toque. */
(() => {
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const mod = (n, m) => ((n % m) + m) % m;
    const pad = (n) => String(n).padStart(2, '0');

    /* Efecto de texto: mientras el carrusel se mueve, el título se dibuja en un canvas cortado en
       franjas horizontales que se desplazan según la velocidad. El texto real sigue en el DOM
       (se oculta solo mientras dura el efecto), así que lectores de pantalla y selección no cambian. */
    class TitleFx {
        constructor(h2, link) {
            this.h2 = h2;
            this.link = link;
            this.on = false;
            this.canvas = document.createElement("canvas");
            this.canvas.className = "work-fx";
            this.canvas.setAttribute("aria-hidden", "true");
            this.ctx = this.canvas.getContext("2d");
            this.src = document.createElement("canvas");
            h2.append(this.canvas);
        }

        /* Dibuja el texto limpio una sola vez; después solo se recortan franjas de esta imagen. */
        resize() {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const w = this.h2.offsetWidth;
            const h = this.h2.offsetHeight;
            if (!w || !h) return;
            Object.assign(this, { w, h, dpr });
            this.canvas.width = this.src.width = Math.ceil(w * dpr);
            this.canvas.height = this.src.height = Math.ceil(h * dpr);

            const cs = getComputedStyle(this.link);
            const s = this.src.getContext("2d");
            s.setTransform(dpr, 0, 0, dpr, 0, 0);
            s.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
            if ("letterSpacing" in s) s.letterSpacing = cs.letterSpacing;
            s.fillStyle = "#fff";
            s.textBaseline = "alphabetic";
            const m = s.measureText("Mg");
            const asc = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.9;
            const desc = m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.25;
            const padLeft = parseFloat(getComputedStyle(this.h2).paddingLeft) || 0;
            s.fillText(this.link.textContent, padLeft, (h - (asc + desc)) / 2 + asc);
        }

        draw(level) {
            if (!this.w) return;
            if (!this.on) {
                this.h2.classList.add("has-fx");
                this.on = true;
            }
            const { ctx, w, h, dpr } = this;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            const slice = 2;
            const shift = level * h * 0.17;
            const t = performance.now() / 90;
            for (let y = 0; y < h; y += slice) {
                // onda suave y continua: los trazos finos no se cortan, el título "se derrite" al moverse
                const dx = Math.sin(y * 0.09 + t) * shift;
                ctx.drawImage(this.src, 0, y * dpr, this.src.width, slice * dpr, dx, y, w, slice);
            }
        }

        clear() {
            if (!this.on) return;
            this.h2.classList.remove("has-fx");
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.on = false;
        }
    }

    class WorkCarousel {
        constructor(root, projects, options = {}) {
            this.root = typeof root === 'string' ? document.querySelector(root) : root;
            if (!this.root || !projects || !projects.length) return;

            this.projects = projects;
            this.n = projects.length;
            this.opts = {
                peek: 0.045,       // cuánto asoma el vecino por el borde en reposo (fracción del ancho)
                dragReach: 0.208,  // distancia centro→borde del vecino mientras se arrastra (fracción del ancho)
                gapExtra: 0.08,    // aire extra entre títulos que no son vecinos directos
                tilt: 3.2,         // inclinación 3D máxima del póster, en grados
                depth: 26,         // cuánto retrocede el póster al arrastrar, en px (con perspective 500px ≈ 95%)
                maxThrow: 2,       // cuántos proyectos puede "lanzar" el arrastre con inercia
                hrefBase: '#/proyecto/',
                isBlocked: () => false,
                ...options
            };

            this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

            // Estado de animación. pos/target están en "índices flotantes" (1.0 = un proyecto).
            this.pos = 0;
            this.target = 0;
            this.drag = 0;
            this.dragTarget = 0;
            this.tilt = { x: 0, y: 0, tx: 0, ty: 0 };
            this.active = 0;
            this.raf = null;
            this.last = 0;

            // Estado del puntero
            this.pressed = false;
            this.dragging = false;
            this.startX = 0;
            this.lastX = 0;
            this.lastMoveT = 0;
            this.velocity = 0;
            this.downTarget = null;

            this.wheelAcc = 0;
            this.wheelT = 0;
            this.widths = [];
            this.scrims = projects.map(() => 0.3);
            this.vw = window.innerWidth;

            this.tick = this.tick.bind(this);

            this.fxLevel = 0;
            this.prevPos = 0;

            this.build();
            this.fx = this.items.map((it) => new TitleFx(it.h2, it.link));
            this.bind();
            this.measure();
            this.setActive(0, { silent: true });
            this.render();

            // Los anchos de los títulos dependen de la fuente: se miden de nuevo al cargarla.
            const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
            ready.then(() => {
                this.measure();
                this.render();
                this.root.classList.add('is-ready');
            });
        }

        /* ---------- DOM ---------- */

        build() {
            const make = (tag, className, text) => {
                const el = document.createElement(tag);
                if (className) el.className = className;
                if (text !== undefined) el.textContent = text;
                return el;
            };

            // Póster: una imagen por proyecto, solo se ve la activa (decorativo para lectores de pantalla)
            this.poster = make('figure', 'work-poster');
            this.poster.setAttribute('aria-hidden', 'true');
            this.posters = this.projects.map((p, i) => {
                const img = make('img', 'work-poster__img');
                img.alt = '';
                img.src = p.poster;
                img.decoding = 'async';
                img.draggable = false;
                img.fetchPriority = i === 0 ? 'high' : 'low';
                img.addEventListener('load', () => this.sampleScrim(img, i));
                if (img.complete && img.naturalWidth) this.sampleScrim(img, i);
                this.poster.append(img);
                return img;
            });

            // Tira de títulos: lista semántica, cada título es un enlace a su proyecto
            this.track = make('ul', 'work-track');
            this.items = this.projects.map((p, i) => {
                const li = make('li', 'work-item');
                const h2 = make('h2', 'work-title');
                const link = make('a', '', p.titulo);
                link.href = this.opts.hrefBase + p.slug;
                link.tabIndex = -1;
                h2.append(link);
                li.append(h2, make('p', 'work-client', p.cliente));
                this.track.append(li);
                return { li, h2, link, index: i };
            });

            // Controles: flechas ← → (hacen de pista de arrastre y de botones accesibles)
            this.controls = make('div', 'work-controls');
            this.controls.setAttribute('role', 'group');
            this.controls.setAttribute('aria-label', 'Navegación del carrusel');
            this.prevBtn = make('button', 'work-arrow work-arrow--prev');
            this.prevBtn.type = 'button';
            this.prevBtn.setAttribute('aria-label', 'Proyecto anterior');
            this.nextBtn = make('button', 'work-arrow work-arrow--next');
            this.nextBtn.type = 'button';
            this.nextBtn.setAttribute('aria-label', 'Proyecto siguiente');
            this.controls.append(this.prevBtn, this.nextBtn);

            this.count = make('p', 'work-count');
            this.count.setAttribute('aria-hidden', 'true');

            this.status = make('p', 'visually-hidden');
            this.status.setAttribute('role', 'status');

            this.root.append(this.poster, this.track, this.controls, this.count, this.status);
        }

        /* Mide la luminosidad de la franja central del póster para oscurecerlo lo justo:
           un título blanco finito no se lee sobre una captura casi blanca. */
        sampleScrim(img, i) {
            try {
                const w = 24, h = 8;
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, img.naturalWidth * 0.1, img.naturalHeight * 0.35,
                    img.naturalWidth * 0.8, img.naturalHeight * 0.3, 0, 0, w, h);
                const d = ctx.getImageData(0, 0, w, h).data;
                let sum = 0;
                for (let k = 0; k < d.length; k += 4) {
                    sum += (0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]) / 255;
                }
                const lum = sum / (d.length / 4);
                this.scrims[i] = clamp(0.12 + (lum - 0.25) * 0.55, 0.12, 0.5);
                if (i === this.active) this.poster.style.setProperty('--scrim', this.scrims[i].toFixed(3));
            } catch (e) {
                /* canvas "tainted" (p. ej. abierto como file://): queda el valor por defecto */
            }
        }

        measure() {
            this.vw = window.innerWidth;
            this.widths = this.items.map((it) => it.h2.offsetWidth);
            this.fx.forEach((f) => f.resize());
        }

        /* ---------- Estado ---------- */

        setActive(i, { silent = false } = {}) {
            this.active = i;
            this.items.forEach((it, k) => {
                const on = k === i;
                it.li.classList.toggle('is-active', on);
                it.link.tabIndex = on ? 0 : -1;
                if (on) it.link.setAttribute('aria-current', 'true');
                else it.link.removeAttribute('aria-current');
                this.posters[k].classList.toggle('is-active', on);
            });
            this.poster.style.setProperty('--scrim', this.scrims[i].toFixed(3));
            this.count.textContent = `${pad(i + 1)} / ${pad(this.n)}`;
            if (!silent) this.announceSoon();
        }

        announceSoon() {
            clearTimeout(this.announceTimer);
            this.announceTimer = setTimeout(() => {
                const p = this.projects[this.active];
                this.status.textContent = `${p.titulo}, proyecto ${this.active + 1} de ${this.n}`;
            }, 450);
        }

        goTo(index) {
            const cur = Math.round(this.target);
            let diff = mod(index - cur, this.n);
            if (diff > this.n / 2) diff -= this.n;
            this.target = cur + diff;
            this.kick();
        }

        step(dir, { moveFocus = false } = {}) {
            this.target = Math.round(this.target) + dir;
            if (moveFocus) this.items[mod(this.target, this.n)].link.focus({ preventScroll: true });
            this.kick();
        }

        open(index) {
            const p = this.projects[index];
            this.root.dispatchEvent(new CustomEvent('work:open', { bubbles: true, detail: { slug: p.slug, index } }));
            window.location.hash = this.opts.hrefBase + p.slug;
        }

        /* ---------- Render ---------- */

        render() {
            const vw = this.vw;
            const n = this.n;

            // E = distancia del centro de pantalla al borde cercano del título vecino.
            // En reposo el vecino solo asoma por el borde; al arrastrar se acerca.
            const E = lerp(vw / 2 - vw * this.opts.peek, vw * this.opts.dragReach, this.drag);
            const extra = vw * this.opts.gapExtra;

            for (let i = 0; i < n; i++) {
                // u = distancia (en proyectos) al centro, envuelta al rango [-n/2, n/2]
                let u = i - this.pos;
                u -= n * Math.round(u / n);
                const a = Math.abs(u);

                const offset = Math.sign(u) * (a * (E + this.widths[i] / 2) + Math.max(0, a - 1) * extra);
                // Con pocos proyectos, el que salta de un lado al otro se desvanece para no "pegar un salto".
                const wrapAlpha = clamp((n / 2 - a) / 0.35, 0, 1);

                const li = this.items[i].li;
                li.style.setProperty('--x', `${offset.toFixed(2)}px`);
                li.style.opacity = wrapAlpha.toFixed(3);
                li.style.zIndex = String(10 - Math.round(a * 2));
            }

            const idx = mod(Math.round(this.pos), n);
            if (idx !== this.active) this.setActive(idx);

            this.root.style.setProperty('--z', `${(-this.opts.depth * this.drag).toFixed(2)}px`);
            this.root.style.setProperty('--rx', `${this.tilt.x.toFixed(3)}deg`);
            this.root.style.setProperty('--ry', `${this.tilt.y.toFixed(3)}deg`);
        }

        applyFx() {
            const visible = this.fxLevel >= 0.03;
            this.items.forEach((it, i) => {
                const onScreen = Math.abs(parseFloat(it.li.style.getPropertyValue("--x"))) < this.vw / 2 + this.widths[i];
                if (visible && onScreen) this.fx[i].draw(this.fxLevel);
                else this.fx[i].clear();
            });
        }

        kick() {
            if (this.raf === null) {
                this.last = performance.now();
                this.raf = requestAnimationFrame(this.tick);
            }
        }

        tick(now) {
            const dt = Math.min(64, now - this.last);
            this.last = now;

            // Suavizado independiente de los FPS (1 - e^(-dt/tau)); con movimiento reducido salta directo.
            const ease = (tau) => (this.reduceMotion.matches ? 1 : 1 - Math.exp(-dt / tau));

            const before = this.pos;
            this.pos += (this.target - this.pos) * ease(this.dragging ? 70 : 150);
            this.drag += (this.dragTarget - this.drag) * ease(180);
            this.tilt.x += (this.tilt.tx - this.tilt.x) * ease(220);
            this.tilt.y += (this.tilt.ty - this.tilt.y) * ease(220);

            this.render();

            // Efecto de texto: proporcional a la velocidad (proyectos por segundo), con inercia al apagarse
            const speed = Math.abs(this.pos - before) / Math.max(1, dt) * 1000;
            const goal = this.reduceMotion.matches ? 0 : clamp(speed * 0.4, 0, 1);
            this.fxLevel += (goal - this.fxLevel) * ease(120);
            this.applyFx();

            const settled =
                this.fxLevel < 0.02 &&
                Math.abs(this.target - this.pos) < 0.0005 &&
                Math.abs(this.dragTarget - this.drag) < 0.001 &&
                Math.abs(this.tilt.tx - this.tilt.x) < 0.01 &&
                Math.abs(this.tilt.ty - this.tilt.y) < 0.01;

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

        bind() {
            const root = this.root;

            this.prevBtn.addEventListener('click', () => this.step(-1));
            this.nextBtn.addEventListener('click', () => this.step(1));

            root.addEventListener('pointerdown', (e) => {
                if (e.button !== 0 || e.target.closest('.work-controls')) return;
                this.pressed = true;
                this.dragging = false;
                this.startX = this.lastX = e.clientX;
                this.lastMoveT = performance.now();
                this.velocity = 0;
                this.downTarget = e.target;
                root.setPointerCapture(e.pointerId);
            });

            root.addEventListener('pointermove', (e) => {
                if (this.pressed) {
                    if (!this.dragging && Math.abs(e.clientX - this.startX) > 4) {
                        this.dragging = true;
                        this.dragTarget = 1;
                        root.classList.add('is-dragging');
                    }
                    if (this.dragging) {
                        const now = performance.now();
                        const dx = e.clientX - this.lastX;
                        const dItems = -dx / (this.vw * 0.28);   // ~un proyecto cada 28% del ancho
                        this.target += dItems;
                        const dt = Math.max(1, now - this.lastMoveT);
                        this.velocity = lerp(this.velocity, dItems / dt, 0.35);
                        this.lastMoveT = now;
                        if (dx !== 0) root.dataset.dir = dx < 0 ? 'left' : 'right';
                        this.lastX = e.clientX;
                        this.kick();
                    }
                }

                // Inclinación 3D del póster siguiendo al cursor (solo mouse y sin movimiento reducido)
                if (e.pointerType === 'mouse' && !this.reduceMotion.matches) {
                    const nx = clamp((e.clientX - this.vw / 2) / (this.vw / 2), -1, 1);
                    const ny = clamp((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2), -1, 1);
                    this.tilt.ty = nx * this.opts.tilt;
                    this.tilt.tx = -ny * this.opts.tilt;
                    this.kick();
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
                    const idle = performance.now() - this.lastMoveT > 90;
                    const v = idle ? 0 : this.velocity;
                    const throwItems = clamp(v * 260, -this.opts.maxThrow, this.opts.maxThrow);
                    this.target = Math.round(this.target + throwItems);
                } else if (e.type === 'pointerup') {
                    this.tap(this.downTarget);
                }
                this.downTarget = null;
                this.kick();
            };
            root.addEventListener('pointerup', release);
            root.addEventListener('pointercancel', release);

            root.addEventListener('pointerleave', (e) => {
                if (e.pointerType !== 'mouse') return;
                this.tilt.tx = 0;
                this.tilt.ty = 0;
                this.kick();
            });

            // Rueda / trackpad: un proyecto por gesto (la página no hace scroll)
            root.addEventListener('wheel', (e) => {
                e.preventDefault();
                const now = performance.now();
                if (now - this.wheelT > 220) this.wheelAcc = 0;
                this.wheelT = now;
                this.wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (Math.abs(this.wheelAcc) > 60 && now - (this.wheelStepT || 0) > 550) {
                    this.step(this.wheelAcc > 0 ? 1 : -1);
                    this.wheelStepT = now;
                    this.wheelAcc = 0;
                }
            }, { passive: false });

            document.addEventListener('keydown', (e) => {
                if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || this.opts.isBlocked()) return;
                if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
                const inTrack = !!e.target.closest('.work-track');
                if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1, { moveFocus: inTrack }); }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1, { moveFocus: inTrack }); }
                else if (e.key === 'Home') { e.preventDefault(); this.goTo(0); }
                else if (e.key === 'End') { e.preventDefault(); this.goTo(this.n - 1); }
            });

            window.addEventListener('resize', () => { this.measure(); this.kick(); });
            this.reduceMotion.addEventListener('change', () => this.kick());
        }

        /* Un toque/click sin arrastre: un título vecino se centra; el póster o el activo abre el proyecto. */
        tap(target) {
            const li = target && target.closest ? target.closest('.work-item') : null;
            if (li) {
                const index = this.items.findIndex((it) => it.li === li);
                if (index !== -1 && index !== this.active) return this.goTo(index);
            }
            this.open(this.active);
        }
    }

    window.WorkCarousel = WorkCarousel;
})();
