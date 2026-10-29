import React, { useEffect, useRef } from 'react';
import { getHeroMotion, getNormalizedPointer } from './hero-motion.js';

const whatsappUrl = 'https://wa.me/5492646241204?text=' + encodeURIComponent('¡Hola Marieta! Vi tu catálogo de Mawe y quería contarte mi idea.');
const motionProperties = ['--rh-rotate-x', '--rh-rotate-y', '--rh-shift-x', '--rh-shift-y', '--rh-page-x', '--rh-page-y'];

function useSceneMotion(sceneRef) {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let listening = false;
    let nextPoint = { x: 0, y: 0 };

    function reset() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      nextPoint = { x: 0, y: 0 };
      motionProperties.forEach((property) => scene.style.removeProperty(property));
      delete scene.dataset.motion;
    }

    function applyMotion() {
      frame = 0;
      const motion = getHeroMotion(nextPoint);
      scene.style.setProperty('--rh-rotate-x', `${motion.rotateX.toFixed(3)}deg`);
      scene.style.setProperty('--rh-rotate-y', `${motion.rotateY.toFixed(3)}deg`);
      scene.style.setProperty('--rh-shift-x', `${motion.shiftX.toFixed(3)}px`);
      scene.style.setProperty('--rh-shift-y', `${motion.shiftY.toFixed(3)}px`);
      scene.style.setProperty('--rh-page-x', `${(-motion.shiftX * 0.55).toFixed(3)}px`);
      scene.style.setProperty('--rh-page-y', `${(-motion.shiftY * 0.55).toFixed(3)}px`);
      scene.dataset.motion = 'active';
    }

    function onPointerMove(event) {
      if (event.pointerType === 'touch') return;
      nextPoint = getNormalizedPointer(event.clientX, event.clientY, scene.getBoundingClientRect());
      if (!frame) frame = window.requestAnimationFrame(applyMotion);
    }

    function detach() {
      if (listening) {
        scene.removeEventListener('pointermove', onPointerMove);
        scene.removeEventListener('pointerleave', reset);
        scene.removeEventListener('pointercancel', reset);
        listening = false;
      }
      reset();
    }

    function syncPreferences() {
      detach();
      if (reducedMotion.matches || !finePointer.matches) return;
      scene.addEventListener('pointermove', onPointerMove, { passive: true });
      scene.addEventListener('pointerleave', reset);
      scene.addEventListener('pointercancel', reset);
      listening = true;
    }

    reducedMotion.addEventListener('change', syncPreferences);
    finePointer.addEventListener('change', syncPreferences);
    syncPreferences();

    return () => {
      detach();
      reducedMotion.removeEventListener('change', syncPreferences);
      finePointer.removeEventListener('change', syncPreferences);
    };
  }, [sceneRef]);
}

export function HeroScene() {
  const sceneRef = useRef(null);
  useSceneMotion(sceneRef);

  return (
    <div className="react-hero">
      <div className="rh-layout">
        <div className="rh-copy">
          <p className="rh-eyebrow"><span aria-hidden="true">✳</span> EL MUNDO LINDO DE MARIETA</p>
          <h1 id="hero-title" className="rh-title">
            <span className="rh-title-intro">Soy Marieta</span>{' '}
            <span className="rh-title-line">y hago <em>imprimibles,</em></span>{' '}
            <span className="rh-title-line">kits y demás</span>{' '}
            <span className="rh-title-line rh-title-finish">cosas lindas.</span>
          </h1>
          <p className="rh-description">Ideas que se vuelven papel, colores y pequeños detalles para celebrar a tu manera.</p>
          <div className="rh-actions">
            <a className="rh-primary" href="#catalogo">Explorá el catálogo <span aria-hidden="true">↗</span></a>
            <a className="rh-consult" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Contame tu idea por WhatsApp, se abre en una pestaña nueva">Contame tu idea <span aria-hidden="true">↗</span></a>
          </div>
          <a className="rh-coloring-link" href="#catalogo" data-catalog-filter="colorear">
            <span className="rh-coloring-icon" aria-hidden="true">✎</span>
            <span>Un ratito para vos.<strong>Descubrí los libros para colorear <span aria-hidden="true">↗</span></strong></span>
          </a>
        </div>

        <figure className="rh-scene" ref={sceneRef} aria-label="Tapa y páginas de los libros para colorear CATMOM de Mawe">
          <div className="rh-scene-disc" aria-hidden="true" />
          <div className="rh-scene-orbit" aria-hidden="true" />
          <span className="rh-doodle rh-doodle-star" aria-hidden="true">✧</span>
          <span className="rh-doodle rh-doodle-flower" aria-hidden="true">✳</span>
          <div className="rh-ground-shadow" aria-hidden="true" />

          <div className="rh-book" aria-hidden="true">
            <div className="rh-book-back" />
            <div className="rh-book-spine"><span>mawe · colorear</span></div>
            <div className="rh-book-edge rh-book-edge-right" />
            <div className="rh-book-edge rh-book-edge-top" />
            <div className="rh-book-edge rh-book-edge-bottom" />
            <div className="rh-book-front">
              <img src="./assets/coloring-cover.jpeg" alt="" width="720" height="960" fetchPriority="high" decoding="async" />
            </div>
          </div>

          <div className="rh-page-card" aria-hidden="true">
            <span className="rh-page-tape" />
            <img src="./assets/coloring-pages.jpeg" alt="" width="600" height="800" decoding="async" />
            <span className="rh-page-note">un color a la vez ♡</span>
          </div>

          <div className="rh-brand-seal" aria-hidden="true"><img src="./assets/brand-m.jpg" alt="" width="200" height="200" decoding="async" /></div>
          <div className="rh-paper-stamp" aria-hidden="true"><span>menos apuro,</span><strong>más color.</strong><span className="rh-stamp-heart">♡</span></div>
          <figcaption className="rh-scene-caption">para crear, regalar y disfrutar.</figcaption>
        </figure>
      </div>
    </div>
  );
}

export default HeroScene;
