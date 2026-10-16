import React from "react";
import { colors, fonts, temas, type Tema } from "../theme";

export const BrandMark: React.FC<{ tema: Tema; size?: number }> = ({
  tema,
  size = 56,
}) => {
  const t = temas[tema];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.26,
          background: colors.gold,
          color: colors.navy,
          fontFamily: fonts.sans,
          fontWeight: 900,
          fontSize: size * 0.46,
          letterSpacing: "-0.02em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        40h
      </div>
      <div
        style={{
          fontFamily: fonts.serif,
          fontWeight: 700,
          fontSize: size * 0.6,
          color: t.text,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        Jornada 40h
      </div>
    </div>
  );
};

export const BrandBar: React.FC<{
  tema: Tema;
  right?: string;
  size?: number;
  rule?: boolean;
}> = ({ tema, right, size = 56, rule = true }) => {
  const t = temas[tema];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: rule ? 22 : 0,
        borderBottom: rule ? `3px solid ${t.rule}` : "none",
        width: "100%",
      }}
    >
      <BrandMark tema={tema} size={size} />
      {right ? (
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: 26,
            color: t.muted,
            whiteSpace: "nowrap",
          }}
        >
          {right}
        </div>
      ) : null}
    </div>
  );
};
