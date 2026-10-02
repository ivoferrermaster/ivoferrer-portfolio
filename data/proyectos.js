/* data/proyectos.js
   Fuente única de los proyectos de la vista /trabajo (carrusel, listado y ficha).
   Para sumar uno nuevo alcanza con agregar un objeto acá (y su captura en assets/img).

   Campos opcionales: `anio` y `url`. Si están, la ficha muestra la columna "Año" y el botón
   "Visitar sitio"; si no, simplemente no aparecen. Completalos cuando quieras. */
window.PROYECTOS = [
    {
        slug: 'ascanelli',
        titulo: 'Ascanelli',
        cliente: 'Ascanelli',
        rol: 'Diseño y desarrollo web',
        descripcion: 'Sitio web de Ascanelli. Ordena su línea de productos (tolvas autodescargables, sembradoras, mixers, embolsadoras y más), las promociones y la red de ventas en una navegación clara y visual.',
        poster: 'assets/img/webp/cap-ascanelli.webp',
        logo: 'assets/logos/logo-ascanellib.png'
        // anio: '2025',
        // url: 'https://...'
    },
    {
        slug: 'montecitos',
        titulo: 'Montecitos',
        cliente: 'Montecitos Country & Golf',
        rol: 'Diseño y desarrollo web',
        descripcion: 'Sitio web de Montecitos Country & Golf, el club de campo con cancha de golf de 9 hoyos en Río Tercero. Una portada inmersiva que transmite deporte y naturaleza desde el primer vistazo.',
        poster: 'assets/img/webp/cap-montecitos.webp',
        logo: 'assets/logos/logo-montecitos.png'
    },
    {
        slug: 'enterlab',
        titulo: 'Enterlab',
        cliente: 'Enterlab',
        rol: 'Diseño y desarrollo web',
        descripcion: 'Sitio web de Enterlab Tech Management, consultora de software que diseña infraestructuras resilientes y software escalable. Estética tecnológica, animada y disponible en español e inglés.',
        poster: 'assets/img/webp/cap-enterlab.webp',
        logo: 'assets/logos/logo-enterlab.webp'
    },
    {
        slug: 'cpd',
        titulo: 'CPD',
        cliente: 'Centro Privado del Diagnóstico',
        rol: 'Diseño y desarrollo web',
        descripcion: 'Sitio web del Centro Privado del Diagnóstico. Una propuesta centrada en el confort y la seguridad de cada paciente, con acceso directo para sacar turno.',
        poster: 'assets/img/webp/cap-cpd.webp',
        logo: 'assets/logos/logo-cpd.png'
    }
];
