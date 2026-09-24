import { useEffect, useRef } from 'react';

/**
 * A breathing grid of dots, like lit stalls seen from above at night.
 *
 * Ported from ThreeUI Community's `DotMatrixBackground` (MIT, Meng To,
 * github.com/MengTo/threeui). The original renders the same fragment shader
 * through Three.js; this version drives it with raw WebGL so the landing page
 * does not pull in a 600 kB 3D library for one full-screen quad. The shader now
 * blends two brand colours instead of a fixed cyan.
 *
 * Decorative only: it is aria-hidden, ignores pointer events, pauses when off
 * screen or in a background tab, draws a single still frame under
 * `prefers-reduced-motion`, and renders nothing if WebGL is unavailable (the
 * parent's background shows through).
 */

type Rgb = readonly [number, number, number];

type Props = {
  /** Distance between dots in CSS pixels, so density is the same on every screen size. */
  cellSize?: number;
  /** 0–1 overall strength. */
  opacity?: number;
  /** How far the grid drifts toward the pointer. */
  mouseAmount?: number;
  pulseSpeed?: number;
  /** Colour of dots at the bottom of their pulse (0–255 RGB). */
  from?: Rgb;
  /** Colour of dots at the top of their pulse. */
  to?: Rgb;
  className?: string;
};

const VERTEX = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const FRAGMENT = `
precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uGridScale;
uniform float uMouseAmount;
uniform float uPulseSpeed;
uniform float uOpacity;
uniform vec3 uFrom;
uniform vec3 uTo;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  uv.x *= aspect;
  uv += uMouse * uMouseAmount;

  vec2 grid = fract(uv * uGridScale);
  vec2 id = floor(uv * uGridScale);
  float dist = length(grid - vec2(0.5));

  // A slow diagonal wave plus a per-cell offset, so neighbouring dots
  // breathe out of step instead of flashing in unison.
  float seed = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
  float pulse = sin(uTime * uPulseSpeed + id.x * 0.09 + id.y * 0.06 + seed * 2.4) * 0.5 + 0.5;
  float radius = 0.07 + pulse * 0.15;
  float alpha = smoothstep(radius, radius - 0.05, dist);

  // Fade toward the edges so text over the centre stays readable.
  vec2 center = vec2(0.62 * aspect, 0.55);
  float depthFade = smoothstep(1.25, 0.05, length(uv - center));

  vec3 color = mix(uFrom, uTo, pulse * pulse);
  float a = alpha * depthFade * uOpacity * (0.35 + pulse * 0.65);
  gl_FragColor = vec4(color * a, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const normalise = (c: Rgb) => [c[0] / 255, c[1] / 255, c[2] / 255] as const;

export function DotMatrixField({
  cellSize = 24,
  opacity = 0.55,
  mouseAmount = 0.035,
  pulseSpeed = 0.9,
  from = [228, 68, 31],
  to = [255, 190, 70],
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef({ cellSize, opacity, mouseAmount, pulseSpeed, from, to });
  optionsRef.current = { cellSize, opacity, mouseAmount, pulseSpeed, from, to };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof WebGLRenderingContext === 'undefined') return undefined;
    const gl = (() => {
      try {
        return canvas.getContext('webgl', {
          alpha: true,
          antialias: true,
          premultipliedAlpha: true,
        });
      } catch {
        return null;
      }
    })();
    if (!gl) return undefined;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return undefined;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uTime = u('uTime');
    const uResolution = u('uResolution');
    const uMouse = u('uMouse');
    const uGridScale = u('uGridScale');
    const uMouseAmount = u('uMouseAmount');
    const uPulseSpeed = u('uPulseSpeed');
    const uOpacity = u('uOpacity');
    const uFrom = u('uFrom');
    const uTo = u('uTo');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const startedAt = performance.now();
    let frame = 0;
    let ratio = 1;
    let visible = true;

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (reduceMotion) draw(0);
    };

    const draw = (seconds: number) => {
      const o = optionsRef.current;
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;
      gl.uniform1f(uTime, seconds);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uGridScale, canvas.height / (o.cellSize * ratio));
      gl.uniform1f(uMouseAmount, o.mouseAmount);
      gl.uniform1f(uPulseSpeed, o.pulseSpeed);
      gl.uniform1f(uOpacity, o.opacity);
      gl.uniform3fv(uFrom, normalise(o.from));
      gl.uniform3fv(uTo, normalise(o.to));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = (now: number) => {
      draw((now - startedAt) / 1000);
      frame = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!reduceMotion && !frame && visible && !document.hidden)
        frame = requestAnimationFrame(loop);
    };

    const onPointer = (event: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      target.x = ((event.clientX - b.left) / Math.max(1, b.width)) * 2 - 1;
      target.y = -(((event.clientY - b.top) / Math.max(1, b.height)) * 2 - 1);
    };
    const onVisibility = () => start();

    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
    });
    resizeObserver.observe(canvas);
    intersection.observe(canvas);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    if (reduceMotion) draw(0);
    else start();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
