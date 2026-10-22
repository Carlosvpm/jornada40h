import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { iaAtiva } from "@/lib/ia";

export const dynamic = "force-dynamic";

let modelo: string | null = null;

// O dashboard é o mesmo de site/app/ (copiado para public/escala no build), em modo conta:
// salva no banco em vez do aparelho.
function html(): string {
  if (modelo && process.env.NODE_ENV === "production") return modelo;
  modelo = fs.readFileSync(path.join(process.cwd(), "public", "escala", "index.html"), "utf8")
    .replace('href="app.css"', 'href="/painel/escala/app.css"')
    .replace('src="../js/escala.js"', 'src="/painel/escala/escala.js"')
    .replace('<script src="app.js"></script>', "__CONFIG__<script src=\"/painel/escala/app.js\"></script>");
  return modelo;
}

export async function GET(req: Request) {
  const u = await usuarioAtual();
  // Atrás do proxy, req.url traz o host interno (0.0.0.0:3040): usa o endereço público.
  if (!u) return NextResponse.redirect(new URL("/painel/login", process.env.PUBLIC_URL || req.url));
  const config = { api: "/painel/api/escala", ia: iaAtiva() ? "/painel/api/ia" : null, sair: "/painel/api/logout", login: "/painel/login", usuario: { nome: u.nome, email: u.email } };
  const js = JSON.stringify(config).replace(/</g, "\\u003c");
  return new NextResponse(html().replace("__CONFIG__", `<script>window.J40H_PAINEL=${js}</script>`), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
