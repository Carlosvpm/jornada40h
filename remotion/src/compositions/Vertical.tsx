import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS, getPost, type Cena, type Post } from "../data";
import { loadBrandFonts } from "../fonts";
import { colors, fmtBRL, fonts, GUTTER, SAFE_BOTTOM, SAFE_TOP, temas, type Tema } from "../theme";
import { BrandBar, BrandMark } from "../components/BrandBar";
import { Body, Headline, Kicker } from "../components/Headline";
import { BigNumber } from "../components/BigNumber";
import { CTACard } from "../components/CTACard";
import { Caption } from "../components/Caption";
import { ScheduleGrid } from "../components/ScheduleGrid";

export const VERTICAL_W = 1080;
export const VERTICAL_H = 1920;

const Fade: React.FC<{ duration: number; children: React.ReactNode; out?: boolean }> = ({ duration, children, out = true }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 6, duration - (out ? 8 : 0), duration], [0, 1, 1, out ? 0 : 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

/** Área de conteúdo entre as zonas seguras do IG. */
const Stage: React.FC<{ children: React.ReactNode; center?: boolean }> = ({ children, center = true }) => (
  <div
    style={{
      position: "absolute",
      left: GUTTER,
      right: GUTTER,
      top: SAFE_TOP + 110,
      bottom: SAFE_BOTTOM + 130,
      display: "flex",
      flexDirection: "column",
      justifyContent: center ? "center" : "flex-start",
    }}
  >
    {children}
  </div>
);

const Manchete: React.FC<{ tema: Tema; c: Cena }> = ({ tema, c }) => (
  <Stage>
    {c.kicker ? <Kicker tema={tema} animate size={30}>{c.kicker}</Kicker> : null}
    <div style={{ marginTop: 36 }}>
      <Headline tema={tema} size={116} animate delay={8} staggerFrames={4} destaques={["sábado?", "5x2,"]}>
        {c.titulo ?? ""}
      </Headline>
    </div>
  </Stage>
);

const Texto: React.FC<{ tema: Tema; c: Cena }> = ({ tema, c }) => (
  <Stage>
    {c.kicker ? <Kicker tema={tema} animate size={30}>{c.kicker}</Kicker> : null}
    <div style={{ marginTop: 36 }}>
      <Headline tema={tema} size={92} animate delay={6} staggerFrames={3} destaques={["4", "horas", "40h,"]}>
        {c.titulo ?? ""}
      </Headline>
    </div>
    {c.corpo ? (
      <div style={{ marginTop: 44 }}>
        <Body tema={tema} size={42} animate delay={34}>
          {c.corpo}
        </Body>
      </div>
    ) : null}
  </Stage>
);

const Stats: React.FC<{ tema: Tema; c: Cena }> = ({ tema, c }) => {
  const t = temas[tema];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Stage>
      {c.kicker ? <Kicker tema={tema} animate size={30}>{c.kicker}</Kicker> : null}
      <div style={{ marginTop: 40, display: "grid", gap: 26 }}>
        {(c.itens ?? []).map((it, i) => {
          const delay = 10 + i * 22;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });
          return (
            <div
              key={it.rotulo}
              style={{
                background: t.card,
                borderRadius: 28,
                padding: "40px 48px",
                borderLeft: `12px solid ${i === 0 ? colors.red : i === 1 ? colors.green : t.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 30,
                opacity: Math.min(1, s * 1.2),
                transform: `translateY(${(1 - s) * 50}px)`,
              }}
            >
              <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 38, color: t.text, lineHeight: 1.2, maxWidth: 420 }}>
                {it.rotulo}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                {it.de !== undefined && it.para !== undefined ? (
                  <>
                    <span style={{ fontFamily: fonts.serif, fontWeight: 800, fontSize: 96, color: t.muted, textDecoration: "line-through", textDecorationColor: colors.red, textDecorationThickness: 6 }}>
                      {it.de}
                    </span>
                    <span style={{ fontFamily: fonts.sans, fontSize: 56, color: t.muted }}>→</span>
                    <BigNumber tema={tema} valor={it.para} de={it.de} size={128} animate delay={delay + 8} duracao={36} color={t.accent} />
                  </>
                ) : it.valor !== undefined ? (
                  <BigNumber tema={tema} valor={it.valor} size={128} animate delay={delay + 6} duracao={20} color={t.accent} />
                ) : (
                  <span style={{ fontFamily: fonts.serif, fontWeight: 800, fontSize: 128, lineHeight: 0.95, color: t.accent, letterSpacing: "-0.03em" }}>{it.texto}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

const Numero: React.FC<{ tema: Tema; c: Cena }> = ({ tema, c }) => {
  const t = temas[tema];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = c.numero;
  const d = c.destaque;
  const s2 = spring({ frame: frame - 50, fps, config: { damping: 16, stiffness: 120 } });
  const dValor = d && typeof d.valor === "number" ? d.valor : 0;
  return (
    <Stage>
      {c.kicker ? <Kicker tema={tema} animate size={30}>{c.kicker}</Kicker> : null}
      {n ? (
        <div style={{ marginTop: 40 }}>
          <BigNumber tema={tema} valor={n.valor} prefixo={n.prefixo} sufixo={n.sufixo} rotulo={n.rotulo} size={240} sufixoSize={84} color={t.accent} animate delay={10} duracao={24} />
        </div>
      ) : null}
      {d ? (
        <div
          style={{
            marginTop: 70,
            background: colors.red,
            color: colors.white,
            borderRadius: 28,
            padding: "40px 48px",
            fontFamily: fonts.sans,
            opacity: Math.min(1, s2 * 1.2),
            transform: `translateY(${(1 - s2) * 50}px)`,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.9 }}>{d.rotulo}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
            {typeof d.valor === "number" ? (
              <BigNumber tema={tema} valor={dValor} formato={d.formato ?? "moeda"} size={112} color={colors.white} animate delay={56} duracao={40} />
            ) : (
              <span style={{ fontFamily: fonts.serif, fontWeight: 800, fontSize: 112, lineHeight: 0.95 }}>{d.valor}</span>
            )}
            {d.sufixo ? <span style={{ fontSize: 48, fontWeight: 800 }}>{d.sufixo}</span> : null}
          </div>
          {d.sub ? <div style={{ fontSize: 38, fontWeight: 700, marginTop: 18, opacity: 0.95 }}>{d.sub}</div> : null}
        </div>
      ) : null}
    </Stage>
  );
};

const Grade: React.FC<{ tema: Tema; c: Cena; post: Post; solucao: boolean }> = ({ tema, c, post, solucao }) => {
  const escala = post.escala;
  if (!escala) return null;
  const framesPerCell = 5;
  return (
    <Stage>
      {c.kicker ? <Kicker tema={tema} animate size={30}>{c.kicker}</Kicker> : null}
      <div style={{ marginTop: 30 }}>
        <Headline tema={tema} size={66} animate={!solucao} delay={4} staggerFrames={2} destaques={solucao ? ["meio", "período"] : ["3"]}>
          {c.titulo ?? ""}
        </Headline>
      </div>
      <div style={{ marginTop: 50, display: "flex", justifyContent: "center" }}>
        {solucao ? (
          <ScheduleGrid escala={escala} estatico={false} startFrame={-1000} faltaFrame={-1000} solucaoFrame={14} framesPerCell={0} />
        ) : (
          <ScheduleGrid escala={escala} startFrame={28} framesPerCell={framesPerCell} />
        )}
      </div>
    </Stage>
  );
};

const Enquete: React.FC<{ tema: Tema; c: Cena }> = ({ tema, c }) => {
  const t = temas[tema];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Stage>
      {c.kicker ? <Kicker tema={tema} animate size={30}>{c.kicker}</Kicker> : null}
      <div style={{ marginTop: 36 }}>
        <Headline tema={tema} size={110} animate delay={6} staggerFrames={4} destaques={["sábado?"]}>
          {c.titulo ?? ""}
        </Headline>
      </div>
      <div style={{ marginTop: 80, display: "grid", gap: 26 }}>
        {(c.opcoes ?? []).map((o, i) => {
          const s = spring({ frame: frame - 40 - i * 12, fps, config: { damping: 13, stiffness: 140 } });
          const sim = i === 0;
          return (
            <div
              key={o}
              style={{
                background: sim ? t.accent : "rgba(255,255,255,0.08)",
                color: sim ? colors.navy : t.text,
                border: sim ? "none" : `3px solid ${t.rule}`,
                borderRadius: 60,
                padding: "34px 48px",
                fontFamily: fonts.sans,
                fontWeight: 800,
                fontSize: 56,
                textAlign: "center",
                transform: `scale(${0.9 + 0.1 * s})`,
                opacity: Math.min(1, s * 1.2),
              }}
            >
              {o}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 40, fontFamily: fonts.sans, fontWeight: 600, fontSize: 30, color: t.muted, textAlign: "center" }}>
        Responda na enquete acima
      </div>
    </Stage>
  );
};

const CTA: React.FC<{ tema: Tema; c: Cena; post: Post }> = ({ tema, c, post }) => (
  <Stage>
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 56 }}>
      <BrandMark tema={tema} size={88} />
    </div>
    <Headline tema={tema} size={92} animate delay={4} staggerFrames={3} align="center">
      {c.titulo ?? post.titulo}
    </Headline>
    <div style={{ marginTop: 70 }}>
      <CTACard tema={tema} botao={c.botao ?? post.cta} rodape={c.rodape ?? "link na bio"} animate delay={26} size={52} />
    </div>
  </Stage>
);

const Scene: React.FC<{ post: Post; c: Cena }> = ({ post, c }) => {
  const tema = post.tema;
  switch (c.tipo) {
    case "manchete":
      return <Manchete tema={tema} c={c} />;
    case "stats":
      return <Stats tema={tema} c={c} />;
    case "texto":
      return <Texto tema={tema} c={c} />;
    case "numero":
      return <Numero tema={tema} c={c} />;
    case "grade":
      return <Grade tema={tema} c={c} post={post} solucao={false} />;
    case "grade-solucao":
      return <Grade tema={tema} c={c} post={post} solucao />;
    case "enquete":
      return <Enquete tema={tema} c={c} />;
    case "cta":
      return <CTA tema={tema} c={c} post={post} />;
    default:
      return null;
  }
};

/** Reel/Story: cenas em sequência, zonas seguras, legenda queimada. */
export const Vertical: React.FC<{ postId: string; legendas?: boolean }> = ({ postId, legendas = true }) => {
  loadBrandFonts();
  const post = getPost(postId);
  const tema = post.tema;
  const t = temas[tema];
  const cenas = post.cenas ?? [];
  let from = 0;
  return (
    <AbsoluteFill style={{ background: t.bg }}>
      <AbsoluteFill
        style={{
          background:
            tema === "escuro"
              ? `linear-gradient(170deg, ${colors.navy2} 0%, ${colors.navy} 50%, #070E1E 100%)`
              : `linear-gradient(170deg, #F7F4EE 0%, ${colors.paper} 60%, #EFEAE0 100%)`,
        }}
      />
      {/* Barra da marca dentro da zona segura superior */}
      <div style={{ position: "absolute", left: GUTTER, right: GUTTER, top: SAFE_TOP + 10 }}>
        <BrandBar tema={tema} right={post.type === "reel" ? "Reel" : "Story"} size={52} />
      </div>
      {cenas.map((c, i) => {
        const dur = Math.round(c.duracao * FPS);
        const start = from;
        from += dur;
        const isLast = i === cenas.length - 1;
        return (
          <Sequence key={i} from={start} durationInFrames={dur} name={`${i + 1}-${c.tipo}`}>
            <Fade duration={dur} out={!isLast}>
              <Scene post={post} c={c} />
            </Fade>
            {legendas && c.legenda ? <Caption duration={dur}>{c.legenda}</Caption> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const Reel: React.FC<{ postId: string }> = ({ postId }) => <Vertical postId={postId} legendas />;
export const Story: React.FC<{ postId: string }> = ({ postId }) => <Vertical postId={postId} legendas={false} />;

export const duracaoPost = (post: Post) => (post.cenas ?? []).reduce((a, c) => a + Math.round(c.duracao * FPS), 0);
export { fmtBRL };
