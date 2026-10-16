/**
 * Ponto de entrada do renderizador de contingência. Carrega src/index.ts
 * (que chama registerRoot), coleta as composições e expõe funções globais
 * usadas pelo Playwright em render.mjs.
 */
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { FrameProvider, type CompositionMeta } from "./remotion-shim";
import "../../src/index";

declare global {
  interface Window {
    __collect: () => Promise<Omit<CompositionMeta, "component">[]>;
    __renderFrame: (id: string, frame: number) => void;
    __pending: () => number;
  }
}

let collectorRoot: Root | null = null;
let stageRoot: Root | null = null;

const stage = () => {
  let el = document.getElementById("stage");
  if (!el) {
    el = document.createElement("div");
    el.id = "stage";
    document.body.appendChild(el);
  }
  return el;
};

window.__collect = async () => {
  const Root = window.__ROOT;
  if (!Root) throw new Error("registerRoot não foi chamado");
  const el = document.createElement("div");
  el.style.display = "none";
  document.body.appendChild(el);
  collectorRoot = createRoot(el);
  flushSync(() => collectorRoot!.render(<Root />));
  await new Promise((r) => setTimeout(r, 0));
  return window.__COMPOSITIONS.map(({ component: _c, ...rest }) => rest);
};

window.__renderFrame = (id: string, frame: number) => {
  const meta = window.__COMPOSITIONS.find((c) => c.id === id);
  if (!meta) throw new Error(`Composição não encontrada: ${id}`);
  const el = stage();
  el.style.width = `${meta.width}px`;
  el.style.height = `${meta.height}px`;
  el.style.position = "relative";
  el.style.overflow = "hidden";
  document.body.style.width = `${meta.width}px`;
  document.body.style.height = `${meta.height}px`;
  document.body.style.overflow = "hidden";
  if (!stageRoot) stageRoot = createRoot(el);
  const Comp = meta.component;
  const { component: _c, ...config } = meta;
  flushSync(() =>
    stageRoot!.render(
      <FrameProvider frame={frame} config={config}>
        <Comp {...(meta.defaultProps as object)} />
      </FrameProvider>,
    ),
  );
};

window.__pending = () => window.__PENDING;
