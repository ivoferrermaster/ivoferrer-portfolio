class FuzzyText {
    constructor(el, options = {}) {
        this.el = el;
        this.text = el.innerText.trim();
        
        // Configuraciones predeterminadas (imitando los props del JSX)
        this.options = {
            baseIntensity: 0.18,
            hoverIntensity: 0.5,
            fuzzRange: 30,
            fps: 60,
            ...options
        };
        
        // Esconde el texto original de forma accesible (SR only)
        this.el.innerHTML = `<span style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0);">${this.text}</span>`;
        
        // Crea y añade el Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fuzzy-text-canvas';
        this.el.appendChild(this.canvas);
        
        // 'willReadFrequently' optimiza el rendimiento cuando leemos/escribimos píxeles constantemente
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.isHovering = false;
        this.currentIntensity = this.options.baseIntensity;
        this.lastFrameTime = 0;
        this.frameDuration = 1000 / this.options.fps;
        
        this.init();
        this.bindEvents();
    }
    
    async init() {
        // Asegura que las fuentes personalizadas (ej. Moul o Work Sans) estén listas antes de dibujar
        await document.fonts.ready;
        
        // Heredar estilos exactos del CSS actual del elemento
        const styles = window.getComputedStyle(this.el);
        this.fontFamily = styles.fontFamily || 'sans-serif';
        this.fontSize = parseFloat(styles.fontSize) || 50;
        this.fontWeight = styles.fontWeight || 900;
        this.color = styles.color || '#ffffff';
        
        // Lienzo secundario (Offscreen) donde dibujamos el texto perfecto una sola vez
        this.offscreen = document.createElement('canvas');
        this.offCtx = this.offscreen.getContext('2d');
        
        this.offCtx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
        this.offCtx.textBaseline = 'alphabetic';
        
        // Cálculos matemáticos precisos para evitar que las letras se corten
        const metrics = this.offCtx.measureText(this.text);
        const actualLeft = metrics.actualBoundingBoxLeft ?? 0;
        const actualRight = metrics.actualBoundingBoxRight ?? metrics.width;
        const actualAscent = metrics.actualBoundingBoxAscent ?? this.fontSize;
        const actualDescent = metrics.actualBoundingBoxDescent ?? this.fontSize * 0.2;
        
        this.textWidth = Math.ceil(actualLeft + actualRight);
        this.textHeight = Math.ceil(actualAscent + actualDescent);
        
        const extraBuffer = 10;
        this.offscreenWidth = this.textWidth + extraBuffer;
        
        this.offscreen.width = this.offscreenWidth;
        this.offscreen.height = this.textHeight;
        
        this.offCtx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
        this.offCtx.textBaseline = 'alphabetic';
        this.offCtx.fillStyle = this.color;
        this.offCtx.fillText(this.text, extraBuffer / 2 - actualLeft, actualAscent);
        
        // Configuración final del Canvas visible (con márgenes para que el 'fuzz' no se salga de los bordes)
        this.horizontalMargin = this.options.fuzzRange + 20;
        
        this.canvas.width = this.offscreenWidth + (this.horizontalMargin * 2);
        this.canvas.height = this.textHeight;
        this.ctx.translate(this.horizontalMargin, 0);
        
        if (!this.animationFrameId) {
            this.loop();
        }
    }
    
    loop(timestamp = 0) {
        if (timestamp - this.lastFrameTime >= this.frameDuration) {
            this.lastFrameTime = timestamp;
            
            // Limpiar lienzo previo
            this.ctx.clearRect(-this.horizontalMargin, -10, this.canvas.width, this.canvas.height + 20);
            
            // Transición fluida de intensidad (ease)
            const targetIntensity = this.isHovering ? this.options.hoverIntensity : this.options.baseIntensity;
            this.currentIntensity += (targetIntensity - this.currentIntensity) * 0.15; 
            
            // El corazón del efecto: dibuja rebanadas horizontales desplazadas al azar
            for (let j = 0; j < this.textHeight; j++) {
                const dx = Math.floor(this.currentIntensity * (Math.random() - 0.5) * this.options.fuzzRange);
                this.ctx.drawImage(this.offscreen, 0, j, this.offscreenWidth, 1, dx, j, this.offscreenWidth, 1);
            }
        }
        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }
    
    bindEvents() {
        this.el.addEventListener('mouseenter', () => this.isHovering = true);
        this.el.addEventListener('mouseleave', () => this.isHovering = false);
        
        // Ajusta el tamaño de la fuente dinámicamente al redimensionar la ventana (Clamp)
        window.addEventListener('resize', () => {
            this.init();
        });
    }
}