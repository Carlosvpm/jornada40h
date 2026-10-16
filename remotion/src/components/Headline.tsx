import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts, temas, type Tema } from "../theme";

export const Kicker: React.FC<{
  tema: Tema;
  children: React.ReactNode;
  color?: string;
  size?: number;
  animate?: boolean;
  delay?: number;
}> = ({ tema, children, color, size = 28, animate = false, delay = 0 }) => {
  const t = temas[tema];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = animate
    ? interpolate(frame - delay, [0, 10], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  return (
    <div
      style={{
        fontFamily: fonts.sans,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: color ?? t.accent,
        opacity: op,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          borderRadius: 7,
          background: color ?? t.accent,
          flex: "none",
          transform: animate
            ? `scale(${spring({ frame: frame - delay, fps, config: { damping: 12 } })})`
            : undefined,
        }}
      />
      <span>{children}</span>
    </div>
  );
};

/**
 * Título em Playfair. Com `animate`, as palavras sobem uma a uma (spring).
 * `destaques`: palavras (ou trechos) que devem receber a cor de destaque.
 */
export const Headline: React.FC<{
  tema: Tema;
  children: string;
  size?: number;
  animate?: boolean;
  delay?: number;
  color?: string;
  align?: "left" | "center";
  destaques?: string[];
  lineHeight?: number;
  staggerFrames?: number;
}> = ({
  tema,
  children,
  size = 84,
  animate = false,
  delay = 0,
  color,
  align = "left",
  destaques = [],
  lineHeight = 1.04,
  staggerFrames = 3,
}) => {
  const t = temas[tema];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = children.split(" ");
  const lower = destaques.map((d) => d.replace(/[.,?!:;]/g, "").toLowerCase());
  return (
    <h1
      style={{
        fontFamily: fonts.serif,
        fontWeight: 700,
        fontSize: size,
        lineHeight,
        letterSpacing: "-0.015em",
        color: color ?? t.text,
        margin: 0,
        textAlign: align,
        textWrap: "balance" as never,
      }}
    >
      {words.map((w, i) => {
        const clean = w.replace(/[.,?!:;]/g, "").toLowerCase();
        const hl = lower.includes(clean);
        let style: React.CSSProperties = {
          display: "inline-block",
          marginRight: "0.26em",
          color: hl ? t.accent : undefined,
        };
        if (animate) {
          const s = spring({
            frame: frame - delay - i * staggerFrames,
            fps,
            config: { damping: 200, stiffness: 120, mass: 0.9 },
          });
          style = {
            ...style,
            opacity: s,
            transform: `translateY(${(1 - s) * 0.6 * size}px)`,
          };
        }
        return (
          <span key={i} style={style}>
            {w}
          </span>
        );
      })}
    </h1>
  );
};

export const Body: React.FC<{
  tema: Tema;
  children: React.ReactNode;
  size?: number;
  animate?: boolean;
  delay?: number;
  color?: string;
  align?: "left" | "center";
  weight?: number;
  serif?: boolean;
}> = ({
  tema,
  children,
  size = 38,
  animate = false,
  delay = 0,
  color,
  align = "left",
  weight = 400,
  serif = false,
}) => {
  const t = temas[tema];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = animate
    ? spring({ frame: frame - delay, fps, config: { damping: 200 } })
    : 1;
  return (
    <p
      style={{
        fontFamily: serif ? fonts.serif : fonts.sans,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.4,
        color: color ?? (tema === "escuro" ? "#D5DBE8" : "#333"),
        margin: 0,
        textAlign: align,
        opacity: s,
        transform: `translateY(${(1 - s) * 24}px)`,
      }}
    >
      {children}
    </p>
  );
};
