import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ipDe } from "@/lib/auth";
import { limitar } from "@/lib/limite";

// Rotas de admin: chave ADMIN_KEY no cabeçalho x-admin-key (Apps Script e scripts do Carlos).
export function autorizado(req: Request): boolean {
  const chave = process.env.ADMIN_KEY || "";
  const enviada = req.headers.get("x-admin-key") || "";
  if (chave.length < 24 || enviada.length !== chave.length) return false;
  return timingSafeEqual(Buffer.from(enviada), Buffer.from(chave));
}

// Só falhas de chave contam para o limite (o Apps Script chama isto a cada venda).
export function negar(req: Request) {
  return limitar([{ chave: "admin:ip:" + ipDe(req), max: 20, janelaMin: 15 }]) ||
    NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
}

