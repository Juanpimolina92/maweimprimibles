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
    assert.match(product.image, /^\/assets\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/);
    for (const field of ['name', 'label', 'alt', 'description']) {
      assert.equal(typeof product[field], 'string');
      assert.ok(product[field].trim().length > 0, `${product.id}: falta ${field}`);
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
