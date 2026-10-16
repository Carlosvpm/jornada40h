/**
 * Shim mínimo da API do Remotion usado SOMENTE pelo renderizador de
 * contingência (scripts/fallback/render.mjs), quando o pacote `remotion`
 * não pôde ser instalado (registro npm bloqueado). O código em src/ importa
 * de "remotion" normalmente; o esbuild redireciona para este arquivo.
 *
 * Implementa: AbsoluteFill, Sequence, Composition, Folder, registerRoot,
 * useCurrentFrame, useVideoConfig, interpolate, spring, Easing, staticFile,
 * delayRender, continueRender, Img.
 */
import React, { createContext, useContext, useLayoutEffect } from "react";

// ---------- contexto de frame / config ----------
export type VideoConfig = {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  defaultProps: Record<string, unknown>;
};

const FrameCtx = createContext<number>(0);
const ConfigCtx = createContext<VideoConfig>({
  id: "",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 1,
  defaultProps: {},
});

export const FrameProvider: React.FC<{ frame: number; config: VideoConfig; children: React.ReactNode }> = ({
  frame,
  config,
  children,
}) => (
  <ConfigCtx.Provider value={config}>
    <FrameCtx.Provider value={frame}>{children}</FrameCtx.Provider>
  </ConfigCtx.Provider>
);

export const useCurrentFrame = () => useContext(FrameCtx);
export const useVideoConfig = () => useContext(ConfigCtx);

// ---------- layout ----------
export const AbsoluteFill: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ style, children, ...rest }) => (
  <div
    {...rest}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Sequence: React.FC<{
  from?: number;
  durationInFrames?: number;
  name?: string;
  layout?: "absolute-fill" | "none";
  children: React.ReactNode;
}> = ({ from = 0, durationInFrames = Infinity, layout = "absolute-fill", children }) => {
  const frame = useCurrentFrame();
  const rel = frame - from;
  if (rel < 0 || rel >= durationInFrames) return null;
  const cfg = useVideoConfig();
  const inner = (
    <ConfigCtx.Provider value={{ ...cfg, durationInFrames: Number.isFinite(durationInFrames) ? durationInFrames : cfg.durationInFrames }}>
      <FrameCtx.Provider value={rel}>{children}</FrameCtx.Provider>
    </ConfigCtx.Provider>
  );
  return layout === "none" ? inner : <AbsoluteFill>{inner}</AbsoluteFill>;
};

// ---------- registro de composições ----------
export type CompositionMeta = VideoConfig & { component: React.ComponentType<any> };

declare global {
  interface Window {
    __COMPOSITIONS: CompositionMeta[];
    __ROOT: React.ComponentType | null;
    __PENDING: number;
  }
}

const g = globalThis as unknown as Window;
g.__COMPOSITIONS = g.__COMPOSITIONS ?? [];
g.__ROOT = g.__ROOT ?? null;
g.__PENDING = g.__PENDING ?? 0;

export const Composition: React.FC<{
  id: string;
  component: React.ComponentType<any>;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  defaultProps?: Record<string, unknown>;
}> = ({ id, component, width, height, fps, durationInFrames, defaultProps = {} }) => {
  useLayoutEffect(() => {
    const list = g.__COMPOSITIONS;
    const idx = list.findIndex((c) => c.id === id);
    const meta: CompositionMeta = { id, component, width, height, fps, durationInFrames, defaultProps };
    if (idx >= 0) list[idx] = meta;
    else list.push(meta);
  }, [id, component, width, height, fps, durationInFrames, defaultProps]);
  return null;
};

export const Folder: React.FC<{ name: string; children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const registerRoot = (Root: React.ComponentType) => {
  g.__ROOT = Root;
};

// ---------- utilidades ----------
export const staticFile = (path: string) => `/public/${path.replace(/^\/+/, "")}`;

export const delayRender = (_label?: string) => {
  g.__PENDING += 1;
  return g.__PENDING;
};
export const continueRender = (_handle: number) => {
  g.__PENDING = Math.max(0, g.__PENDING - 1);
};

export const Img: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => <img {...props} />;

// ---------- interpolate ----------
type Extrapolate = "extend" | "clamp" | "identity";
export function interpolate(
  input: number,
  inputRange: number[],
  outputRange: number[],
  options: { easing?: (t: number) => number; extrapolateLeft?: Extrapolate; extrapolateRight?: Extrapolate } = {},
): number {
  const { easing = (t) => t, extrapolateLeft = "extend", extrapolateRight = "extend" } = options;
  if (inputRange.length !== outputRange.length || inputRange.length < 2) {
    throw new Error("interpolate: inputRange e outputRange precisam ter o mesmo tamanho (>= 2)");
  }
  const n = inputRange.length;
  if (input < inputRange[0]) {
    if (extrapolateLeft === "clamp") return outputRange[0];
    if (extrapolateLeft === "identity") return input;
  }
  if (input > inputRange[n - 1]) {
    if (extrapolateRight === "clamp") return outputRange[n - 1];
    if (extrapolateRight === "identity") return input;
  }
  let i = 0;
  while (i < n - 2 && input >= inputRange[i + 1]) i++;
  const x0 = inputRange[i];
  const x1 = inputRange[i + 1];
  const y0 = outputRange[i];
  const y1 = outputRange[i + 1];
  if (x1 === x0) return y1;
  let t = (input - x0) / (x1 - x0);
  // easing só se aplica dentro do intervalo
  if (t >= 0 && t <= 1) t = easing(t);
  return y0 + (y1 - y0) * t;
}

// ---------- Easing ----------
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const cx2 = sampleX(t);
      if (Math.abs(cx2 - x) < 1e-6) return t;
      if (x > cx2) lo = t; else hi = t;
      t = (hi - lo) / 2 + lo;
    }
    return t;
  };
  return (x: number) => sampleY(solve(x));
};

