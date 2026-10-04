/* components/fuzzytext/FuzzyText.js
   Texto "vibrante": se dibuja en un canvas cortado en franjas horizontales de 1px que se
   desplazan al azar en cada frame. Con el mouse o el foco encima vibra más fuerte.
   El texto original queda oculto para lectores de pantalla; el canvas es decorativo.

   Opciones: baseIntensity (en reposo) y hoverIntensity (con el mouse encima), de 0 a 1. */
class FuzzyText {
    constructor(el, { baseIntensity = 0.18, hoverIntensity = 0.5 } = {}) {
        this.el = el;
        this.baseIntensity = baseIntensity;
        this.hoverIntensity = hoverIntensity;
        this.fuzzRange = 30;            // desplazamiento máximo de una franja, en px
        this.frameDuration = 1000 / 60; // como mucho 60 frames por segundo

        // innerText respeta text-transform (lo que se dibuja); textContent es lo que se lee
        this.text = el.innerText.trim();
        const label = el.textContent.trim();

        // El texto original queda solo para lectores de pantalla
        const srText = document.createElement('span');
        srText.className = 'visually-hidden';
        srText.textContent = label;
        this.el.replaceChildren(srText);

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fuzzy-text-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.el.appendChild(this.canvas);
        // willReadFrequently: el canvas se redibuja constantemente
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        this.isHovering = false;
        this.currentIntensity = baseIntensity;
        this.lastFrameTime = 0;

        this.init();
        this.bindEvents();
    }

    // Dibuja el texto limpio una sola vez en un canvas aparte; loop() después copia franjas de ahí
    async init() {
        // Espera a que carguen las fuentes (Moul / Work Sans) antes de dibujar
        await document.fonts.ready;

        // Copia la tipografía y el color que el CSS le da al elemento
        const styles = window.getComputedStyle(this.el);
        const font = `${styles.fontWeight} ${parseFloat(styles.fontSize)}px ${styles.fontFamily}`;

        this.offscreen = document.createElement('canvas');
        const offCtx = this.offscreen.getContext('2d');
        offCtx.font = font;

        // Medidas reales del texto, para que no se corte ninguna letra
        const metrics = offCtx.measureText(this.text);
        const left = metrics.actualBoundingBoxLeft;
        const ascent = metrics.actualBoundingBoxAscent;
        this.textHeight = Math.ceil(ascent + metrics.actualBoundingBoxDescent);
        this.offscreenWidth = Math.ceil(left + metrics.actualBoundingBoxRight) + 10; // 10px de aire

        // Cambiar el tamaño del canvas borra su configuración: la fuente se vuelve a poner después
        this.offscreen.width = this.offscreenWidth;
        this.offscreen.height = this.textHeight;
        offCtx.font = font;
        offCtx.fillStyle = styles.color;
        offCtx.fillText(this.text, 5 - left, ascent);

        // El canvas visible tiene margen a los costados para que las franjas desplazadas no se corten
        this.margin = this.fuzzRange + 20;
        this.canvas.width = this.offscreenWidth + this.margin * 2;
        this.canvas.height = this.textHeight;
        this.ctx.translate(this.margin, 0);

        if (!this.animationFrameId) this.loop();
    }

    loop(timestamp = 0) {
        if (timestamp - this.lastFrameTime >= this.frameDuration) {
            this.lastFrameTime = timestamp;
            this.ctx.clearRect(-this.margin, -10, this.canvas.width, this.canvas.height + 20);

            // La intensidad se acerca de a poco (15% por frame) a la de reposo o a la de hover
            const targetIntensity = this.isHovering ? this.hoverIntensity : this.baseIntensity;
            this.currentIntensity += (targetIntensity - this.currentIntensity) * 0.15;

            // Cada franja de 1px se copia corrida al azar a la izquierda o a la derecha
            for (let y = 0; y < this.textHeight; y++) {
                const dx = Math.floor(this.currentIntensity * (Math.random() - 0.5) * this.fuzzRange);
                this.ctx.drawImage(this.offscreen, 0, y, this.offscreenWidth, 1, dx, y, this.offscreenWidth, 1);
            }
        }
        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    bindEvents() {
        this.el.addEventListener('mouseenter', () => this.isHovering = true);
        this.el.addEventListener('mouseleave', () => this.isHovering = false);
        // Mismo efecto al navegar con teclado
        this.el.addEventListener('focus', () => this.isHovering = true);
        this.el.addEventListener('blur', () => this.isHovering = false);

        // El tamaño de la fuente depende del ancho de la ventana (clamp): se redibuja al cambiarlo
        window.addEventListener('resize', () => this.init());
    }
}
