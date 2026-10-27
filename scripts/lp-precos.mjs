// Gera as páginas de preço (teste de preço da campanha de vendas, 27/10/2026) a partir de site/index.html:
// site/4790/ (R$ 47,90, âncora "de R$ 77,90") e site/7790/ (R$ 77,90, sem âncora). Mesma página, só muda
// o CONFIG (preço, checkout, variante fixa) e os caminhos relativos viram absolutos (a página fica numa pasta).
// Rodar depois de qualquer mudança em site/index.html:  node scripts/lp-precos.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
const PAGINAS = [
  { pasta: "4790", checkoutUrl: "https://pay.kiwify.com.br/xftQB3Y", precoCheio: 77.9, precoFundador: 47.9, variante: "p4790" },
  { pasta: "7790", checkoutUrl: "https://pay.kiwify.com.br/yy3LT4h", precoCheio: 0, precoFundador: 77.9, variante: "p7790" }
];

const fonte = fs.readFileSync(path.join(SITE, "index.html"), "utf8");

function troca(html, re, novo, nome) {
  if (!re.test(html)) throw new Error("não achei " + nome + " em site/index.html");
  return html.replace(re, novo);
}

for (const p of PAGINAS) {
  let h = fonte;
  h = troca(h, /checkoutUrl: "[^"]*",[^\n]*/, `checkoutUrl: "${p.checkoutUrl}", // gerado por scripts/lp-precos.mjs`, "checkoutUrl");
  h = troca(h, /precoCheio: [\d.]+,[^\n]*/, `precoCheio: ${p.precoCheio},`, "precoCheio");
  h = troca(h, /precoFundador: [\d.]+,[^\n]*/, `precoFundador: ${p.precoFundador},`, "precoFundador");
  h = troca(h, /prazoLancamento: "[^"]*",[^\n]*/, `prazoLancamento: "",`, "prazoLancamento");
  h = troca(h, /variante: "[^"]*",[^\n]*/, `variante: "${p.variante}",`, "variante");
  h = troca(h, /privacyUrl: "([^"/][^"]*)"/, 'privacyUrl: "/$1"', "privacyUrl");
  // href/src/srcset relativos ("img/x.webp", "fim-da-escala-6x1/") passam a valer a partir da raiz do site.
  h = h.replace(/\b(href|src|srcset)="(?!https?:|#|\/|mailto:|tel:|data:)([^"]+)"/g, '$1="/$2"');
  h = troca(h, /<meta charset="utf-8">/, '<meta charset="utf-8">\n<!-- Gerado por scripts/lp-precos.mjs a partir de site/index.html: não edite aqui. -->\n<meta name="robots" content="noindex, follow">', "meta charset");
  fs.mkdirSync(path.join(SITE, p.pasta), { recursive: true });
  fs.writeFileSync(path.join(SITE, p.pasta, "index.html"), h);
  console.log("ok site/" + p.pasta + "/index.html");
}
