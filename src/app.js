import { products, filterProducts, buildWhatsAppUrl, productInquiry, PAYMENT_ALIAS } from './catalog.js';

const grid = document.querySelector('#catalog-grid');
const count = document.querySelector('#catalog-count');
const productDialog = document.querySelector('#product-dialog');
const paymentDialog = document.querySelector('#payment-dialog');
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-navigation');
let dialogTrigger = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function createProductCard(product) {
  const card = element('article', `product-card ${product.color}`);
  const imageButton = element('button', 'product-image-button');
  imageButton.type = 'button';
  imageButton.dataset.productId = product.id;
  imageButton.setAttribute('aria-label', `Ver detalle: ${product.name}`);
  const image = element('img', 'product-image');
  image.src = product.image;
  image.alt = product.alt;
  image.width = 600;
  image.height = 600;
  image.loading = 'lazy';
  image.decoding = 'async';
  const view = element('span', 'product-view', '↗');
  view.setAttribute('aria-hidden', 'true');
  imageButton.append(image, view);

  const body = element('div', 'product-card-body');
  const label = element('span', 'product-label', product.label);
  const heading = element('h3');
  const titleButton = element('button', 'product-title-button', product.name);
  titleButton.type = 'button';
  titleButton.dataset.productId = product.id;
  heading.append(titleButton);
  const inquiry = element('a', 'text-link', 'Consultar este diseño ↗');
  inquiry.href = buildWhatsAppUrl(productInquiry(product));
  inquiry.target = '_blank';
  inquiry.rel = 'noopener noreferrer';
  inquiry.setAttribute('aria-label', `Consultar por WhatsApp: ${product.name}`);
  body.append(label, heading, inquiry);
  card.append(imageButton, body);
  return card;
}

function renderCatalog(category = 'todos') {
  const visibleProducts = filterProducts(products, category);
  const fragment = document.createDocumentFragment();
  visibleProducts.forEach((product) => fragment.append(createProductCard(product)));
  grid.replaceChildren(fragment);
  count.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? 'diseño para inspirarte' : 'diseños para inspirarte'}`;
}

function openDialog(dialog, trigger) {
  if (dialog.open) return;
  dialogTrigger = trigger;
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function openProduct(product, trigger) {
  document.querySelector('#product-dialog-title').textContent = product.name;
  document.querySelector('#product-dialog-label').textContent = product.label;
  document.querySelector('#product-dialog-description').textContent = product.description;
  const image = document.querySelector('#product-dialog-image');
  image.src = product.image;
  image.alt = product.alt;
  const whatsapp = document.querySelector('#product-dialog-whatsapp');
  whatsapp.href = buildWhatsAppUrl(productInquiry(product));
  openDialog(productDialog, trigger);
}

document.querySelectorAll('.filter-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-button').forEach((filter) => {
      const selected = filter === button;
      filter.classList.toggle('is-active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    renderCatalog(button.dataset.category);
  });
});

grid.addEventListener('click', (event) => {
  const trigger = event.target.closest('button[data-product-id]');
  if (!trigger) return;
  const product = products.find((item) => item.id === trigger.dataset.productId);
  if (product) openProduct(product, trigger);
});

document.querySelectorAll('[data-open-payment]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    document.querySelector('#payment-status').textContent = '';
    document.querySelector('#copy-alias').textContent = 'Copiar alias';
    openDialog(paymentDialog, trigger);
  });
});

[productDialog, paymentDialog].forEach((dialog) => {
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (dialogTrigger?.isConnected) dialogTrigger.focus({ preventScroll: true });
    dialogTrigger = null;
  });
});

document.querySelector('#copy-alias').addEventListener('click', async (event) => {
  const status = document.querySelector('#payment-status');
  const button = event.currentTarget;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(PAYMENT_ALIAS);
    button.textContent = '¡Alias copiado!';
    status.textContent = 'Alias copiado. Podés pegarlo en Mercado Pago.';
  } catch {
    const alias = document.querySelector('#payment-alias');
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(alias);
    selection?.removeAllRanges();
    selection?.addRange(range);
    status.textContent = 'Seleccioné el alias para vos. Copialo con el menú de tu dispositivo o con Ctrl+C.';
  }
});

function setMenuOpen(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  navigation.classList.toggle('is-open', open);
}

menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenuOpen(false);
    menuToggle.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header')) setMenuOpen(false);
});

document.querySelectorAll('a.whatsapp-link').forEach((link) => {
  link.href = buildWhatsAppUrl();
});

renderCatalog();

if (window.bootstrap?.Carousel) {
  new window.bootstrap.Carousel(document.querySelector('#design-carousel'), { interval: false, ride: false, keyboard: true, touch: true });
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (window.AOS && !reducedMotion.matches) {
  try {
    window.AOS.init({ duration: 500, once: true, offset: 45, easing: 'ease-out', disable: () => reducedMotion.matches });
    document.documentElement.classList.add('aos-ready');
  } catch {
    document.documentElement.classList.remove('aos-ready');
  }
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) document.documentElement.classList.remove('aos-ready');
});
