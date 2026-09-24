import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { buildStreetScene } from './buildStreetScene';

type Props = {
  className?: string;
  /** Called once if WebGL is unavailable, so the page can show a flat fallback. */
  onUnsupported?: () => void;
};

/**
 * Full-bleed 3D hero: the StreetBiz block at night, framed so the street sits
 * to the right of the headline on wide screens. The camera eases toward the
 * pointer and sways slowly on its own.
 *
 * Loaded lazily (three.js stays out of every other route's bundle). Pauses
 * off screen and in background tabs; renders one still frame under
 * prefers-reduced-motion; drops shadows and resolution on small screens.
 */
export default function StreetScene3D({ className = '', onUnsupported }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      onUnsupported?.();
      return undefined;
    }

    const small = window.matchMedia('(max-width: 767px)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !small;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    const { scene, update, dispose } = buildStreetScene({ shadows: !small });
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.95, 0.55, 0.62);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // Where the camera looks. On wide screens the look target sits left of the
    // street so the street itself lands on the right half, beside the text.
    const base = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    const frame = () => {
      const { width, height } = host.getBoundingClientRect();
      const w = Math.max(1, width);
      const h = Math.max(1, height);
      const wide = w / h > 1.1;
      camera.aspect = w / h;
      camera.fov = wide ? 30 : 44;
      camera.updateProjectionMatrix();
      base.pos.set(wide ? -3 : 0, wide ? 15 : 16, wide ? 29 : 30);
      base.look.set(wide ? -8.5 : 0, 0, wide ? -5.5 : -3);
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.resolution.set(w, h);
      if (reduceMotion || !running) draw(4);
    };

    const pointer = new THREE.Vector2();
    const eased = new THREE.Vector2();
    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const draw = (t: number) => {
      eased.lerp(pointer, 0.045);
      update(t);
      const sway = reduceMotion ? 0 : Math.sin(t * 0.12) * 1.4;
      camera.position.set(
        base.pos.x + eased.x * 2.6 + sway,
        base.pos.y - eased.y * 1.2,
        base.pos.z,
      );
      camera.lookAt(base.look.x + eased.x * 0.8, base.look.y, base.look.z);
      composer.render();
    };

    const startedAt = performance.now();
    let raf = 0;
    let visible = true;
    let running = false;
    let shown = false;

    const loop = (now: number) => {
      draw((now - startedAt) / 1000 + 4);
      if (!shown) {
        shown = true;
        setReady(true);
      }
      running = visible && !document.hidden;
      raf = running ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (reduceMotion || raf || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const resizeObserver = new ResizeObserver(frame);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
    });
    const onVisibility = () => start();

    resizeObserver.observe(host);
    intersection.observe(host);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    frame();
    if (reduceMotion) {
      draw(4);
      setReady(true);
    } else {
      start();
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      dispose();
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onUnsupported]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${ready ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}
