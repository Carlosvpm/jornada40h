import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { getPost, type Post, type Slide, type Cor } from "../data";
import { loadBrandFonts } from "../fonts";
import { colors, fmtBRL, fonts, temas, type Tema } from "../theme";
import { BrandBar } from "../components/BrandBar";
import { Body, Headline, Kicker } from "../components/Headline";
import { BigNumber } from "../components/BigNumber";
import { Arraste, CTACard, SlideCount } from "../components/CTACard";

export const CARROSSEL_W = 1080;
export const CARROSSEL_H = 1350;
const PAD = 64;

const corHex = (c?: Cor) =>
  c === "verde" ? colors.green : c === "vermelho" ? colors.red : c === "ouro" ? colors.gold : undefined;

const Bullets: React.FC<{ tema: Tema; itens: string[] }> = ({ tema, itens }) => {
  const t = temas[tema];
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, marginTop: 36, display: "grid", gap: 18 }}>
      {itens.map((b) => (
        <li
          key={b}
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: 36,
            color: t.text,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <span style={{ width: 16, height: 16, borderRadius: 8, background: t.accent, flex: "none" }} />
          {b}
        </li>
      ))}
    </ul>
  );
};

const Linhas: React.FC<{ tema: Tema; linhas: NonNullable<Slide["linhas"]> }> = ({ tema, linhas }) => {
  const t = temas[tema];
  return (
    <div style={{ marginTop: 36, borderTop: `3px solid ${t.rule}` }}>
      {linhas.map((l) => (
        <div
          key={l.rotulo}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "20px 0",
            borderBottom: `2px solid ${t.rule}`,
            fontFamily: fonts.sans,
          }}
        >
          <span style={{ fontSize: 36, fontWeight: 500, color: tema === "escuro" ? "#D5DBE8" : "#333" }}>{l.rotulo}</span>
          <span
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: corHex(l.cor) ?? t.text,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {l.valor}
          </span>
        </div>
      ))}
    </div>
  );
};

const Destaque: React.FC<{ tema: Tema; d: NonNullable<Slide["destaque"]> }> = ({ tema, d }) => (
  <div
    style={{
      marginTop: 36,
      background: colors.red,
      color: colors.white,
      borderRadius: 22,
      padding: "30px 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontFamily: fonts.sans,
    }}
  >
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.9 }}>{d.rotulo}</div>
      <div style={{ fontFamily: fonts.serif, fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginTop: 6, letterSpacing: "-0.02em" }}>
        {typeof d.valor === "number" ? d.valor.toLocaleString("pt-BR") : d.valor}
      </div>
    </div>
    {d.sub ? (
      <div style={{ fontSize: 36, fontWeight: 700, textAlign: "right", maxWidth: 320, lineHeight: 1.25, opacity: 0.95 }}>{d.sub}</div>
    ) : null}
  </div>
);

