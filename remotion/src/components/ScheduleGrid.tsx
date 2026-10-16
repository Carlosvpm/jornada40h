import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Escala } from "../data";
import { colors, fonts } from "../theme";

type Props = {
  escala: Escala;
  /** frame em que a primeira célula aparece (relativo à Sequence atual) */
  startFrame?: number;
  /** frames entre uma célula e a próxima (preenche dia a dia) */
  framesPerCell?: number;
  /** frame em que a linha "falta" aparece; undefined = junto com a última célula */
  faltaFrame?: number;
  /** frame em que a linha de solução aparece; undefined = não mostra */
  solucaoFrame?: number;
  /** sem animação: mostra tudo */
  estatico?: boolean;
  width?: number;
  cellHeight?: number;
};

export const ScheduleGrid: React.FC<Props> = ({
  escala,
  startFrame = 0,
  framesPerCell = 3,
  faltaFrame,
  solucaoFrame,
  estatico = false,
  width = 936,
  cellHeight = 92,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { dias, funcionarios, minimo, solucao } = escala;
  const rows = funcionarios.length;
  const totalCells = dias.length * rows;
  const nameCol = 190;
  const gap = 10;
  const cellW = (width - 28 - nameCol - gap * dias.length) / dias.length;

  const pop = (at: number) =>
    estatico
      ? 1
      : spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 160, mass: 0.7 } });

  const faltaAt = faltaFrame ?? startFrame + totalCells * framesPerCell + 8;
  const solucaoVisible = estatico ? Boolean(solucao) : solucaoFrame !== undefined && Boolean(solucao);
  const sPop = solucaoVisible ? pop(solucaoFrame ?? 0) : 0;

  // Cobertura por dia (sem e com solução)
  const cobertura = dias.map((_, d) => funcionarios.filter((f) => !f.folgas.includes(d)).length);
  const cobertura2 = cobertura.map((c, d) => c + (solucao && solucao.trabalha.includes(d) ? 1 : 0));

  const header: React.CSSProperties = {
    fontFamily: fonts.sans,
    fontWeight: 700,
    fontSize: 26,
    color: "#64708A",
    textAlign: "center",
    letterSpacing: "0.04em",
  };

  const cell = (bg: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    width: cellW,
    height: cellHeight,
    borderRadius: 12,
    background: bg,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: fonts.sans,
    fontWeight: 800,
    fontSize: 24,
    ...extra,
  });

  const rowStyle: React.CSSProperties = {
    display: "flex",
    gap,
    alignItems: "center",
    marginTop: gap,
  };

  const nameStyle: React.CSSProperties = {
    width: nameCol,
    fontFamily: fonts.sans,
    fontWeight: 700,
    fontSize: 30,
    color: "#12203D",
    paddingLeft: 8,
    flex: "none",
  };

  return (
    <div
      style={{
        width,
        background: colors.white,
        borderRadius: 26,
        padding: 14,
        boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
        color: "#12203D",
      }}
    >
      <div style={{ display: "flex", gap, alignItems: "center" }}>
        <div style={{ width: nameCol, flex: "none" }} />
        {dias.map((d, i) => (
          <div key={d} style={{ ...header, width: cellW, color: i === 5 ? colors.red : header.color }}>
            {d}
          </div>
        ))}
      </div>

      {funcionarios.map((f, r) => (
        <div key={f.nome} style={rowStyle}>
          <div style={nameStyle}>{f.nome}</div>
          {dias.map((_, d) => {
            const idx = d * rows + r;
            const p = pop(startFrame + idx * framesPerCell);
            const folga = f.folgas.includes(d);
            return (
              <div
                key={d}
                style={{
                  ...(folga
                    ? cell(colors.greenSoft, colors.green, { fontSize: 22, fontWeight: 700 })
                    : cell(colors.navy3, colors.white, { fontSize: 30 })),
                  transform: `scale(${p})`,
                  opacity: Math.min(1, p * 1.2),
                }}
              >
                {folga ? "folga" : "●"}
              </div>
            );
          })}
        </div>
      ))}

      {solucaoVisible && solucao ? (
        <div style={{ ...rowStyle, opacity: Math.min(1, sPop * 1.3), transform: `translateY(${(1 - sPop) * 20}px)` }}>
          <div style={{ ...nameStyle, color: colors.green, fontSize: 24, lineHeight: 1.1 }}>{solucao.nome}</div>
          {dias.map((_, d) => {
            const trabalha = solucao.trabalha.includes(d);
            return (
              <div
                key={d}
                style={
                  trabalha
                    ? cell(colors.green, colors.white, { fontSize: 30, transform: `scale(${sPop})` })
                    : cell("transparent", "transparent")
                }
              >
                {trabalha ? "●" : ""}
              </div>
            );
          })}
        </div>
      ) : null}

      <div style={{ ...rowStyle, marginTop: gap + 6, paddingTop: gap, borderTop: "2px solid #E6EBF5" }}>
        <div style={{ ...nameStyle, color: "#64708A", fontSize: 24 }}>Cobertura</div>
        {dias.map((_, d) => {
          const need = minimo[d] ?? 0;
          const have = solucaoVisible ? cobertura2[d] : cobertura[d];
          const falta = need - have;
          const show = estatico || frame >= faltaAt;
          const p = show ? pop(faltaAt) : 0;
          if (need === 0) {
            return <div key={d} style={cell("transparent", "#B0B8C9", { fontSize: 22, fontWeight: 600 })}>—</div>;
          }
          if (falta > 0) {
            return (
              <div
                key={d}
                style={{
                  ...cell(colors.redSoft, colors.red, {
                    fontSize: 22,
                    border: `3px dashed ${colors.red}`,
                    lineHeight: 1,
                    flexDirection: "column",
                    gap: 2,
                  }),
                  transform: `scale(${p})`,
                  opacity: p,
                }}
              >
                <span>falta</span>
                <span style={{ fontSize: 30 }}>{falta}</span>
              </div>
            );
          }
          const ok = solucaoVisible && solucao?.trabalha.includes(d);
          return (
            <div
              key={d}
              style={{
                ...cell(ok ? colors.green : "transparent", ok ? colors.white : "#1F8A70", { fontSize: 26 }),
                opacity: show ? 1 : 0,
                transform: ok ? `scale(${sPop})` : undefined,
              }}
            >
              {have}/{need}
            </div>
          );
        })}
      </div>
    </div>
  );
};
