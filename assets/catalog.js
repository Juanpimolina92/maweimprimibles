export const WHATSAPP_NUMBER = '5492646241204';
export const PAYMENT_ALIAS = 'marie.pezzutti.mp';

export const products = Object.freeze([
  { id: 'cat-mom-colorear', name: 'Cat Mom · Un ratito para colorear', category: 'imprimibles', tags: ['colorear'], label: 'Imprimibles para colorear', image: './assets/coloring-cover.jpeg', alt: 'Portada Cat Mom: ilustraciones de una mujer y sus gatitos', description: 'Un cuadernillo para disfrutar de un ratito de color entre gatitos y detalles tiernos. Mirá la portada y una muestra del interior; consultame por el formato disponible para tu pedido.', color: 'pink', gallery: [{ src: './assets/coloring-cover.jpeg', alt: 'Portada ilustrada de Cat Mom', label: 'Ver portada' }, { src: './assets/coloring-pages.jpeg', alt: 'Interior Cat Mom con gatitos, corazones y huellitas para colorear', label: 'Ver interior' }] },
  { id: 'kit-frozen', name: 'Un festejo de Frozen', category: 'kits', label: 'Kit de cumpleaños', image: './assets/catalog-01.jpg', alt: 'Kit de cumpleaños Frozen personalizado con el nombre Isabella', description: 'Una temática llena de magia para acompañar ese día tan especial. Consultame por las piezas y opciones de personalización.', color: 'blue' },
  { id: 'kit-dibujos', name: 'Un cumple lleno de color', category: 'kits', label: 'Kit de cumpleaños', image: './assets/catalog-03.jpg', alt: 'Kit de dibujos para el cumpleaños de Dayana', description: 'Un kit de dibujos para sumar color al cumpleaños. Escribime para consultar por el contenido y las opciones para tu festejo.', color: 'pink' },
  { id: 'etiquetas-mickey', name: 'Mickey va a la escuela', category: 'imprimibles', label: 'Etiquetas escolares', image: './assets/catalog-04.jpg', alt: 'Etiquetas escolares de Mickey personalizadas', description: 'Etiquetas con temática Mickey para identificar útiles escolares. Consultame por las opciones de nombres y formatos.', color: 'yellow' },
  { id: 'mini-polaroid', name: 'Recuerdos en miniatura', category: 'personalizados', label: 'Mini polaroids', image: './assets/catalog-05.jpg', alt: 'Mini polaroids con diseños de Mickey y Minnie', description: 'Mini polaroids con detalles de Mickey y Minnie. Consultame por las opciones para crear tus propios recuerdos.', color: 'green' },
  { id: 'stickers-pastel', name: 'Un toque de alegría', category: 'imprimibles', label: 'Stickers decorativos', image: './assets/catalog-06.jpg', alt: 'Stickers decorativos en colores pastel', description: 'Stickers llenos de color para darle un toque personal a tus cosas. Escribime y te cuento qué diseños están disponibles.', color: 'pink' },
  { id: 'llavero-boca', name: 'Las tablas, con Boca', category: 'personalizados', label: 'Llaveros de tablas', image: './assets/catalog-08.jpg', alt: 'Llaveros de tablas de multiplicar con temática Boca Juniors', description: 'Las tablas de multiplicar en un llavero con temática de Boca. Consultame por este diseño y cómo personalizarlo.', color: 'blue' },
  { id: 'dragon-ball', name: 'Un universo de aventuras', category: 'personalizados', label: 'Diseños de Dragon Ball', image: './assets/catalog-09.jpg', alt: 'Diseños de papelería con personajes de Dragon Ball', description: 'Diseños con temática Dragon Ball. Contame qué necesitás y consultame por las piezas y formatos disponibles.', color: 'yellow' },
  { id: 'llavero-unicornio', name: 'Aprender con un poquito de magia', category: 'personalizados', label: 'Llaveros de tablas', image: './assets/catalog-10.jpg', alt: 'Llavero de tablas de multiplicar con diseño de unicornio', description: 'Un llavero de tablas con diseño de unicornio. Escribime para consultar por las opciones de personalización.', color: 'pink' },
  { id: 'llavero-colores', name: 'Las tablas, siempre a mano', category: 'personalizados', label: 'Llaveros de tablas', image: './assets/catalog-11.jpg', alt: 'Llavero de tablas de multiplicar de colores personalizado para Ringo', description: 'Tablas de multiplicar en un práctico llavero de colores. Consultame por nombres, diseños y opciones disponibles.', color: 'green' },
  { id: 'portadas-futbol', name: 'Pasión por los cuadernos', category: 'imprimibles', label: 'Portadas escolares', image: './assets/catalog-12.jpg', alt: 'Portadas escolares con temática de fútbol y la selección argentina', description: 'Portadas con temática de fútbol para acompañar la vuelta a clases. Escribime para conocer las opciones de este diseño.', color: 'blue' },
]);

export function filterProducts(items, category = 'todos') {
  if (category === 'colorear') return items.filter(item => item.tags?.includes('colorear'));
  return category === 'todos' ? [...items] : items.filter((item) => item.category === category);
}

export function buildWhatsAppUrl(message = '¡Hola Marieta! Vi tu catálogo de Mawe y quería hacerte una consulta.') {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function productInquiry(product) {
  return `¡Hola Marieta! Vi “${product.name}” en el catálogo de Mawe y me gustaría consultar por este diseño. Mi idea es: `;
}