const Saidas: React.FC<{ tema: Tema; opcoes: NonNullable<Slide["opcoes"]> }> = ({ tema, opcoes }) => {
  const t = temas[tema];
  return (
    <div style={{ marginTop: 40, display: "grid", gap: 22 }}>
      {opcoes.map((o, i) => {
        const c = corHex(o.cor) ?? t.accent;
        return (
          <div
            key={o.titulo}
            style={{
              display: "grid",
              gridTemplateColumns: "84px 1fr auto",
              gap: 24,
              alignItems: "center",
              background: t.card,
              borderRadius: 22,
              padding: "26px 30px",
              borderLeft: `10px solid ${c}`,
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                background: c,
                color: colors.white,
                fontFamily: fonts.sans,
                fontWeight: 800,
                fontSize: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontFamily: fonts.sans, minWidth: 0 }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: t.text, lineHeight: 1.15 }}>{o.titulo}</div>
              <div style={{ fontSize: 36, fontWeight: 500, color: t.muted, marginTop: 8, lineHeight: 1.3 }}>{o.nota}</div>
            </div>
            <div
              style={{
                fontFamily: fonts.serif,
                fontSize: 44,
                fontWeight: 800,
                color: c,
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                textAlign: "right",
              }}
            >
              {o.valor}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Faixa de 3 números na capa: números do setor quando existem, senão os fatos da lei. */
const StatStrip: React.FC<{ tema: Tema; post: Post; variante?: "capa" | "cta" }> = ({ tema, post, variante = "capa" }) => {
  const t = temas[tema];
  const n = post.numeros;
  const lei = [
    { v: "44→40", l: "horas por semana" },
    { v: "2", l: "folgas por semana" },
    { v: "75×1", l: "votos no Senado" },
  ];
  let itens = lei;
  if (variante === "capa" && n.horasAbertoSemana && n.pessoasAoMesmoTempo && n.funcionarios) {
    itens = [
      { v: `${n.horasAbertoSemana} h`, l: "abertas por semana" },
      { v: String(n.pessoasAoMesmoTempo), l: "pessoas ao mesmo tempo" },
      { v: String(n.funcionarios), l: "funcionários hoje" },
    ];
  } else if (variante === "cta" && n.funcionariosAMais > 0) {
    itens = [
      { v: `+${n.funcionariosAMais}`, l: n.funcionariosAMais === 1 ? "funcionário a mais" : "funcionários a mais" },
      { v: fmtBRL(n.custoContratarMes), l: "por mês" },
      { v: fmtBRL(n.custoContratarAno ?? n.custoContratarMes * 12), l: "por ano" },
    ];
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        borderTop: `3px solid ${t.rule}`,
        borderBottom: `3px solid ${t.rule}`,
        padding: "30px 0",
        textAlign: "center",
      }}
    >
      {itens.map((it, i) => (
        <div key={it.l} style={{ borderLeft: i ? `2px solid ${t.rule}` : "none", padding: "0 12px" }}>
          <div style={{ fontFamily: fonts.serif, fontWeight: 800, fontSize: 64, lineHeight: 1, color: t.accent, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{it.v}</div>
          <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 26, color: t.muted, marginTop: 12, lineHeight: 1.2 }}>{it.l}</div>
        </div>
      ))}
    </div>
  );
};

const Erro: React.FC<{ tema: Tema; s: Slide }> = ({ tema, s }) => {
  const t = temas[tema];
  return (
    <>
      <div style={{ marginTop: 40 }}>
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 75,
            background: colors.red,
            color: colors.white,
            fontFamily: fonts.serif,
            fontWeight: 800,
            fontSize: 88,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          {s.numeroErro}
        </div>
        <div style={{ marginTop: 40 }}>
          <Headline tema={tema} size={92}>
            {s.titulo}
          </Headline>
        </div>
      </div>
      {s.corpo ? (
        <div style={{ marginTop: 44 }}>
          <Body tema={tema} size={42}>
            {s.corpo}
          </Body>
        </div>
      ) : null}
      {s.solucao ? (
        <div
          style={{
            marginTop: 60,
            background: colors.green,
            color: colors.white,
            borderRadius: 24,
            padding: "36px 40px",
            fontFamily: fonts.sans,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.9 }}>No lugar</div>
          <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.25, marginTop: 10 }}>{s.solucao}</div>
        </div>
      ) : null}
      <div style={{ display: "none", color: t.text }} />
    </>
  );
};

export const SlideView: React.FC<{ post: Post; index: number }> = ({ post, index }) => {
  const tema = post.tema;
  const t = temas[tema];
  const slides = post.slides ?? [];
  const s = slides[Math.min(index, slides.length - 1)];
  const last = index === slides.length - 1;
  const isCapa = s.layout === "capa";

  return (
    <AbsoluteFill style={{ background: t.bg, color: t.text }}>
      {/* textura sutil: gradiente diagonal */}
      <AbsoluteFill
        style={{
          background:
            tema === "escuro"
              ? `linear-gradient(160deg, ${colors.navy2} 0%, ${colors.navy} 55%, #070E1E 100%)`
              : `linear-gradient(160deg, #F7F4EE 0%, ${colors.paper} 60%, #EFEAE0 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: PAD,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BrandBar tema={tema} right={`${post.dia} · Semana ${post.semana}`} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 44 }}>
          {s.kicker ? <Kicker tema={tema}>{s.kicker}</Kicker> : null}

          {s.layout === "erro" ? (
            <Erro tema={tema} s={s} />
          ) : (
            <>
              <div style={{ marginTop: 26 }}>
                <Headline tema={tema} size={isCapa ? 96 : s.layout === "cta" ? 84 : 74} lineHeight={isCapa ? 1.02 : 1.06}>
                  {s.titulo}
                </Headline>
              </div>
              {s.corpo ? (
                <div style={{ marginTop: 34 }}>
                  <Body tema={tema} size={isCapa ? 40 : 38} serif={isCapa}>
                    {s.corpo}
                  </Body>
                </div>
              ) : null}
              {s.bullets ? <Bullets tema={tema} itens={s.bullets} /> : null}
              {s.linhas ? <Linhas tema={tema} linhas={s.linhas} /> : null}
              {s.numero ? (
                <div style={{ marginTop: 40 }}>
                  <BigNumber
                    tema={tema}
                    valor={s.numero.valor}
                    prefixo={s.numero.prefixo}
                    sufixo={s.numero.sufixo}
                    rotulo={s.numero.rotulo}
                    size={150}
                    color={t.accent}
                    sufixoSize={56}
                  />
                </div>
              ) : null}
              {s.destaque ? <Destaque tema={tema} d={s.destaque} /> : null}
              {s.opcoes ? <Saidas tema={tema} opcoes={s.opcoes} /> : null}
            </>
          )}

          <div style={{ flex: 1 }} />

          {isCapa ? (
            <div style={{ paddingBottom: 30 }}>
              <StatStrip tema={tema} post={post} />
            </div>
          ) : null}

          {last ? (
            <>
              <div style={{ paddingBottom: 44 }}>
                <StatStrip tema={tema} post={post} variante="cta" />
              </div>
              <div style={{ paddingBottom: 10 }}>
                <CTACard tema={tema} botao={s.botao ?? post.cta} rodape={s.rodape ?? "link na bio"} size={44} />
              </div>
            </>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 22,
            borderTop: `2px solid ${t.rule}`,
          }}
        >
          <SlideCount tema={tema} atual={index + 1} total={slides.length} />
          {last ? (
            <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 28, color: t.accent }}>
              Salve para fazer a conta depois
            </div>
          ) : (
            <Arraste tema={tema} />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Composição: um frame por slide. Renderize com `remotion still --frame=N`. */
export const Carrossel: React.FC<{ postId: string }> = ({ postId }) => {
  loadBrandFonts();
  const frame = useCurrentFrame();
  const post = getPost(postId);
  return <SlideView post={post} index={frame} />;
};
