import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb, type Usuario } from "./db";

export const COOKIE = "j40h_sessao";
const SESSAO_DIAS = 30;
export const CODIGO_MIN = 15;
const CODIGO_ERROS_MAX = 5;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function novoToken(): string {
  return randomBytes(32).toString("base64url");
}

// O código tem só 6 dígitos: guardado como HMAC com segredo do servidor, nunca em claro.
function segredo(): string {
  const s = process.env.OTP_SECRET || process.env.ADMIN_KEY || "";
  if (s.length < 24) throw new Error("OTP_SECRET (ou ADMIN_KEY) precisa ter 24+ caracteres");
  return s;
}
function hashCodigo(email: string, codigo: string): string {
  return createHmac("sha256", segredo()).update(email + ":" + codigo).digest("hex");
}

export function normalizaEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200 ? e : null;
}

/** Segundos até poder pedir outro código (1 por minuto enquanto houver um código ainda não usado). */
export function esperaReenvio(email: string): number {
  const c = getDb().prepare("SELECT MAX(criado_em) t FROM codigos WHERE email = ? AND expira_em > ?").get(email, Date.now()) as { t: number | null };
  return c.t ? Math.max(0, Math.ceil((c.t + 60e3 - Date.now()) / 1000)) : 0;
}

/** Gera um código novo para o e-mail (invalida os anteriores) e devolve o código em claro para envio. */
export function novoCodigo(email: string): string {
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM codigos WHERE email = ? OR expira_em <= ?").run(email, Date.now());
    db.prepare("INSERT INTO codigos (email, codigo_hash, criado_em, expira_em) VALUES (?, ?, ?, ?)").run(email, hashCodigo(email, codigo), Date.now(), Date.now() + CODIGO_MIN * 60e3);
  })();
  return codigo;
}

/** Confere o código. Certo: apaga todos os códigos do e-mail. Errado: conta erro e apaga no 5º. */
export function confereCodigo(email: string, codigo: string): boolean {
  const db = getDb();
  const c = db.prepare("SELECT id, codigo_hash, erros FROM codigos WHERE email = ? AND expira_em > ? ORDER BY id DESC LIMIT 1")
    .get(email, Date.now()) as { id: number; codigo_hash: string; erros: number } | undefined;
  if (!c || !/^\d{6}$/.test(codigo)) return false;
  const certo = timingSafeEqual(Buffer.from(c.codigo_hash, "hex"), Buffer.from(hashCodigo(email, codigo), "hex"));
  if (certo) db.prepare("DELETE FROM codigos WHERE email = ?").run(email);
  else if (c.erros + 1 >= CODIGO_ERROS_MAX) db.prepare("DELETE FROM codigos WHERE id = ?").run(c.id);
  else db.prepare("UPDATE codigos SET erros = erros + 1 WHERE id = ?").run(c.id);
  return certo;
}

export async function criarSessao(usuarioId: number): Promise<void> {
  const token = novoToken();
  getDb().prepare("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)").run(hashToken(token), usuarioId, Date.now() + SESSAO_DIAS * 864e5);
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
    .prepare("SELECT u.id, u.email, u.nome FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ? AND s.expira_em > ?")
    .get(hashToken(token), Date.now()) as Usuario | undefined;
  return row ?? null;
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessoes WHERE token_hash = ?").run(hashToken(token));
  jar.set(COOKIE, "", { path: "/painel", maxAge: 0 });
}

/** IP do cliente: o Traefik põe o IP real em X-Real-Ip e reescreve X-Forwarded-For. */
export function ipDe(req: Request): string {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
