import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { fonts, temas, type Tema } from "../theme";

/** Bloco de CTA: botão + rodapé "link na bio". */
export const CTACard: React.FC<{
  tema: Tema;
  botao: string;
  rodape?: string;
  animate?: boolean;
  delay?: number;
  size?: number;
  width?: string | number;
}> = ({ tema, botao, rodape = "link na bio", animate = false, delay = 0, size = 44, width = "100%" }) => {
  const t = temas[tema];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = animate ? spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } }) : 1;
  // Pulso suave contínuo depois de entrar
  const pulse = animate
    ? 1 + 0.012 * Math.sin(((frame - delay) / fps) * Math.PI * 2 * 0.8) * interpolate(frame - delay, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: Math.min(1, s * 1.2),
        transform: `translateY(${(1 - s) * 40}px) scale(${pulse})`,
      }}
    >
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: t.ctaBg,
          color: t.ctaText,
          fontFamily: fonts.sans,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.15,
          textAlign: "center",
          borderRadius: 22,
          padding: `${size * 0.75}px ${size}px`,
          boxShadow: tema === "escuro" ? "0 18px 50px rgba(212,167,44,0.28)" : "0 18px 50px rgba(200,16,46,0.22)",
        }}
      >
        {botao}
      </div>
      {rodape ? (
        <div
          style={{
            marginTop: 20,
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: Math.max(26, size * 0.6),
            color: t.muted,
            textAlign: "center",
          }}
        >
          {rodape}
        </div>
      ) : null}
    </div>
  );
};

/** Indicador "→ arraste" no canto inferior direito dos slides de carrossel. */
export const Arraste: React.FC<{ tema: Tema }> = ({ tema }) => {
  const t = temas[tema];
  return (
    <div
      style={{
        fontFamily: fonts.sans,
        fontWeight: 700,
        fontSize: 28,
        color: t.muted,
        letterSpacing: "0.02em",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 34, lineHeight: 1 }}>→</span>
      <span>arraste</span>
    </div>
  );
};

/** Contador de slide "2 / 6". */
export const SlideCount: React.FC<{ tema: Tema; atual: number; total: number }> = ({ tema, atual, total }) => {
  const t = temas[tema];
  return (
    <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 26, color: t.muted, fontVariantNumeric: "tabular-nums" }}>
      {atual} / {total}
    </div>
  );
};
