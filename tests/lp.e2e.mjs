// Teste ponta a ponta das landing pages (regra 8 de docs/REGRAS.md):
// calculadora → resultado → lead → relatório/oferta → checkout, em / e /b/,
// sem gravar lead real (o webhook é interceptado) e sem abrir a Kiwify (o checkout é interceptado).
//
// Uso: node tests/lp.e2e.mjs            (serve site/ numa porta local)
//      PW=/caminho/para/playwright-core node tests/lp.e2e.mjs
// Usa o Google Chrome instalado (channel "chrome").
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || "playwright-core");
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
const TYPES = { ".pdf": "application/pdf", ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".xml": "application/xml", ".txt": "text/plain" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const BASE = "http://127.0.0.1:" + server.address().port;

// Cenários: tipo, dias marcados (além do padrão seg–sáb), P, F, salário, o que esperar no resultado
const CENARIOS = [
  { nome: "padaria precisa contratar", tipo: "Padaria", P: 3, F: 4, S: 1800, espera: /funcionário/ },
  { nome: "restaurante falta < 1 pessoa", tipo: "Restaurante ou lanchonete", P: 2, F: 3, S: 1900, espera: /por semana sem ninguém|funcionário/ },
  { nome: "loja cobre o horário", tipo: "Loja", P: 1, F: 4, S: 1700, espera: /folga/ },
  { nome: "padaria sem WhatsApp (opcional)", tipo: "Padaria", P: 2, F: 3, S: 1800, espera: /funcionário|por semana sem ninguém/, semWhats: true, so: "/" },
  { nome: "compra direto, sem cadastro", tipo: "Mercado", P: 2, F: 2, S: 1900, espera: /funcionário|por semana sem ninguém/, direto: true, so: "/" }
];

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FALHA ") + msg); if (!cond) falhas++; };

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const pagina of ["/", "/b/"]) {
    for (const c of CENARIOS) {
      if (c.so && c.so !== pagina) continue;
      console.log(pagina + " · " + c.nome);
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      const erros = [];
      page.on("pageerror", e => erros.push(e.message));
      let lead = null, checkout = null;
      await page.route("https://script.google.com/**", async r => { lead = JSON.parse(r.request().postData() || "{}"); await r.fulfill({ status: 200, body: "ok" }); });
      await page.route("https://pay.kiwify.com.br/**", async r => { checkout = r.request().url(); await r.fulfill({ status: 200, body: "checkout" }); });
      await page.route("https://connect.facebook.net/**", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));

      await page.goto(BASE + pagina + "?utm_source=teste&utm_content=e2e");
      const largura = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(largura <= 390, "sem rolagem horizontal no celular (" + largura + "px)");
      if (pagina === "/") ok(await page.locator("#exBoard .b-row").count() > 3, "escala de exemplo renderizada pelo motor");

      await page.locator('input[name=tipo][value="' + c.tipo + '"]').check({ force: true });
      if (await page.locator("#simult").isHidden()) await page.locator("#calc button[type=submit], #calc .btn").first().click().catch(() => {});
      await page.fill("#simult", String(c.P));
      await page.fill("#func", String(c.F));
      await page.fill("#salario", String(c.S));
      await page.locator("#calc button[type=submit]").click();
      await page.waitForSelector("#result:not([hidden])");
      const res = await page.locator("#result").innerText();
      ok(c.espera.test(res), "resultado coerente: " + res.split("\n").slice(0, 2).join(" ").slice(0, 90));
      const ev = [];
      await page.exposeFunction("__rec", args => ev.push(args));
      await page.evaluate(() => { window.fbq = function () { window.__rec(JSON.parse(JSON.stringify([...arguments]))); }; });

      if (pagina === "/") {
        // a4: só a manchete é grátis; custos, saídas e a escala além da 1ª linha ficam bloqueados e sem número real no DOM
        ok(/42h|dezembro/.test(await page.locator("#resStage").innerText()), "mostra quando a mudança chega (dezembro/42h)");
        ok(!/R\$\s?\d/.test(res), "manchete grátis sem valores em R$");
        ok(await page.locator("#locked").isVisible(), "relatório completo bloqueado visível");
        const lockedHtml = await page.locator("#locked .lockwrap").innerHTML();
        ok(!/\d/.test(lockedHtml.replace(/<[^>]+>/g, "").replace(/40h|42h/g, "")) && /R\$ ••••/.test(lockedHtml), "itens bloqueados só com marcadores (sem números reais)");
        ok(/Liberado no relatório completo \+ escala pronta/.test(await page.locator("#locked").innerText()), "selo: liberado no relatório completo + escala pronta");
        ok(await page.locator("#pvBoard .b-row:not(.b-head):not(.b-foot)").count() >= 2, "prévia com a 1ª linha e o resto desfocado");
        const blurTxt = await page.locator("#pvBoard .b-blurwrap").evaluate(el => [...el.querySelectorAll(".b-row")].map(r => r.textContent).join(""));
        ok(!/\d/.test(blurTxt), "linhas desfocadas da prévia sem horários reais");
        const valores = ((await page.locator("#card").innerHTML()).match(/R\$(\s|&nbsp;)?\d[\d.,]*/g) || []).map(v => v.replace(/R\$(\s|&nbsp;)?/, ""));
        const heVal = (await page.locator("#heVal").innerText()).replace(/R\$\s?|\/mês/g, "");
        ok(/R\$\s?\d/.test(await page.locator("#heVal").innerText()) && await page.locator("#heVal").isVisible(), "metade aberta: hora extra com valor real (" + heVal + ")");
        ok(valores.every(v => v === "47,90" || v === "77" || v === heVal), "valores em R$ no card: só o preço e a hora extra (" + [...new Set(valores)].join(", ") + ")");
        const lockedTxt = await page.locator("#locked").innerText();
        ok(/Contratar/.test(lockedTxt) && /Reduzir o horário/.test(lockedTxt) && /mais barata/.test(lockedTxt) && await page.locator("#locked h4", { hasText: "Contratar" }).evaluate(e => getComputedStyle(e).filter === "none"), "nomes das 3 saídas e da mais barata visíveis");
        ok(!/grátis|gratuit/i.test(await page.locator("body").innerText()), "sem a palavra grátis/gratuito na página");
        const cta = page.locator("#unlockBtn");
        ok(await cta.isVisible() && /Liberar meu resultado completo \+ escala pronta/.test(await cta.innerText()) && /R\$\s47,90/.test(await cta.innerText()), "CTA principal: liberar resultado completo + escala pronta, R$ 47,90");
        const ctaBox = await cta.boundingBox(), gateBox = await page.locator("#gate").boundingBox();
        ok(ctaBox && gateBox && ctaBox.y < gateBox.y, "cadastro opcional abaixo do CTA");
        ok(/Não vai comprar agora\?/.test(await page.locator("#gate").innerText()) && /WhatsApp \(opcional\)/.test(await page.locator("#gate").innerText()), "cadastro secundário com WhatsApp opcional");
        ok(!(await page.content()).includes("yy3LT4h"), "página não usa o checkout antigo");
        const pdf = await page.request.get(BASE + "/" + await page.locator("#unlock .pdf-link").getAttribute("href"));
        ok(pdf.status() === 200 && (pdf.headers()["content-type"] || "").includes("pdf"), "PDF de exemplo disponível");
      }

      // cadastro (em / é opcional; em /b/ é o caminho para a oferta)
      if (!c.direto) {
        await page.fill("#nome", "Teste Automatizado");
        if (!c.semWhats) await page.fill("#whats", "98999999999");
        await page.fill("#email", "teste@exemplo.com");
        await page.locator("#gateBtn").click();
        if (pagina === "/") await page.waitForSelector("#thanks:not([hidden])"); else await page.waitForSelector("#offer:not([hidden])");
        await page.waitForTimeout(200);
        ok(!!lead && lead.email === "teste@exemplo.com" && lead.utm_source === "teste", "lead enviado ao webhook com UTMs");
        ok(!!lead && "horas_descobertas_semana" in lead && "custo_contratar_mes" in lead && "variante" in lead, "lead com campos da planilha e variante (" + (lead && lead.variante) + ")");
        ok(!!lead && (c.semWhats ? lead.whatsapp === "" : lead.whatsapp === "98999999999"), "campo whatsapp " + (c.semWhats ? "vazio (opcional)" : "enviado"));
        ok(!!lead && lead.checkout_url && lead.checkout_url.includes("xftQB3Y"), "lead leva o checkout novo");
        if (pagina === "/") {
          ok(lead.variante === "a4", "variante a4");
          ok(/Enviamos a prévia para teste@exemplo.com/.test(await page.locator("#thanks").innerText()), "agradecimento com o e-mail");
          ok(await page.locator("#unlockBtn").isVisible(), "CTA continua visível depois do cadastro");
        } else {
          ok(await page.locator("#report").isVisible(), "relatório das 3 saídas visível");
        }
      } else {
        ok(lead === null, "sem cadastro, nenhum lead enviado");
      }
      const largura2 = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(largura2 <= 390, "sem rolagem horizontal depois do resultado (" + largura2 + "px)");

      await page.locator(pagina === "/" ? "#unlockBtn" : "#offer .checkout").click();
      await page.waitForTimeout(800);
      const comEmail = !c.direto;
      ok(!!checkout && checkout.includes("xftQB3Y") && checkout.includes("utm_source=teste") &&
        (comEmail ? checkout.includes("email=teste%40exemplo.com") && checkout.includes("name=Teste") : !checkout.includes("email=")),
        "checkout Kiwify novo com UTMs" + (comEmail ? ", e-mail e nome" : " (sem e-mail: só o que temos)"));
      ok(ev.some(e => e[1] === "InitiateCheckout" && e[2] && e[2].value === 47.9), "InitiateCheckout com value 47.9");
      ok(erros.length === 0, "sem erros de JavaScript" + (erros.length ? ": " + erros.join(" | ") : ""));
      await ctx.close();
    }
  }
  // /#card (links dos anúncios e do guia) cai na calculadora
  {
    console.log("/#card");
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.route("https://connect.facebook.net/**", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
    await page.goto(BASE + "/#card");
    await page.waitForTimeout(600);
    const top = await page.locator("#card").evaluate(el => el.getBoundingClientRect().top);
    ok(top >= 0 && top < 200, "#card ancora na calculadora (topo em " + Math.round(top) + "px)");
    ok(await page.locator("#card #calc").isVisible(), "calculadora dentro de #card");
    const heroTxt = await page.locator(".hero").innerText();
    ok(/Sua escala 5x2 pronta/.test(heroTxt) && /R\$\s47,90/.test(heroTxt) && /R\$\s77/.test(heroTxt) && /garantia de 7 dias/i.test(heroTxt), "hero mostra o produto, R$ 47,90 (de R$ 77) e garantia");
    ok(await page.locator(".hero #card").count() === 0, "calculadora fora do hero");
    await ctx.close();
  }
  // Guia do fim da escala 6x1: carrega, sem rolagem horizontal em 360px, CTA para a calculadora, JSON-LD válido
  const guias = fs.readdirSync(path.join(ROOT, "fim-da-escala-6x1"), { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => "/fim-da-escala-6x1/" + d.name + "/");
  for (const g of ["/fim-da-escala-6x1/", ...guias]) {
    console.log(g);
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    const erros = [];
    page.on("pageerror", e => erros.push(e.message));
    await page.route("https://connect.facebook.net/**", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
    const resp = await page.goto(BASE + g);
    ok(resp.status() === 200, "carrega");
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(largura <= 360, "sem rolagem horizontal em 360px (" + largura + "px)");
    ok(await page.locator('a[href$="#card"]').count() > 0, "tem CTA para a calculadora");
    const ld = await page.$$eval('script[type="application/ld+json"]', s => s.map(x => { try { JSON.parse(x.textContent); return true; } catch (e) { return false; } }));
    ok(ld.length > 0 && ld.every(Boolean), "JSON-LD válido (" + ld.length + ")");
    ok(erros.length === 0, "sem erros de JavaScript" + (erros.length ? ": " + erros.join(" | ") : ""));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(falhas ? "\n" + falhas + " falha(s)" : "\nTudo certo");
process.exit(falhas ? 1 : 0);
