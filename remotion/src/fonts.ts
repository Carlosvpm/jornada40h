import { continueRender, delayRender, staticFile } from "remotion";

// Fontes empacotadas localmente (public/fonts). Playfair Display é a fonte
// de título da marca; se o arquivo não existir, o navegador cai em Lora
// (mesma família editorial usada nos criativos estáticos v2/v3).
//
// Para usar o Google Fonts em vez dos arquivos locais, instale
// @remotion/google-fonts e troque este arquivo por:
//   import { loadFont } from "@remotion/google-fonts/PlayfairDisplay";
//   import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
//   loadFont("normal", { weights: ["700", "800"] }); loadInter(...)

const faces = [
  {
    family: "Playfair Display",
    file: "fonts/PlayfairDisplay-Variable.ttf",
    weight: "400 900",
  },
  { family: "Lora", file: "fonts/Lora-Variable.ttf", weight: "400 700" },
  { family: "Inter", file: "fonts/Inter-Regular.otf", weight: "400" },
  { family: "Inter", file: "fonts/Inter-Medium.otf", weight: "500" },
  { family: "Inter", file: "fonts/Inter-SemiBold.otf", weight: "600" },
  { family: "Inter", file: "fonts/Inter-Bold.otf", weight: "700" },
  { family: "Inter", file: "fonts/Inter-ExtraBold.otf", weight: "800" },
  { family: "Inter", file: "fonts/Inter-Black.otf", weight: "900" },
];

let injected = false;

export const loadBrandFonts = () => {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const css = faces
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";src:url("${staticFile(f.file)}");font-weight:${f.weight};font-display:block;}`,
    )
    .join("\n");
  const style = document.createElement("style");
  style.setAttribute("data-brand-fonts", "1");
  style.textContent =
    css +
    `\n*,*::before,*::after{box-sizing:border-box;}html,body{margin:0;padding:0;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;}`;
  document.head.appendChild(style);

  const handle = delayRender("Carregando fontes da marca");
  const done = () => continueRender(handle);
  if (document.fonts && document.fonts.ready) {
    // Força o carregamento das faces usadas.
    const loads = [
      document.fonts.load('700 10px "Playfair Display"'),
      document.fonts.load('700 10px "Lora"'),
      document.fonts.load('400 10px "Inter"'),
      document.fonts.load('800 10px "Inter"'),
    ];
    Promise.allSettled(loads).then(() => document.fonts.ready).then(done, done);
  } else {
    done();
  }
};
