import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb, type Usuario } from "./db";

export const COOKIE = "j40h_sessao";
const SESSAO_DIAS = 30;
const SCRYPT_N = 16384;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function novoToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSenha(senha: string): string {
  const sal = randomBytes(16);
  const h = scryptSync(senha, sal, 64, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${sal.toString("base64")}$${h.toString("base64")}`;
}

export function confereSenha(senha: string, guardado: string): boolean {
  const [alg, n, sal, h] = guardado.split("$");
  if (alg !== "scrypt" || !sal || !h) return false;
  const esperado = Buffer.from(h, "base64");
  const calculado = scryptSync(senha, Buffer.from(sal, "base64"), esperado.length, { N: Number(n) });
  return timingSafeEqual(esperado, calculado);
}

export function senhaValida(senha: unknown): senha is string {
  return typeof senha === "string" && senha.length >= 8 && senha.length <= 200;
}

export function normalizaEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200 ? e : null;
}

export async function criarSessao(usuarioId: number): Promise<void> {
  const token = novoToken();
  const expira = Date.now() + SESSAO_DIAS * 864e5;
  const db = getDb();
  db.prepare("DELETE FROM sessoes WHERE expira_em < ?").run(Date.now());
  db.prepare("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)").run(hashToken(token), usuarioId, expira);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/painel",
    maxAge: SESSAO_DIAS * 86400,
  });
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      "SELECT u.id, u.email, u.nome FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ? AND s.expira_em > ?"
    )
    .get(hashToken(token), Date.now()) as Usuario | undefined;
  return row ?? null;
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessoes WHERE token_hash = ?").run(hashToken(token));
  jar.set(COOKIE, "", { path: "/painel", maxAge: 0 });
}

// Limite simples de tentativas de login por chave (e-mail ou IP), em memória.
const tentativas = new Map<string, { n: number; ate: number }>();
export function bloqueado(chave: string): boolean {
  const t = tentativas.get(chave);
  return !!t && t.n >= 8 && t.ate > Date.now();
}
export function registraFalha(chave: string): void {
  const t = tentativas.get(chave);
  if (!t || t.ate < Date.now()) tentativas.set(chave, { n: 1, ate: Date.now() + 15 * 60e3 });
  else t.n++;
}
export function limpaFalhas(chave: string): void {
  tentativas.delete(chave);
}
