import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { autorizado, negar } from "@/lib/admin";

// Funil da LP por variante (GET ?desde=AAAA-MM-DD&por=variante|anuncio): visitas únicas que chegaram a cada evento.
export async function GET(req: Request) {
  if (!autorizado(req)) return negar(req);
  const q = new URL(req.url).searchParams;
  const desde = Date.parse((q.get("desde") || "1970-01-01") + "T00:00:00-03:00") || 0;
  const por = q.get("por") === "anuncio" ? "anuncio" : "variante";
  const linhas = getDb()
    .prepare(`SELECT ${por} AS grupo, ev, COUNT(DISTINCT sid) AS visitas FROM eventos WHERE criado_em >= ? GROUP BY grupo, ev ORDER BY grupo, visitas DESC`)
    .all(desde) as { grupo: string; ev: string; visitas: number }[];
  const funil: Record<string, Record<string, number>> = {};
  for (const l of linhas) (funil[l.grupo || "(sem)"] ||= {})[l.ev] = l.visitas;
  return NextResponse.json({ desde: new Date(desde).toISOString(), por, funil });
}
