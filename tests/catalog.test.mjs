import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WHATSAPP_NUMBER,
  PAYMENT_ALIAS,
  products,
  filterProducts,
  buildWhatsAppUrl,
  productInquiry,
} from '../src/catalog.js';

test('el catálogo contiene diseños únicos con imagen, alternativa y categoría', () => {
  assert.ok(products.length > 0, 'Debe existir un catálogo');
  assert.equal(new Set(products.map((product) => product.id)).size, products.length);
  for (const product of products) {
    assert.match(product.id, /^[a-z0-9-]+$/);
    assert.ok(['kits', 'imprimibles', 'personalizados'].includes(product.category));
    assert.match(product.image, /^\.\/assets\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/);
    for (const field of ['name', 'label', 'alt', 'description']) {
      assert.equal(typeof product[field], 'string');
      assert.ok(product[field].trim().length > 0, `${product.id}: falta ${field}`);
    }
    for (const image of product.gallery ?? []) {
      assert.match(image.src, /^\.\/assets\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/);
      assert.equal(typeof image.alt, 'string');
      assert.ok(image.alt.trim().length > 0, `${product.id}: imagen de galería sin alternativa`);
    }
  }
});

test('las imágenes se resuelven en el dominio y en una publicación bajo subcarpeta', () => {
  for (const base of ['https://example.test/', 'https://example.test/mawe/']) {
    const baseUrl = new URL(base);
    for (const product of products) {
      for (const source of [product.image, ...(product.gallery ?? []).map((image) => image.src)]) {
        const imageUrl = new URL(source, base);
        assert.equal(imageUrl.origin, baseUrl.origin);
        assert.equal(imageUrl.pathname, `${baseUrl.pathname}assets/${source.split('/').at(-1)}`);
        assert.equal(imageUrl.search, '');
        assert.equal(imageUrl.hash, '');
      }
    }
  }
});

test('ningún producto expone precio ni importe', () => {
  for (const product of products) {
    assert.ok(!Object.keys(product).some((key) => /price|precio|amount|importe/i.test(key)));
    assert.doesNotMatch(JSON.stringify(product), /\$\s*\d|(?:ARS|USD)\s*\d/i);
  }
});

test('el filtro todos devuelve una copia sin modificar el catálogo', () => {
  const result = filterProducts(products);
  assert.deepEqual(result, products);
  assert.notEqual(result, products);
  result.pop();
  assert.equal(filterProducts(products, 'todos').length, products.length);
});

test('cada categoría devuelve exactamente sus productos y una desconocida queda vacía', () => {
  for (const category of ['kits', 'imprimibles', 'personalizados']) {
    assert.deepEqual(filterProducts(products, category), products.filter((product) => product.category === category));
  }
  assert.deepEqual(filterProducts(products, 'categoría inexistente'), []);
});

test('CAT MOM incluye portada e interior y el filtro colorear conserva su categoría de imprimible', () => {
  const coloring = products.find((product) => product.id === 'cat-mom-colorear');
  assert.ok(coloring, 'Debe existir el nuevo imprimible CAT MOM');
  assert.equal(coloring.category, 'imprimibles');
  assert.ok(coloring.tags.includes('colorear'));
  assert.equal(coloring.image, './assets/coloring-cover.jpeg');
  assert.deepEqual(coloring.gallery.map((image) => image.src), ['./assets/coloring-cover.jpeg', './assets/coloring-pages.jpeg']);
  assert.match(coloring.gallery[0].alt, /portada/i);
  assert.match(coloring.gallery[1].alt, /interior/i);
  const expected = products.filter((product) => product.tags?.includes('colorear'));
  assert.ok(expected.length > 0);
  assert.deepEqual(filterProducts(products, 'colorear'), expected);
  assert.ok(filterProducts(products, 'imprimibles').includes(coloring));
});

test('WhatsApp usa el número de Marieta y conserva caracteres de consulta con codificación segura', () => {
  assert.equal(WHATSAPP_NUMBER, '5492646241204');
  const message = '¡Hola Marieta! Quiero Frozen & rosa + celeste. ¿Podemos? #kit / 2';
  const url = new URL(buildWhatsAppUrl(message));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/5492646241204');
  assert.equal(url.searchParams.get('text'), message);
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  assert.equal(url.hash, '');
});

test('la consulta por un diseño identifica el producto en el mensaje de WhatsApp', () => {
  for (const product of products) {
    const message = productInquiry(product);
    assert.ok(message.includes(product.name));
    const url = new URL(buildWhatsAppUrl(message));
    assert.equal(url.searchParams.get('text'), message);
  }
});

test('el alias de Mercado Pago coincide exactamente con el autorizado', () => {
  assert.equal(PAYMENT_ALIAS, 'marie.pezzutti.mp');
});
