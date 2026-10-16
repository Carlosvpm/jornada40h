import React from "react";
import { interpolate, Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fmtBRL, fmtNum, fonts, temas, type Tema } from "../theme";

/**
 * Número grande animado (contagem com easing). Formata em pt-BR.
 * formato "moeda" -> R$ 3.060 ; "numero" -> 3.060 ; decimais opcionais.
 */
export const BigNumber: React.FC<{
  tema: Tema;
  valor: number;
  de?: number;
  prefixo?: string;
  sufixo?: string;
  rotulo?: string;
  formato?: "moeda" | "numero";
  decimais?: number;
  size?: number;
  color?: string;
  animate?: boolean;
  delay?: number;
  duracao?: number; // frames da contagem
  align?: "left" | "center";
  sufixoSize?: number;
}> = ({
  tema,
  valor,
  de = 0,
  prefixo = "",
  sufixo = "",
  rotulo,
  formato = "numero",
  decimais = 0,
  size = 180,
  color,
  animate = false,
  delay = 0,
  duracao = 40,
  align = "left",
  sufixoSize,
}) => {
  const t = temas[tema];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = animate
    ? interpolate(frame - delay, [0, duracao], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    : 1;
  const atual = de + (valor - de) * progress;
  const texto =
    formato === "moeda" ? fmtBRL(atual, decimais) : fmtNum(atual, decimais);
  const pop = animate
    ? spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 110 } })
    : 1;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        transform: `scale(${0.9 + 0.1 * pop})`,
        transformOrigin: align === "center" ? "center" : "left center",
        opacity: animate ? Math.min(1, pop * 1.4) : 1,
      }}
    >
      <div
        style={{
          fontFamily: fonts.serif,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          color: color ?? t.text,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          textAlign: align,
        }}
      >
        {prefixo}
        {texto}
        {sufixo ? (
          <span
            style={{
              fontFamily: fonts.sans,
              fontWeight: 800,
              fontSize: sufixoSize ?? size * 0.36,
              letterSpacing: "-0.01em",
              marginLeft: "0.08em",
            }}
          >
            {sufixo}
          </span>
        ) : null}
      </div>
      {rotulo ? (
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: Math.max(30, size * 0.2),
            color: t.muted,
            marginTop: 18,
            textAlign: align,
          }}
        >
          {rotulo}
        </div>
      ) : null}
    </div>
  );
};
