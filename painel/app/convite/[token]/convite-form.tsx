"use client";

import { useState } from "react";

export function ConviteForm({ token, email, nome }: { token: string; email: string; nome: string }) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const senha = String(f.get("senha") || "");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== f.get("senha2")) return setErro("As duas senhas estão diferentes.");
    setErro("");
    setEnviando(true);
    const r = await fetch("/painel/api/convite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, senha, nome: f.get("nome") }),
    }).catch(() => null);
    if (r?.ok) { window.location.href = "/painel"; return; }
    const d = r ? await r.json().catch(() => ({})) : {};
    setErro(d.erro || "Não foi possível criar a senha agora. Tente de novo.");
    setEnviando(false);
  }

  return (
    <form onSubmit={criar}>
      {erro && <div className="erro" role="alert">{erro}</div>}
      <label>E-mail<input value={email} readOnly /></label>
      <label>Seu nome<input name="nome" defaultValue={nome} autoComplete="name" /></label>
      <label>Senha (mínimo 8 caracteres)<input name="senha" type="password" autoComplete="new-password" required minLength={8} /></label>
      <label>Repita a senha<input name="senha2" type="password" autoComplete="new-password" required minLength={8} /></label>
      <button className="btn" type="submit" disabled={enviando}>{enviando ? "Criando…" : "Criar senha e abrir minha escala"}</button>
    </form>
  );
}
