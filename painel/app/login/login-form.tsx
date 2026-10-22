"use client";

import { useEffect, useRef, useState } from "react";

async function post(url: string, corpo: object) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  return { ok: !!r?.ok, erro: (d.erro as string) || (r ? "" : "Sem conexão. Tente de novo.") };
}

export function LoginForm() {
  const [passo, setPasso] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const campoCodigo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!espera) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function pedirCodigo(e?: React.FormEvent) {
    e?.preventDefault();
    setErro("");
    setEnviando(true);
    const r = await post("/painel/api/codigo", { email });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro || "Não foi possível mandar o código.");
    setPasso("codigo");
    setCodigo("");
    setEspera(60);
    setTimeout(() => campoCodigo.current?.focus(), 50);
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const r = await post("/painel/api/entrar", { email, codigo });
    if (r.ok) { window.location.href = "/painel"; return; }
    setEnviando(false);
    setErro(r.erro || "Código errado ou vencido.");
  }

  if (passo === "email") {
    return (
      <form onSubmit={pedirCodigo}>
        {erro && <div className="erro" role="alert">{erro}</div>}
        <label>E-mail da compra<input name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <button className="btn" type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Receber código por e-mail"}</button>
      </form>
    );
  }

  return (
    <form onSubmit={entrar}>
      {erro && <div className="erro" role="alert">{erro}</div>}
      <p className="info">Se <b>{email}</b> tem acesso, mandamos um código de 6 números. Ele vale por 15 minutos. Olhe também o spam.</p>
      <label>Código
        <input ref={campoCodigo} name="codigo" className="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required
          value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} />
      </label>
      <button className="btn" type="submit" disabled={enviando || codigo.length !== 6}>{enviando ? "Entrando…" : "Entrar"}</button>
      <div className="acoes">
        <button type="button" className="link" disabled={espera > 0 || enviando} onClick={() => pedirCodigo()}>
          {espera > 0 ? `Reenviar código em ${espera}s` : "Reenviar código"}
        </button>
        <button type="button" className="link" onClick={() => { setPasso("email"); setErro(""); }}>Trocar e-mail</button>
      </div>
    </form>
  );
}
