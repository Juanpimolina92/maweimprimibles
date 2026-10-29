export const HERO_MOTION_LIMITS = Object.freeze({
  rotateX: 6,
  rotateY: 8,
  shiftX: 7,
  shiftY: 5,
});

export function clamp(value, minimum = -1, maximum = 1) {
  const finiteValue = Number.isFinite(value) ? value : 0;
  return Math.min(maximum, Math.max(minimum, finiteValue));
}

export function getNormalizedPointer(clientX, clientY, rect) {
  if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)
    || rect.width <= 0 || rect.height <= 0 || !Number.isFinite(rect.left)
    || !Number.isFinite(rect.top) || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 2 - 1),
    y: clamp(((clientY - rect.top) / rect.height) * 2 - 1),
  };
}

export function getHeroMotion(point = {}) {
  const x = clamp(point?.x);
  const y = clamp(point?.y);
  return {
    rotateX: -y * HERO_MOTION_LIMITS.rotateX || 0,
    rotateY: x * HERO_MOTION_LIMITS.rotateY || 0,
    shiftX: x * HERO_MOTION_LIMITS.shiftX || 0,
    shiftY: y * HERO_MOTION_LIMITS.shiftY || 0,
  };
}
