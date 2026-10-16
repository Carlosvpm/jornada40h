import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { fonts, SAFE_BOTTOM, GUTTER } from "../theme";

/**
 * Legenda queimada no vídeo, posicionada acima da zona segura inferior do IG.
 * Entra com fade curto e sai com fade no fim da Sequence (via `duration`).
 */
export const Caption: React.FC<{
  children: React.ReactNode;
  duration: number;
  size?: number;
}> = ({ children, duration, size = 38 }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 8, duration - 8, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: GUTTER,
        right: GUTTER,
        bottom: SAFE_BOTTOM + 20,
        display: "flex",
        justifyContent: "center",
        opacity: op,
      }}
    >
      <div
        style={{
          background: "rgba(11,20,40,0.82)",
          color: "#FFFFFF",
          fontFamily: fonts.sans,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.3,
          textAlign: "center",
          padding: "18px 30px",
          borderRadius: 18,
          maxWidth: 1080 - GUTTER * 2,
          boxDecorationBreak: "clone" as never,
        }}
      >
        {children}
      </div>
    </div>
  );
};