type Fn = (t: number) => number;
export const Easing = {
  linear: ((t) => t) as Fn,
  ease: bezier(0.42, 0, 1, 1),
  quad: ((t) => t * t) as Fn,
  cubic: ((t) => t * t * t) as Fn,
  poly: (n: number): Fn => (t) => Math.pow(t, n),
  sin: ((t) => 1 - Math.cos((t * Math.PI) / 2)) as Fn,
  circle: ((t) => 1 - Math.sqrt(1 - t * t)) as Fn,
  exp: ((t) => Math.pow(2, 10 * (t - 1))) as Fn,
  elastic: (bounciness = 1): Fn => {
    const p = bounciness * Math.PI;
    return (t) => 1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p);
  },
  back: (s = 1.70158): Fn => (t) => t * t * ((s + 1) * t - s),
  bounce: ((t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { const t2 = t - 1.5 / 2.75; return 7.5625 * t2 * t2 + 0.75; }
    if (t < 2.5 / 2.75) { const t2 = t - 2.25 / 2.75; return 7.5625 * t2 * t2 + 0.9375; }
    const t2 = t - 2.625 / 2.75; return 7.5625 * t2 * t2 + 0.984375;
  }) as Fn,
  bezier,
  in: (e: Fn): Fn => e,
  out: (e: Fn): Fn => (t) => 1 - e(1 - t),
  inOut: (e: Fn): Fn => (t) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2),
};

// ---------- spring ----------
export type SpringConfig = { damping?: number; mass?: number; stiffness?: number; overshootClamping?: boolean };

const springAt = (t: number, from: number, to: number, cfg: Required<SpringConfig>) => {
  const { damping: c, mass: m, stiffness: k } = cfg;
  const d = to - from;
  if (t <= 0) return from;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  let x: number;
  if (zeta < 1) {
    const w1 = w0 * Math.sqrt(1 - zeta * zeta);
    x = to - d * Math.exp(-zeta * w0 * t) * (Math.cos(w1 * t) + ((zeta * w0) / w1) * Math.sin(w1 * t));
  } else if (zeta === 1) {
    x = to - d * Math.exp(-w0 * t) * (1 + w0 * t);
  } else {
    const w2 = w0 * Math.sqrt(zeta * zeta - 1);
    x = to - d * Math.exp(-zeta * w0 * t) * (Math.cosh(w2 * t) + ((zeta * w0) / w2) * Math.sinh(w2 * t));
  }
  if (cfg.overshootClamping) {
    x = to > from ? Math.min(x, to) : Math.max(x, to);
  }
  return x;
};

export const measureSpring = ({ fps, config = {}, threshold = 0.005 }: { fps: number; config?: SpringConfig; threshold?: number }) => {
  const cfg = { damping: 10, mass: 1, stiffness: 100, overshootClamping: false, ...config };
  const max = fps * 20;
  let settledFrom = max;
  for (let f = max; f >= 0; f--) {
    const x = springAt(f / fps, 0, 1, cfg);
    if (Math.abs(1 - x) > threshold) { settledFrom = f + 1; break; }
  }
  return settledFrom;
};

export function spring({
  frame,
  fps,
  config = {},
  from = 0,
  to = 1,
  durationInFrames,
  delay = 0,
}: {
  frame: number;
  fps: number;
  config?: SpringConfig;
  from?: number;
  to?: number;
  durationInFrames?: number;
  delay?: number;
}): number {
  const cfg = { damping: 10, mass: 1, stiffness: 100, overshootClamping: false, ...config };
  let f = frame - delay;
  if (durationInFrames !== undefined) {
    const natural = measureSpring({ fps, config: cfg });
    f = (f / durationInFrames) * natural;
  }
  if (f <= 0) return from;
  return springAt(f / fps, from, to, cfg);
}

export const random = (seed: string | number | null) => {
  let h = 2166136261;
  const s = String(seed ?? "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
};
