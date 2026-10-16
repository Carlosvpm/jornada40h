// Paleta e tipografia da marca Jornada 40h.
export const colors = {
  navy: "#0B1428",
  navy2: "#0F1B33",
  navy3: "#22345E",
  gold: "#D4A72C",
  red: "#C8102E",
  green: "#1F8A70",
  paper: "#F4F1EA",
  ink: "#111111",
  inkMuted: "#555555",
  textDark: "#E7ECF5",
  muted: "#A3AEC6",
  white: "#FFFFFF",
  redSoft: "#FDECEF",
  greenSoft: "#E6F4F0",
  cellIdle: "#E6EBF5",
};

export const fonts = {
  serif: '"Playfair Display", "Lora", Georgia, "Times New Roman", serif',
  sans: '"Inter", "Helvetica Neue", Arial, sans-serif',
};

export type Tema = "escuro" | "papel";

export const temas: Record<
  Tema,
  {
    bg: string;
    bg2: string;
    text: string;
    muted: string;
    rule: string;
    accent: string;
    ctaBg: string;
    ctaText: string;
    card: string;
    cardText: string;
  }
> = {
  escuro: {
    bg: colors.navy,
    bg2: colors.navy2,
    text: colors.textDark,
    muted: colors.muted,
    rule: "rgba(231,236,245,0.18)",
    accent: colors.gold,
    ctaBg: colors.gold,
    ctaText: colors.navy,
    card: "rgba(255,255,255,0.06)",
    cardText: colors.textDark,
  },
  papel: {
    bg: colors.paper,
    bg2: "#EDE8DD",
    text: colors.ink,
    muted: colors.inkMuted,
    rule: "rgba(17,17,17,0.18)",
    accent: colors.red,
    ctaBg: colors.red,
    ctaText: colors.white,
    card: "rgba(17,17,17,0.05)",
    cardText: colors.ink,
  },
};

// Zonas seguras da interface do Instagram em 1080x1920.
export const SAFE_TOP = 250;
export const SAFE_BOTTOM = 250;
// Margem lateral padrão.
export const GUTTER = 72;

export const fmtBRL = (n: number, decimals = 0) =>
  "R$ " +
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const fmtNum = (n: number, decimals = 0) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
