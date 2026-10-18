/**
 * PDF de exemplo da "Escala 5x2 Pronta" para a landing page (link "Ver um exemplo de escala pronta").
 * Negócio e nomes fictícios; sem preço nem link de pagamento.
 *
 *   node engine/exemplo-pdf.mjs
 *
 * Saída: site/exemplo/escala-5x2-exemplo.pdf (impresso com google-chrome --headless=new --print-to-pdf)
 */
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { gerarEscala } = require("./escala.js");
const { renderExemploEscalaHTML } = require("./pdf-template.js");

const OUT = path.join(__dirname, "out");
const DEST = path.join(__dirname, "..", "site", "exemplo", "escala-5x2-exemplo.pdf");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(DEST), { recursive: true });

// Mesmo negócio fictício da escala de exemplo da LP (site/index.html, const EXEMPLO)
const dia = (abre, fecha) => ({ abre, fecha, pessoas: 2 });
const entrada = jornada => ({
  negocio: { nome: "Padaria Pão de Mel", tipo: "Padaria" },
  funcionamento: { seg: dia("06:00", "18:00"), ter: dia("06:00", "18:00"), qua: dia("06:00", "18:00"), qui: dia("06:00", "18:00"), sex: dia("06:00", "18:00"), sab: dia("07:00", "14:00"), dom: null },
  funcionarios: [
    { nome: "Ana", funcao: "atendente" }, { nome: "Bruno", funcao: "padeiro" }, { nome: "Carla", funcao: "caixa" },
    { nome: "Diego", funcao: "atendente" }, { nome: "Nova contratação", funcao: "atendente" }
  ],
  regras: { jornadaSemanal: jornada, jornadaDiariaMax: 8, folgasPorSemana: 2, intervaloMin: 60 },
  salarioMedio: 1800, semana: "A"
});

const partes = html => ({
  css: html.match(/<style>([\s\S]*?)<\/style>/)[1],
  body: html.match(/<body>([\s\S]*?)<\/body>/)[1]
});

const versoes = [
  { jornada: 42, titulo: "Versão 42h · a partir de ~16/12/2026", nota: "Primeira etapa da EC 141/2026: 2 folgas por semana e no máximo 42 horas. Com até 8 horas por dia e 2 folgas, cada pessoa já fica em até 40 horas." },
  { jornada: 40, titulo: "Versão 40h · a partir de ~16/12/2027", nota: "Segunda etapa: no máximo 40 horas por semana, sem redução de salário." }
];

let css = "";
const paginas = versoes.map(v => {
  const escala = gerarEscala(entrada(v.jornada));
  if (!escala.ok) throw new Error("motor falhou para " + v.jornada + "h");
  const p = partes(renderExemploEscalaHTML(escala, { titulo: "Padaria Pão de Mel · " + v.titulo }));
  css = p.css;
  return '<section class="pg">' +
    '<div class="aviso"><b>EXEMPLO</b> Negócio e nomes fictícios. A sua escala vem com os nomes, funções, dias e horários da sua equipe.</div>' +
    '<div class="zoom">' + p.body + '</div>' +
    '<p class="nota">' + v.nota + '</p>' +
    '<p class="rodape">Jornada 40h · Escala 5x2 Pronta · jornada40h.com.br · calculadora40h@gmail.com · Cada escala é revisada por uma pessoa antes da entrega. Confirme regras da convenção coletiva com o seu contador.</p>' +
    '</section>';
});

const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Exemplo de escala 5x2 pronta (nomes fictícios)</title><style>' + css +
  '\n@page { size: A4 landscape; margin: 0; }' +
  '\nhtml, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
  '\n.pg { width: 297mm; height: 210mm; box-sizing: border-box; padding: 12mm 14mm 10mm; page-break-after: always; break-after: page; overflow: hidden; display: flex; flex-direction: column; }' +
  '\n.pg:last-child { page-break-after: auto; break-after: auto; }' +
  '\n.aviso { font-size: 12.5px; color: #5B6478; background: #FBF1D6; border: 1px solid #D4A72C; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; }' +
  '\n.aviso b { color: #B88E1E; letter-spacing: .5px; margin-right: 6px; }' +
  '\n.zoom { zoom: 0.86; }' +
  '\n#exemplo { box-shadow: none; }' +
  '\n.nota { font-size: 12.5px; color: #14213D; margin: 10px 2px 0; }' +
  '\n.rodape { margin-top: auto; font-size: 10.5px; color: #5B6478; border-top: 1px solid #E6EBF5; padding-top: 6px; }' +
  '</style></head><body>' + paginas.join("") + '</body></html>';

const htmlPath = path.join(OUT, "escala-5x2-exemplo.html");
fs.writeFileSync(htmlPath, html);
execFileSync("google-chrome", ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--print-to-pdf=" + DEST, pathToFileURL(htmlPath).href], { stdio: "inherit" });
console.log("PDF: " + DEST + " (" + Math.round(fs.statSync(DEST).size / 1024) + " KB)");
