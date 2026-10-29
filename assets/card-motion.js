import { getHeroMotion, getNormalizedPointer } from './hero-motion.js';

export function attachCardMotion(container) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let active = null;
  let frame = 0;
  let pointer = null;
  const properties = ['--card-rx', '--card-ry', '--card-glow-x', '--card-glow-y'];

  function reset() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (active) {
      active.classList.remove('is-pointer-active');
      properties.forEach(property => active.style.removeProperty(property));
    }
    active = null;
    pointer = null;
  }
  function update() {
    frame = 0;
    if (!active?.isConnected || !pointer || reduced.matches || !fine.matches) return reset();
    const point = getNormalizedPointer(pointer.x, pointer.y, active.getBoundingClientRect());
    const motion = getHeroMotion(point);
    active.classList.add('is-pointer-active');
    active.style.setProperty('--card-rx', `${(motion.rotateX * 0.6).toFixed(3)}deg`);
    active.style.setProperty('--card-ry', `${(motion.rotateY * 0.6).toFixed(3)}deg`);
    active.style.setProperty('--card-glow-x', `${((point.x + 1) * 50).toFixed(2)}%`);
    active.style.setProperty('--card-glow-y', `${((point.y + 1) * 50).toFixed(2)}%`);
  }
  function move(event) {
    if (event.pointerType === 'touch' || reduced.matches || !fine.matches) return;
    const target = event.target.closest('.product-card');
    if (!target || !container.contains(target)) return reset();
    if (active !== target) { reset(); active = target; }
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(update);
  }
  container.addEventListener('pointermove', move, { passive: true });
  container.addEventListener('pointerleave', reset);
  container.addEventListener('pointercancel', reset);
  reduced.addEventListener('change', reset);
  fine.addEventListener('change', reset);
  return {
    reset,
    destroy() {
      reset();
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerleave', reset);
      container.removeEventListener('pointercancel', reset);
      reduced.removeEventListener('change', reset);
      fine.removeEventListener('change', reset);
    },
  };
}
