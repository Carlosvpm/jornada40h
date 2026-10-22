"use client";

import { useState } from "react";

export function LoginForm() {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const f = new FormData(e.currentTarget);
    const r = await fetch("/painel/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), senha: f.get("senha") }),
    }).catch(() => null);
    if (r?.ok) { window.location.href = "/painel"; return; }
    const d = r ? await r.json().catch(() => ({})) : {};
    setErro(d.erro || "Não foi possível entrar agora. Tente de novo.");
    setEnviando(false);
  }

  return (
    <form onSubmit={entrar}>
      {erro && <div className="erro" role="alert">{erro}</div>}
      <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
      <label>Senha<input name="senha" type="password" autoComplete="current-password" required /></label>
      <button className="btn" type="submit" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
