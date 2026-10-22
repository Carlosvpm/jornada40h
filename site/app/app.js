/*
 * Jornada 40h — dashboard da escala 5x2 (entregável pago).
 * Roda inteiro no navegador em cima de ../js/escala.js (gerarEscala, montarDias, DIAS…).
 * Os dados do cliente ficam no aparelho (localStorage) e no link pessoal (#d=…, o fragmento
 * não vai ao servidor). Nada é enviado para fora.
 */
(function () {
  "use strict";

  var VERSOES = {
    "42": { jornadaSemanal: 42, jornadaDiariaMax: 8.4, rotulo: "42 h", quando: "a partir de dez/2026" },
    "40": { jornadaSemanal: 40, jornadaDiariaMax: 8, rotulo: "40 h", quando: "a partir de dez/2027" }
  };
  var SEMANAS = ["A", "B"];
  var SEM_POR_MES = 4.33;
  var INTERJORNADA_MIN = 11 * 60;
  // Base legal das regras da escala. Texto conferido na compilação do Planalto (via github.com/ctresb/leis,
  // out/2026); não substitui o Diário Oficial nem a convenção coletiva da categoria.
  var FONTE = {
    cf: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm",
    ec141: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm",
    clt: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm",
    l605: "https://www.planalto.gov.br/ccivil_03/leis/l0605.htm",
    l10101: "https://www.planalto.gov.br/ccivil_03/leis/l10101.htm"
  };
  var LEIS = {
    jornada: { ref: "CF, art. 7º, XIII", fonte: "cf", regra: "Jornada normal de até 8 h por dia e 40 h por semana (redação da EC 141/2026), com compensação de horários por acordo ou convenção. A EC 141 reduz o limite semanal aos poucos: por isso a escala tem a versão de 42 h e a de 40 h." },
    he: { ref: "CLT, art. 59", fonte: "clt", regra: "A jornada pode ter no máximo 2 horas extras por dia, pagas com pelo menos 50% a mais que a hora normal (§ 1º; CF, art. 7º, XVI)." },
    interjornada: { ref: "CLT, art. 66", fonte: "clt", regra: "Entre duas jornadas, no mínimo 11 horas seguidas de descanso." },
    dsr: { ref: "CLT, art. 67; Lei 605/1949, art. 1º", fonte: "clt", regra: "Todo empregado tem um descanso semanal de 24 horas seguidas, de preferência no domingo. A escala 5x2 dá 2 folgas por semana, acima desse mínimo." },
    intervalo: { ref: "CLT, art. 71", fonte: "clt", regra: "Turno de mais de 6 h tem intervalo de 1 a 2 h para refeição; de 4 a 6 h, 15 minutos. O intervalo não conta como hora trabalhada (§ 2º)." },
    domingo: { ref: "Lei 10.101/2000, art. 6º", fonte: "l10101", regra: "No comércio, o trabalho no domingo é permitido (respeitada a lei do município), e a folga semanal precisa cair no domingo pelo menos 1 vez a cada 3 semanas. Para mulheres, a CLT (art. 386) pede revezamento quinzenal." },
    revezamento: { ref: "CLT, art. 67, parágrafo único", fonte: "clt", regra: "Onde há trabalho no domingo, a escala de revezamento é organizada por mês e fica à vista da fiscalização." }
  };
  function lei(k) { return " (" + LEIS[k].ref + ")"; }
  var LS_KEY = "j40h:escala:v1";
  var XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  // Modo conta (/painel): o estado vem do banco e é salvo nele. Sem isso, fica no aparelho e no link.
  var PAINEL = window.J40H_PAINEL || null;

  var $ = function (s) { return document.querySelector(s); };
  var state = null;
  var hashOrigem = "";

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                         */
  /* ------------------------------------------------------------------ */

  function min(hhmm) { var p = String(hhmm || "0:0").split(":"); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
  function hhmm(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; var h = Math.floor(m / 60), r = m % 60; return (h < 10 ? "0" : "") + h + ":" + (r < 10 ? "0" : "") + r; }
  function falada(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; var h = Math.floor(m / 60), r = m % 60; return r ? h + "h" + (r < 10 ? "0" : "") + r : h + "h"; }
  function horas(h) { var v = Math.round(h * 10) / 10; return String(v).replace(".", ",") + " h"; }
  function brl(v) { return "R$ " + Math.round(v).toLocaleString("pt-BR"); }
  function brl2(v) { return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function dur(c) { var a = min(c.inicio), b = min(c.fim); if (b <= a) b += 1440; return (b - a) / 60; }
  function slug(s) { return String(s || "escala").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "escala"; }

  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Estado e persistência                                              */
  /* ------------------------------------------------------------------ */

  function estadoExemplo() {
    var f = {};
    DIAS.forEach(function (d) { f[d] = d === "dom" ? null : { abre: "06:00", fecha: d === "sab" ? "14:00" : "19:00", pessoas: 2 }; });
    var s = {
      v: 1,
      negocio: { nome: "Meu negócio", tipo: "Padaria" },
      funcionamento: f,
      equipe: exemploEquipe(4, "Padaria").map(function (p) { return { id: uid(), nome: p.nome, funcao: p.funcao, salario: null, folgaFixa: "" }; }),
      custos: { salario: 1800, encargos: 1.7, he: 50 },
      versao: "42", semana: "A", escalas: {}
    };
    gerarTudo(s);
    return s;
  }

  // Formato do link pessoal: o mesmo estado, sem nada além do necessário.
  function normalizar(s) {
    s.v = 1;
    s.negocio = s.negocio || { nome: "", tipo: "" };
    s.custos = s.custos || { salario: 1800, encargos: 1.7, he: 50 };
    s.versao = VERSOES[s.versao] ? s.versao : "42";
    s.semana = s.semana === "B" ? "B" : "A";
    s.equipe = (s.equipe || []).map(function (p) {
      var np = Array.isArray(p.naoPode) ? p.naoPode.filter(function (d) { return DIAS.indexOf(d) >= 0; }) : [];
      var hs = Number(p.horas) > 0 ? Math.min(60, Math.round(Number(p.horas))) : null;
      return { id: p.id || uid(), nome: p.nome || "", funcao: p.funcao || "", salario: p.salario || null, horas: hs, folgaFixa: p.folgaFixa || "", naoPode: np };
    });
    s.pendente = !!s.pendente;
    if (!s.escalas || !s.escalas["42"] || !s.escalas["40"]) gerarTudo(s);
    return s;
  }

  var salvarTimer = null;
  function salvar() {
    if (PAINEL) {
      $("#tSalvo").textContent = "salvando…";
      clearTimeout(salvarTimer);
      salvarTimer = setTimeout(salvarNaConta, 600);
      return;
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify({ hash: hashOrigem, state: state })); $("#tSalvo").textContent = "salvo neste aparelho"; }
    catch (e) { $("#tSalvo").textContent = "não foi possível salvar neste aparelho: use Copiar link"; }
  }

  function salvarNaConta() {
    fetch(PAINEL.api, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: state }) })
      .then(function (r) {
        if (r.status === 401) { location.href = PAINEL.login; return; }
        $("#tSalvo").textContent = r.ok ? "salvo na sua conta" : "erro ao salvar: tente de novo";
      })
      .catch(function () { $("#tSalvo").textContent = "sem conexão: alterações não salvas"; });
  }

  function carregar() {
    var salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { salvo = null; }
    var m = location.hash.match(/[#&]d=([A-Za-z0-9_-]+)/);
    if (m) {
      hashOrigem = m[1];
      // Mesmo link aberto de novo: vale o que foi editado neste aparelho.
      if (salvo && salvo.hash === hashOrigem && salvo.state) return normalizar(salvo.state);
      try { return normalizar(JSON.parse(b64urlDecode(m[1]))); }
      catch (e) { toast("Link inválido ou incompleto. Abrindo a última escala salva."); }
    }
    if (salvo && salvo.state) { hashOrigem = salvo.hash || ""; return normalizar(salvo.state); }
    return null;
  }

  function linkPessoal() {
    var h = b64urlEncode(JSON.stringify(state));
    hashOrigem = h;
    salvar();
    var url = location.origin + location.pathname + "#d=" + h;
    try { history.replaceState(null, "", "#d=" + h); } catch (e) {}
    return url;
  }

  /* ------------------------------------------------------------------ */
  /* Geração (motor) e cálculo                                          */
  /* ------------------------------------------------------------------ */

  // Meio período: carga semanal (horas) menor que a jornada da versão. O motor monta os turnos de quem
  // é tempo integral; quem é meio período entra depois, nos horários que ainda faltam gente.
  function parcial(p, v) { var h = Number(p.horas) || 0; return h > 0 && h < VERSOES[v].jornadaSemanal - 1e-9; }
  function limiteSemana(p, v) { return parcial(p, v) ? Number(p.horas) : VERSOES[v].jornadaSemanal; }

  function entradaMotor(s, v, sem, lista) {
    var vistos = {};
    var funcionarios = (lista || s.equipe).map(function (p, i) {
      var nome = (p.nome || "Pessoa " + (i + 1)).trim();
      while (vistos[nome]) nome = nome + " ·";
      vistos[nome] = true;
      var f = { nome: nome, funcao: p.funcao };
      if (p.folgaFixa) f.folgaFixa = p.folgaFixa;
      if (p.naoPode && p.naoPode.length) f.naoPode = p.naoPode.slice();
      return f;
    });
    return {
      negocio: { nome: s.negocio.nome, tipo: s.negocio.tipo },
      funcionamento: s.funcionamento,
      funcionarios: funcionarios,
      salarioMedio: s.custos.salario,
      semana: sem,
      regras: { jornadaSemanal: VERSOES[v].jornadaSemanal, jornadaDiariaMax: VERSOES[v].jornadaDiariaMax }
    };
  }

  function gerar(s, v, sem) {
    var integrais = s.equipe.filter(function (p) { return !parcial(p, v); });
    var saida = integrais.length ? gerarEscala(entradaMotor(s, v, sem, integrais)) : { grade: [] };
    var g = {};
    integrais.forEach(function (p, i) {
      var linha = saida.grade[i];
      g[p.id] = {};
      DIAS.forEach(function (d) {
        var c = linha ? linha.dias[d] : { tipo: "livre" };
        g[p.id][d] = c.tipo === "turno" ? { tipo: "turno", inicio: c.inicio, fim: c.fim, rotulo: c.rotulo } : { tipo: c.tipo };
      });
    });
    repararDescanso(g, integrais.map(function (p) { return p.id; }));
    encaixarParciais(s, v, g);
    return g;
  }

  // Início e fim de um turno em minutos, no mesmo eixo do dia (turno que vira a noite passa de 1440).
  function faixaTurno(c, abre) {
    var i = min(c.inicio), e = min(c.fim);
    if (i < abre - 120) { i += 1440; e += 1440; }
    if (e <= i) e += 1440;
    return [i, e];
  }

  // Coloca quem é meio período nos horários com menos gente que o pedido: a cada passo, o turno (até a
  // jornada diária e o que resta da carga semanal) que cobre mais meia-horas em falta, respeitando
  // folga fixa, dias que a pessoa não pode, 2 folgas e 11 h de descanso entre um dia e outro.
  function encaixarParciais(s, v, g) {
    var R = VERSOES[v], maxDia = Math.round(R.jornadaDiariaMax * 60);
    var parciais = s.equipe.filter(function (p) { return parcial(p, v); });
    if (!parciais.length) return;
    var falta = {};
    DIAS.forEach(function (d) {
      var f = s.funcionamento[d]; if (!f) return;
      var a = min(f.abre), b = min(f.fecha); if (b <= a) b += 1440;
      var need = Math.max(1, Number(f.pessoas) || 1), bl = [];
      var turnos = Object.keys(g).map(function (id) { return g[id][d]; }).filter(function (c) { return c && c.tipo === "turno"; }).map(function (c) { return faixaTurno(c, a); });
      for (var t = a; t < b; t += 30) {
        var n = 0; turnos.forEach(function (x) { if (x[0] <= t && t < x[1]) n++; });
        bl.push({ t: t, f: Math.max(0, need - n) });
      }
      falta[d] = { a: a, b: b, bl: bl };
    });
    parciais.forEach(function (p) {
      var resta = Math.round(Math.min(Number(p.horas), R.jornadaSemanal) * 60), usados = {}, nUsados = 0;
      g[p.id] = {};
      var cabe = function (d, ini, fim) {
        var i = DIAS.indexOf(d), ant = usados[DIAS[i - 1]], prox = usados[DIAS[i + 1]];
        return (!ant || ini + 1440 - ant[1] >= INTERJORNADA_MIN) && (!prox || prox[0] + 1440 - fim >= INTERJORNADA_MIN);
      };
      while (resta >= 120 && nUsados < 5) {
        var melhor = null, lim = Math.min(maxDia, resta);
        DIAS.forEach(function (d) {
          var F = falta[d];
          if (!F || usados[d] || p.folgaFixa === d || (p.naoPode || []).indexOf(d) >= 0) return;
          for (var i = 0; i < F.bl.length; i++) {
            if (!F.bl[i].f) continue;
            var ganho = 0;
            for (var j = i; j < F.bl.length && (j - i + 1) * 30 <= lim; j++) {
              if (!F.bl[j].f) continue;
              ganho += F.bl[j].f;
              var ini = F.bl[i].t, fim = F.bl[j].t + 30;
              if (fim - ini < 120) { fim = Math.min(F.b, ini + 120); ini = Math.max(F.a, fim - 120); }
              if (fim - ini > lim || !cabe(d, ini, fim)) continue;
              if (!melhor || ganho > melhor.ganho || (ganho === melhor.ganho && fim - ini < melhor.fim - melhor.ini)) melhor = { d: d, ini: ini, fim: fim, ganho: ganho };
            }
          }
        });
        if (!melhor) break;
        usados[melhor.d] = [melhor.ini, melhor.fim]; nUsados++;
        resta -= melhor.fim - melhor.ini;
        g[p.id][melhor.d] = { tipo: "turno", inicio: hhmm(melhor.ini), fim: hhmm(melhor.fim), rotulo: "Meio período" };
        falta[melhor.d].bl.forEach(function (x) { if (x.t >= melhor.ini && x.t < melhor.fim && x.f) x.f--; });
      }
      DIAS.forEach(function (d) { if (!g[p.id][d]) g[p.id][d] = { tipo: "folga" }; });
    });
  }

  // Descanso entre o fim de um turno e o início do turno do dia seguinte (minutos).
  function descanso(c1, c2) {
    if (!c1 || !c2 || c1.tipo !== "turno" || c2.tipo !== "turno") return Infinity;
    var fim = min(c1.fim); if (fim <= min(c1.inicio)) fim += 1440;
    return min(c2.inicio) + 1440 - fim;
  }

  // Nota da grade: menos violações é melhor; com o mesmo número, violação mais adiante na semana
  // é melhor (permite empurrar o problema em cadeia até o domingo, onde não há dia seguinte).
  function notaDescanso(g, ids) {
    var total = 0, primeira = DIAS.length;
    for (var i = 0; i < DIAS.length - 1; i++) {
      ids.forEach(function (id) {
        if (descanso(g[id][DIAS[i]], g[id][DIAS[i + 1]]) < INTERJORNADA_MIN) { total++; primeira = Math.min(primeira, i); }
      });
    }
    return total * 100 - primeira;
  }

  // O motor pode pôr quem fecha num dia para abrir no outro (19h → 5h30 = 10,5 h).
  // Busca exata: em cada dia mantém os mesmos turnos (cobertura igual) e só muda quem pega qual,
  // tentando primeiro a atribuição original. Memoriza becos sem saída; se estourar o limite,
  // cai no ajuste guloso.
  function repararDescanso(g, ids) {
    if (notaDescanso(g, ids) <= -DIAS.length) return;
    var dias = DIAS.map(function (d) {
      var quem = ids.filter(function (id) { return g[id][d] && g[id][d].tipo === "turno"; });
      var tipos = {}, ordem = [];
      quem.forEach(function (id) {
        var c = g[id][d], k = c.inicio + "-" + c.fim;
        if (!tipos[k]) { tipos[k] = { cell: c, n: 0 }; ordem.push(k); }
        tipos[k].n++;
      });
      return { d: d, quem: quem, tipos: tipos, ordem: ordem };
    });
    var falhou = {}, nos = 0, LIMITE = 200000;

    function dfs(i, prev) {
      if (i === DIAS.length) return [];
      if (++nos > LIMITE) return null;
      var D = dias[i];
      var chave = i + "|" + D.quem.map(function (id) { return prev[id] ? prev[id].inicio + prev[id].fim : ""; }).join(",");
      if (falhou[chave]) return null;
      var atual = {}, resto = {}, achou = null;
      D.ordem.forEach(function (k) { resto[k] = D.tipos[k].n; });
      (function atribui(j) {
        if (achou || nos > LIMITE) return;
        if (j === D.quem.length) {
          var r = dfs(i + 1, atual);
          if (r) achou = [clone(atual)].concat(r);
          return;
        }
        var id = D.quem[j], o = g[id][D.d], ko = o.inicio + "-" + o.fim;
        var ks = [ko].concat(D.ordem.filter(function (k) { return k !== ko; }));
        for (var x = 0; x < ks.length && !achou; x++) {
          var k = ks[x];
          if (!resto[k] || descanso(prev[id], D.tipos[k].cell) < INTERJORNADA_MIN) continue;
          resto[k]--; atual[id] = D.tipos[k].cell;
          atribui(j + 1);
          resto[k]++; delete atual[id];
        }
      })(0);
      if (!achou) falhou[chave] = true;
      return achou;
    }

    var sol = dfs(0, {});
    if (sol) {
      sol.forEach(function (a, i) { Object.keys(a).forEach(function (id) { g[id][DIAS[i]] = clone(a[id]); }); });
      return;
    }
    repararGuloso(g, ids);
  }

  // 1) Dia a dia, mantém os turnos do dia e redistribui quem pega qual: os turnos mais tarde vão
  //    primeiro para quem não pode entrar cedo (fechou ontem) e, no empate, para quem folga antes
  //    (fechar compromete o dia seguinte). 2) Ajuste fino com trocas enquanto a nota melhorar.
  function repararGuloso(g, ids) {
    DIAS.forEach(function (d, i) {
      var quem = ids.filter(function (id) { return g[id][d] && g[id][d].tipo === "turno"; });
      var turnos = quem.map(function (id) { return g[id][d]; })
        .sort(function (a, b) { return min(b.inicio) - min(a.inicio); });
      function cedo(id) { // primeira hora em que pode entrar (minutos do dia), pelo turno de ontem
        var ont = i > 0 ? g[id][DIAS[i - 1]] : null;
        if (!ont || ont.tipo !== "turno") return -Infinity;
        var fim = min(ont.fim); if (fim <= min(ont.inicio)) fim += 1440;
        return fim + INTERJORNADA_MIN - 1440;
      }
      function sequencia(id) { var n = 0; for (var j = i + 1; j < DIAS.length && g[id][DIAS[j]] && g[id][DIAS[j]].tipo === "turno"; j++) n++; return n; }
      var livres = quem.slice(), novo = {};
      turnos.forEach(function (t) {
        var podem = livres.filter(function (id) { return min(t.inicio) >= cedo(id); });
        var lista = podem.length ? podem : livres;
        lista.sort(function (a, b) { return (cedo(b) - cedo(a)) || (sequencia(a) - sequencia(b)); });
        var id = lista[0];
        novo[id] = t;
        livres.splice(livres.indexOf(id), 1);
      });
      quem.forEach(function (id) { g[id][d] = novo[id]; });
    });

    var nota = notaDescanso(g, ids);
    while (nota > 0 - DIAS.length) {
      var melhor = null;
      DIAS.forEach(function (dia) {
        ids.forEach(function (a, ia) {
          ids.forEach(function (b, ib) {
            if (ib <= ia) return;
            var ca = g[a][dia], cb = g[b][dia];
            if (!ca || !cb || ca.tipo !== "turno" || cb.tipo !== "turno" || (ca.inicio === cb.inicio && ca.fim === cb.fim)) return;
            g[a][dia] = cb; g[b][dia] = ca;
            var n = notaDescanso(g, ids);
            if (n < nota && (!melhor || n < melhor.n)) melhor = { n: n, dia: dia, a: a, b: b };
            g[a][dia] = ca; g[b][dia] = cb;
          });
        });
      });
      if (!melhor) break;
      var t = g[melhor.a][melhor.dia]; g[melhor.a][melhor.dia] = g[melhor.b][melhor.dia]; g[melhor.b][melhor.dia] = t;
      nota = melhor.n;
    }
  }

  function gerarTudo(s) {
    s.escalas = {};
    Object.keys(VERSOES).forEach(function (v) {
      s.escalas[v] = {};
      SEMANAS.forEach(function (sem) { s.escalas[v][sem] = gerar(s, v, sem); });
    });
  }

  function celula(s, v, sem, id, d) {
    var f = s.funcionamento[d];
    if (!f) return { tipo: "fechado" };
    var g = s.escalas[v][sem][id];
    var c = g && g[d];
    if (!c || c.tipo === "fechado") return { tipo: "livre" };
    return c;
  }

  // Cobertura em blocos de 30 min, horas por pessoa e alertas legais.
  function calcular(s, v, sem) {
    var R = VERSOES[v];
    var res = { dias: {}, pessoas: [], falta: 0, sobra: 0, erros: [], avisos: [], trabalhandoNoDia: {} };
    DIAS.forEach(function (d) {
      var f = s.funcionamento[d];
      if (!f) { res.dias[d] = { aberto: false }; return; }
      var a = min(f.abre), b = min(f.fecha); if (b <= a) b += 1440;
      var need = Math.max(1, Number(f.pessoas) || 1);
      var turnos = s.equipe.map(function (p) { return celula(s, v, sem, p.id, d); }).filter(function (c) { return c.tipo === "turno"; })
        .map(function (c) { var i = min(c.inicio), e = min(c.fim); if (i < a - 120) { i += 1440; e += 1440; } if (e <= i) e += 1440; return [i, e]; });
      var blocos = [], falta = 0, sobra = 0;
      for (var t = a; t < b; t += 30) {
        var n = 0; turnos.forEach(function (x) { if (x[0] <= t && t < x[1]) n++; });
        blocos.push({ t: t, n: n, need: need });
        falta += Math.max(0, need - n) * 0.5; sobra += Math.max(0, n - need) * 0.5;
      }
      var faixas = [], cur = null;
      blocos.forEach(function (bl) {
        var def = Math.max(0, bl.need - bl.n);
        if (def > 0) {
          if (cur && cur.def === def && cur.fim === bl.t) cur.fim = bl.t + 30;
          else { cur = { def: def, ini: bl.t, fim: bl.t + 30 }; faixas.push(cur); }
        } else cur = null;
      });
      res.dias[d] = { aberto: true, abre: a, fecha: b, need: need, blocos: blocos, falta: falta, sobra: sobra, faixas: faixas };
      res.trabalhandoNoDia[d] = turnos.length;
      res.falta += falta; res.sobra += sobra;
    });

    s.equipe.forEach(function (p, idx) {
      var nome = p.nome || "Pessoa " + (idx + 1);
      var h = 0, folgas = 0, erros = {};
      DIAS.forEach(function (d, i) {
        var c = celula(s, v, sem, p.id, d);
        if (c.tipo !== "turno") { folgas++; return; }
        var du = dur(c); h += du;
        if (du > R.jornadaDiariaMax + 2 + 1e-9) { erros[d] = 1; res.erros.push(nome + " faz " + horas(du) + " " + prep(d) + ": passa do máximo de " + horas(R.jornadaDiariaMax + 2) + " por dia (jornada + 2 h extras)" + lei("he") + "."); }
        else if (du > R.jornadaDiariaMax + 1e-9) res.avisos.push(nome + " faz " + horas(du) + " " + prep(d) + ": " + horas(du - R.jornadaDiariaMax) + " de hora extra, paga com adicional" + lei("he") + ".");
        var prox = DIAS[i + 1];
        if (prox) {
          var c2 = celula(s, v, sem, p.id, prox);
          if (c2.tipo === "turno") {
            var fim = min(c.fim); if (fim <= min(c.inicio)) fim += 1440;
            var desc = min(c2.inicio) + 1440 - fim;
            if (desc < INTERJORNADA_MIN) { erros[prox] = 1; res.erros.push(nome + " descansa só " + horas(desc / 60) + " entre " + NOME_DIA[d].toLowerCase() + " e " + NOME_DIA[prox].toLowerCase() + " (mínimo de 11 h entre um dia e outro)" + lei("interjornada") + "."); }
          }
        }
      });
      var lim = limiteSemana(p, v);
      if (h > lim + 1e-9) res.erros.push(nome + " soma " + horas(h) + " na semana, " + horas(h - lim) + " acima " + (lim < R.jornadaSemanal ? "das " + horas(lim) + " do contrato de meio período" : "da jornada de " + R.rotulo) + " (vira hora extra)" + lei("jornada") + ".");
      if (folgas < 2) res.erros.push(nome + " tem " + (folgas === 1 ? "só 1 folga" : "nenhuma folga") + " na semana. Na escala 5x2 são 2; a lei exige pelo menos 1 descanso de 24 h" + lei("dsr") + ".");
      res.pessoas.push({ id: p.id, nome: nome, horas: h, folgas: folgas, erros: erros, extra: Math.max(0, h - lim), limite: lim });
    });
    return res;
  }

  function prep(d) { return d === "sab" ? "no sábado" : d === "dom" ? "no domingo" : "na " + NOME_DIA[d].toLowerCase(); }

  function textoFaixa(fx) {
    return fx.map(function (f) { return (f.def === 1 ? "falta 1" : "faltam " + f.def) + " das " + falada(f.ini) + " às " + falada(f.fim); }).join(", ");
  }

  // Quantos turnos o horário pede na semana (pessoas ao mesmo tempo × turnos do dia) e quantas
  // pessoas isso exige: cada uma faz no máximo 5 turnos (2 folgas). É isso que limita, não as horas.
  function contaTurnos(s, v) {
    var R = VERSOES[v], dias = montarDias(s.funcionamento, { jornadaDiariaMax: R.jornadaDiariaMax }), total = 0, porDia = {};
    DIAS.forEach(function (d) {
      var f = s.funcionamento[d]; if (!f) return;
      var n = Math.max(1, (dias[d] && dias[d].turnos || []).length) * Math.max(1, Number(f.pessoas) || 1);
      porDia[d] = n; total += n;
    });
    return { total: total, porDia: porDia, pessoas: Math.ceil(total / 5) };
  }

  // Monta a escala de novo com n pessoas a mais e mede o que ainda falta (memória por dados de entrada).
  var simCache = {};
  function simularContratacao(s, v, sem, n) {
    var k = JSON.stringify([s.funcionamento, s.equipe, v, sem, n]);
    if (simCache[k]) return simCache[k];
    var s2 = { negocio: s.negocio, funcionamento: s.funcionamento, custos: s.custos, equipe: s.equipe.slice(), escalas: {} };
    for (var i = 0; i < n; i++) s2.equipe.push({ id: "sim" + i, nome: "", funcao: "", naoPode: [] });
    s2.escalas[v] = {};
    SEMANAS.forEach(function (w) { s2.escalas[v][w] = gerar(s2, v, w); });
    var c = calcular(s2, v, sem);
    return (simCache[k] = { falta: c.falta, dias: DIAS.filter(function (d) { return c.dias[d].aberto && c.dias[d].falta; }), calc: c });
  }

  // Custo mensal de uma pessoa: salário dela (ou a média) × encargos; meio período sem salário
  // informado paga a média proporcional às horas.
  function custoPessoa(p, s, v) {
    var enc = Number(s.custos.encargos) || 1;
    if (Number(p.salario) > 0) return Number(p.salario) * enc;
    return (Number(s.custos.salario) || 0) * enc * (parcial(p, v) ? Number(p.horas) / VERSOES[v].jornadaSemanal : 1);
  }

  // Saídas para cobrir as horas descobertas, com custo mensal.
  function custos(s, v, calc) {
    var R = VERSOES[v], C = s.custos;
    var sal = Number(C.salario) || 0, enc = Number(C.encargos) || 1, adic = (Number(C.he) || 50) / 100;
    var valorHora = sal / (R.jornadaSemanal * 5);
    var folha = s.equipe.reduce(function (t, p) { return t + custoPessoa(p, s, v); }, 0);
    var extraGrade = calc.pessoas.reduce(function (t, p) { return t + p.extra; }, 0);
    var D = calc.falta;
    var ops = [];

    if (D > 0.01) {
      // Hora extra: limite legal de 2 h por pessoa por dia
      var maxDia = 0, inviavel = [];
      var longo = false;
      DIAS.forEach(function (d) {
        var dia = calc.dias[d]; if (!dia.aberto || !dia.falta) return;
        var cap = 2 * (calc.trabalhandoNoDia[d] || 0);
        // Hora extra estica um turno que já existe: até 2 h depois do fim ou antes do início.
        var seguido = dia.faixas.some(function (fx) {
          var ponta = fx.ini <= dia.abre || fx.fim >= dia.fecha;
          return (fx.fim - fx.ini) / 60 > (ponta ? 2 : 4) + 1e-9;
        });
        if (seguido) longo = true;
        if (dia.falta > cap + 1e-9 || seguido) inviavel.push(NOME_DIA[d].toLowerCase());
        maxDia = Math.max(maxDia, dia.falta / Math.max(1, calc.trabalhandoNoDia[d] || 0));
      });
      ops.push({
        id: "he", titulo: "Pagar hora extra", custo: (D + extraGrade) * SEM_POR_MES * valorHora * (1 + adic),
        viavel: !inviavel.length,
        txt: inviavel.length
          ? "Não resolve sozinha: em " + inviavel.join(", ") + (longo ? " o buraco passa de 2 h seguidas, e cada pessoa pode fazer no máximo 2 h extras por dia, esticando o próprio turno." : " seriam mais de 2 h extras por pessoa, acima do limite legal.")
          : horas(D) + " extras por semana divididas na equipe (até 2 h por pessoa por dia), com " + Math.round(adic * 100) + "% de adicional. Hora: " + brl(valorHora) + "."
      });

      // Contratar: monta a escala com 1, 2… pessoas a mais até cobrir tudo. A conta só por horas
      // (falta ÷ jornada) engana: o que limita são os turnos por dia, e quem entra também tem 2 folgas.
      var custoContr, txtContr, J = R.jornadaSemanal, parcial = function (h) { return Math.min(30, Math.ceil(h / 2) * 2); };
      var sims = [{ falta: D, dias: DIAS.filter(function (d) { return calc.dias[d].aberto && calc.dias[d].falta; }) }];
      for (var n = 1; n <= 4 && sims[n - 1].falta > 0.01; n++) sims.push(simularContratacao(s, v, s.semana || "A", n));
      var nInt = sims.length - 1, cobre = sims[nInt].falta <= 0.01;
      // Candidatas: k integrais + 1 meio período cobrindo o que ainda falta (até 30 h), ou só integrais.
      var opcoesC = [];
      sims.forEach(function (sm, k) {
        if (sm.falta <= 0.01) opcoesC.push({ n: k, h: 0, custo: k * sal * enc });
        else if (sm.falta <= 30) opcoesC.push({ n: k, h: parcial(sm.falta), dias: sm.dias, custo: k * sal * enc + sal * (parcial(sm.falta) / J) * enc });
      });
      var esc0 = opcoesC.sort(function (a, b) { return a.custo - b.custo; })[0];
      var diasTxt = function (ds) { return (ds || []).map(function (d) { return NOME_DIA_CURTO[d].toLowerCase(); }).join(", "); };
      if (esc0) {
        custoContr = esc0.custo;
        txtContr = (esc0.n ? esc0.n + (esc0.n === 1 ? " pessoa" : " pessoas") + " em tempo integral (" + R.rotulo + ")" + (esc0.h ? " e " : "") : "") +
          (esc0.h ? (esc0.n ? "1 em" : "1 pessoa em") + " meio período de " + esc0.h + " h por semana, nos horários que faltam (" + diasTxt(esc0.dias) + ")" : "") +
          ", com salário de " + brl(sal) + (esc0.h ? " (proporcional no meio período)" : "") + " × " + String(enc).replace(".", ",") + " de encargos.";
        if (esc0.h && sims[esc0.n + 1] && sims[esc0.n + 1].falta > 0.01) txtContr += " Mais 1 pessoa em tempo integral no lugar do meio período sairia mais caro e ainda deixaria " + horas(sims[esc0.n + 1].falta) + " sem cobertura: o que falta são turnos em dias específicos, não horas na semana.";
      } else {
        custoContr = nInt * sal * enc;
        txtContr = nInt + " pessoas em tempo integral ainda deixam " + horas(sims[nInt].falta) + " sem cobertura. Vale rever o horário de funcionamento ou o número de pessoas por dia.";
      }
      // Economia: o mesmo resultado só com gente em tempo integral (o que costuma ser feito) custaria mais.
      var kSo = -1; sims.forEach(function (sm, k) { if (kSo < 0 && k > 0 && sm.falta <= 0.01) kSo = k; });
      var economia = esc0 && kSo > 0 && kSo * sal * enc - esc0.custo > 1 ? { valor: Math.round(kSo * sal * enc - esc0.custo), n: kSo, base: Math.round(kSo * sal * enc) } : null;
      ops.push({ id: "contratar", titulo: "Contratar", custo: custoContr + extraGrade * SEM_POR_MES * valorHora * (1 + adic), viavel: !!esc0, txt: txtContr,
        plano: esc0 ? { n: esc0.n, h: esc0.h, dias: esc0.dias || [] } : null, economia: economia, acao: esc0 ? "Aplicar na escala" : "" });

      var piores = DIAS.filter(function (d) { return calc.dias[d].aberto && calc.dias[d].falta; });
      ops.push({
        id: "reduzir", titulo: "Reduzir horário ou atender com menos gente", custo: extraGrade * SEM_POR_MES * valorHora * (1 + adic), viavel: true, semFolha: true,
        txt: "Sem custo extra de folha, mas são " + horas(D) + " por semana de atendimento a menos (" + piores.map(function (d) { return NOME_DIA_CURTO[d]; }).join(", ") + "). Vale para horários de pouco movimento."
      });
      var melhores = ops.filter(function (o) { return o.viavel && !o.semFolha; }).sort(function (a, b) { return a.custo - b.custo; });
      if (melhores[0]) melhores[0].best = true;
    }
    return { folha: folha, valorHora: valorHora, D: D, extraGrade: extraGrade, ops: ops };
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  function render() {
    var v = state.versao, sem = state.semana, R = VERSOES[v];
    var calc = calcular(state, v, sem);
    var cus = custos(state, v, calc);

    document.title = "Escala 5x2 · " + (state.negocio.nome || "Jornada 40h") + " · " + R.rotulo;
    $("#tNegocio").textContent = state.negocio.nome || "Minha escala";
    $("#tSemana").textContent = "· " + R.rotulo + " · semana " + sem;
    $("#tSub").textContent = "Escala 5x2 da equipe na jornada de " + R.rotulo + " (" + R.quando + "), semana " + sem + " do rodízio.";
    $("#sbNegocio").textContent = state.negocio.nome || "Meu negócio";
    $("#sbTipo").textContent = [state.negocio.tipo, state.equipe.length + (state.equipe.length === 1 ? " pessoa" : " pessoas")].filter(Boolean).join(" · ");
    var hr = new Date().getHours();
    $("#tSaud").textContent = (hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite") + (state.negocio.nome ? ", " + state.negocio.nome : "");
    $("#tData").textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("#sbAlertas").hidden = !calc.erros.length;
    $("#sbAlertas").textContent = calc.erros.length;
    $("#phInfo").textContent = (state.negocio.nome || "") + " · " + R.rotulo + " (" + R.quando + ") · semana " + sem + " · " + new Date().toLocaleDateString("pt-BR");
    document.querySelectorAll("[data-v]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.v === v ? "true" : "false"); });
    document.querySelectorAll("[data-s]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.s === sem ? "true" : "false"); });

    // KPIs
    var best = cus.ops.filter(function (o) { return o.best; })[0];
    $("#kpis").innerHTML =
      kpi(cus.D > 0.01 ? "red" : "green", "i-clock", "Horas sem cobertura", horas(cus.D), "por semana, na versão de " + R.rotulo) +
      kpi("blue", "i-users", "Equipe", state.equipe.length + (state.equipe.length === 1 ? " pessoa" : " pessoas"), "folha de ~" + brl(cus.folha) + "/mês") +
      kpi("gold", "i-money", "Saída mais barata", best ? brl(best.custo) + "/mês" : cus.D > 0.01 ? "—" : "R$ 0",
        best ? best.titulo.toLowerCase() + (best.economia ? " · economiza " + brl(best.economia.valor) + "/mês" : "") : cus.D > 0.01 ? "sem saída dentro da lei só com hora extra" :
        state.plano && state.plano.economia ? "tudo coberto · economia de " + brl(state.plano.economia) + "/mês" : "horário todo coberto") +
      kpi(calc.erros.length ? "red" : "green", "i-shield", "Pontos fora da lei", String(calc.erros.length), calc.erros.length ? "veja os alertas" : "jornada, folgas e descanso ok");

    renderGrade(calc);
    atualizarPerfil();
    renderCustos(cus);
    renderAlertas(calc, cus);
  }

  function kpi(cls, icone, rot, val, sub) {
    return '<div class="kpi ' + cls + '"><div><span>' + esc(rot) + "</span><b>" + esc(val) + "</b><small>" + esc(sub) + "</small></div>" +
      '<div class="kic"><svg class="ic"><use href="#' + icone + '"/></svg></div></div>';
  }

  // Rótulo curto na grade (o completo fica no title).
  var ROTULO_CURTO = { "abertura": "abre", "fechamento": "fecha", "meio": "meio", "turno único": "único" };
  var HOJE = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"][new Date().getDay()];

  function iniciais(nome) {
    var partes = String(nome || "?").trim().split(/\s+/);
    return ((partes[0] || "?")[0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  }

  var vista = (function () { try { return localStorage.getItem("j40h:vista") === "pessoa" ? "pessoa" : "turno"; } catch (e) { return "turno"; } })();

  function renderGrade(calc) {
    if (vista === "pessoa") renderGradePessoa(calc); else renderGradeTurno(calc);
    $("#grid").className = "grid " + (vista === "pessoa" ? "por-pessoa" : "por-turno");
    document.querySelectorAll("#vistas [data-vista]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.vista === vista ? "true" : "false"); });
    $("#legenda").hidden = vista === "turno";
    $("#pend").hidden = !state.pendente;
    renderEquipe(calc);
    renderExplica(calc);
    $("#gradeNota").textContent = "Semana " + state.semana + ": quem folga no fim de semana alterna entre as semanas A e B. Intervalo de refeição (1 h para turnos acima de 6 h) fica dentro do turno e não conta como trabalho: combine o horário para não esvaziar o balcão.";
  }

  function thDias() {
    var h = "";
    DIAS.forEach(function (d) {
      var f = state.funcionamento[d];
      h += '<th class="dia' + (d === HOJE ? " hoje" : "") + '"><button type="button" class="dia-b" data-dia="' + d + '" title="Editar horário de ' + NOME_DIA[d] + '"><b>' + NOME_DIA[d] + '<svg class="ic"><use href="#i-edit"/></svg></b>' +
        (f ? '<span class="hr">' + falada(min(f.abre)) + "–" + falada(min(f.fecha)) + '</span><span class="pp" title="pessoas ao mesmo tempo"><svg class="ic"><use href="#i-users"/></svg>' + f.pessoas + "</span>"
           : '<span class="hr">fechado</span>') + "</button></th>";
    });
    return h;
  }

  function tfootCobertura(calc) {
    var h = '<tfoot><tr class="cob"><td class="p">Cobertura</td>';
    DIAS.forEach(function (d) {
      var dia = calc.dias[d];
      if (!dia.aberto) { h += "<td></td>"; return; }
      h += '<td><div class="bars">' + dia.blocos.map(function (b) { return "<i" + (b.n < b.need ? ' class="f"' : b.n > b.need ? ' class="s"' : "") + ' title="' + hhmm(b.t) + ": " + b.n + " de " + b.need + '"></i>'; }).join("") + "</div>";
      h += dia.falta ? '<div class="cobtxt f"><b>' + horas(dia.falta) + " a cobrir</b><span>" + esc(textoFaixa(dia.faixas)) + "</span></div>" : '<div class="cobtxt"><b>Coberto</b></div>';
      h += "</td>";
    });
    return h + (vista === "pessoa" ? "<td></td>" : "") + "</tr></tfoot>";
  }

  // Grupo do turno pelo horário (não pelo rótulo): vale também para turnos editados à mão.
  var GRUPOS = [
    { id: "abertura", nome: "Abertura", sub: "entra quando abre" },
    { id: "meio", nome: "Meio do dia", sub: "reforço no movimento" },
    { id: "fechamento", nome: "Fechamento", sub: "sai quando fecha" },
    { id: "dia", nome: "Dia todo", sub: "abre e fecha" },
    { id: "folga", nome: "Folga", sub: "descanso da semana" },
    { id: "livre", nome: "Reserva", sub: "sem turno marcado" }
  ];

  function grupoDe(c, f) {
    if (c.tipo !== "turno") return c.tipo;
    var a = min(f.abre), b = min(f.fecha); if (b <= a) b += 1440;
    var i = min(c.inicio), e = min(c.fim); if (e <= i) e += 1440;
    var abre = i <= a + 15, fecha = e >= b - 15;
    return abre && fecha ? "dia" : abre ? "abertura" : fecha ? "fechamento" : "meio";
  }

  function renderGradeTurno(calc) {
    var v = state.versao, sem = state.semana;
    var mapa = {};
    GRUPOS.forEach(function (g) { mapa[g.id] = {}; DIAS.forEach(function (d) { mapa[g.id][d] = []; }); });
    state.equipe.forEach(function (p, i) {
      DIAS.forEach(function (d) {
        var f = state.funcionamento[d]; if (!f) return;
        var c = celula(state, v, sem, p.id, d);
        mapa[grupoDe(c, f)][d].push({ p: p, i: i, c: c, err: !!calc.pessoas[i].erros[d] });
      });
    });
    var h = '<thead><tr><th class="p cap">Turno</th>' + thDias() + "</tr></thead><tbody>";
    GRUPOS.forEach(function (g) {
      var tem = DIAS.some(function (d) { return mapa[g.id][d].length; });
      if (!tem && g.id !== "folga") return;
      h += '<tr class="g-' + g.id + '"><td class="p"><b>' + g.nome + "</b><small>" + g.sub + "</small></td>";
      DIAS.forEach(function (d) {
        var lista = mapa[g.id][d], hj = d === HOJE ? " hoje" : "";
        if (!state.funcionamento[d]) { h += '<td class="fech' + hj + '"></td>'; return; }
        // Horário mais comum do turno no dia vai no topo; quem foge dele mostra o próprio horário.
        var cont = {}, topo = "";
        lista.forEach(function (x) { if (x.c.tipo === "turno") { var k = x.c.inicio + "-" + x.c.fim; cont[k] = (cont[k] || 0) + 1; if (!topo || cont[k] > cont[topo]) topo = k; } });
        h += '<td class="' + hj.trim() + '" data-ag="' + g.id + '" data-ad="' + d + '"' + (topo ? ' data-faixa="' + topo + '"' : "") + ">";
        if (topo) { var tt = topo.split("-"); h += '<div class="faixa">' + falada(min(tt[0])) + "–" + falada(min(tt[1])) + "</div>"; }
        h += '<div class="pcs">';
        lista.forEach(function (x) {
          var k = x.c.tipo === "turno" ? x.c.inicio + "-" + x.c.fim : "";
          var dif = k && k !== topo ? "<small>" + falada(min(x.c.inicio)) + "–" + falada(min(x.c.fim)) + "</small>" : "";
          var tit = x.p.nome + " · " + NOME_DIA[d] + (x.c.tipo === "turno" ? " · " + falada(min(x.c.inicio)) + "–" + falada(min(x.c.fim)) + " (" + horas(dur(x.c)) + ")" : x.c.tipo === "folga" ? " · folga" : " · reserva");
          h += '<button type="button" class="pc c' + (x.i % 8) + (x.err ? " erro" : "") + '" data-p="' + x.p.id + '" data-d="' + d + '" title="' + esc(tit) + '"><span class="dot"></span><span class="nm">' + esc(x.p.nome || "Pessoa") + "</span>" + dif + "</button>";
        });
        h += "</div></td>";
      });
      h += "</tr>";
    });
    h += "</tbody>" + tfootCobertura(calc);
    $("#grid").innerHTML = h;
  }

  function renderEquipe(calc) {
    var R = VERSOES[state.versao];
    var h = state.equipe.map(function (p, i) {
      var pc = calc.pessoas[i], over = pc.horas > pc.limite + 1e-9;
      var tags = [];
      if (parcial(p, state.versao)) tags.push("meio período " + p.horas + " h");
      if (p.folgaFixa) tags.push("folga " + NOME_DIA_CURTO[p.folgaFixa].toLowerCase());
      if (p.naoPode && p.naoPode.length) tags.push("não pode " + p.naoPode.map(function (d) { return NOME_DIA_CURTO[d].toLowerCase(); }).join(", "));
      return '<button type="button" class="pp-chip c' + (i % 8) + '" data-pessoa="' + p.id + '" title="Editar ' + esc(p.nome) + '"><span class="ini">' + esc(iniciais(pc.nome)) + "</span><span><b>" + esc(pc.nome) + '</b><small><span class="' + (over ? "over" : "") + '">' + horas(pc.horas) + "</span>" + (p.funcao ? " · " + esc(p.funcao) : "") + (tags.length ? " · " + esc(tags.join(" · ")) : "") + "</small></span></button>";
    }).join("");
    $("#equipeStrip").innerHTML = h + '<button type="button" class="pp-chip add" id="btnAddPessoa2"><span class="ini"><svg class="ic"><use href="#i-plus"/></svg></span><span><b>Adicionar</b><small>pessoa na equipe</small></span></button>';
  }

  // Explica a escala com os números dela: turnos de cada dia e a conta das horas.
  function renderExplica(calc) {
    var R = VERSOES[state.versao];
    var dias = montarDias(state.funcionamento, { jornadaDiariaMax: R.jornadaDiariaMax });
    var grupos = [];
    DIAS.forEach(function (d) {
      var f = state.funcionamento[d]; if (!f) return;
      var k = f.abre + f.fecha + f.pessoas, g = grupos.filter(function (x) { return x.k === k; })[0];
      if (g) g.dias.push(d); else grupos.push({ k: k, dias: [d], f: f, turnos: (dias[d] && dias[d].turnos) || [] });
    });
    var nomeDias = function (ds) {
      var idx = ds.map(function (d) { return DIAS.indexOf(d); });
      var seguidos = idx.every(function (x, j) { return !j || x === idx[j - 1] + 1; });
      if (ds.length > 2 && seguidos) return NOME_DIA[ds[0]] + " a " + NOME_DIA[ds[ds.length - 1]].toLowerCase();
      return ds.map(function (d, j) { return j ? NOME_DIA[d].toLowerCase() : NOME_DIA[d]; }).join(ds.length === 2 ? " e " : ", ");
    };
    var li = grupos.map(function (g) {
      var aberto = dur({ inicio: g.f.abre, fim: g.f.fecha });
      var t = "<b>" + nomeDias(g.dias) + "</b>: aberto " + falada(min(g.f.abre)) + "–" + falada(min(g.f.fecha)) + " (" + horas(aberto) + "), com " + g.f.pessoas + (Number(g.f.pessoas) === 1 ? " pessoa" : " pessoas") + " ao mesmo tempo. ";
      if (g.turnos.length <= 1) t += "Cabe num turno só de " + horas(aberto) + ".";
      else {
        t += "Como ninguém pode passar de " + horas(R.jornadaDiariaMax) + " por dia, o dia vira " + g.turnos.length + " turnos: " +
          g.turnos.map(function (x) { return x.rotulo.toLowerCase() + " " + falada(x.inicio) + "–" + falada(x.fim); }).join(", ") + ".";
        var a = g.turnos[0], b = g.turnos[1];
        if (b && b.inicio < a.fim) t += " Eles se cruzam das " + falada(b.inicio) + " às " + falada(a.fim) + ": é a hora da troca e do intervalo de refeição.";
      }
      return "<li>" + t + "</li>";
    });
    var pede = 0;
    DIAS.forEach(function (d) { var f = state.funcionamento[d]; if (f) pede += dur({ inicio: f.abre, fim: f.fecha }) * Math.max(1, Number(f.pessoas) || 1); });
    var trab = calc.pessoas.reduce(function (t, p) { return t + p.horas; }, 0);
    var capac = calc.pessoas.reduce(function (t, p) { return t + p.limite; }, 0);
    var nParc = state.equipe.filter(function (p) { return parcial(p, state.versao); }).length, nInt = state.equipe.length - nParc;
    var conta = "<p><b>A conta das horas.</b> O seu horário pede <b>" + horas(pede) + "</b> de trabalho por semana (horas abertas × pessoas ao mesmo tempo). " +
      "A equipe tem até <b>" + horas(capac) + "</b> (" + nInt + " × " + R.rotulo + (nParc ? " + " + (nParc === 1 ? "1 meio período" : nParc + " meios períodos") : "") + ") e está escalada para <b>" + horas(trab) + "</b>. ";
    if (calc.falta > 0.01) {
      conta += (calc.sobra > 0.01 ? horas(calc.sobra) + " dessas horas caem em horários que já têm gente suficiente (quando os turnos se cruzam) e não cobrem outro horário. " : "") +
        "Por isso ficam <b>" + horas(calc.falta) + " sem cobertura</b>" + (pede > capac ? ", e só a diferença entre o que o horário pede e o que a equipe tem já dá " + horas(pede - capac) + "." : ".") +
        " O card de custos mostra quanto sai cada jeito de cobrir.</p>";
    } else conta += "Todo o horário está coberto.</p>";
    var ct = contaTurnos(state, state.versao);
    conta += "<p><b>A conta dos turnos.</b> Mais importante que as horas é o número de turnos: o seu horário pede <b>" + ct.total + " turnos por semana</b> (" +
      DIAS.filter(function (d) { return ct.porDia[d]; }).map(function (d) { return NOME_DIA_CURTO[d].toLowerCase() + " " + ct.porDia[d]; }).join(", ") +
      "), e cada pessoa faz no máximo 5, por causa das 2 folgas. Para cobrir tudo só com tempo integral são necessárias <b>" + ct.pessoas + " pessoas</b>; hoje a equipe tem " + nInt + (nParc ? " em tempo integral e " + nParc + " em meio período" : "") + "." +
      (calc.falta <= 0.01 && ct.pessoas > nInt ? " O meio período cobre os turnos que faltavam." : "") +
      (calc.falta > 0.01 && ct.pessoas > state.equipe.length ? " Faltam os turnos de " + (ct.pessoas - state.equipe.length) + (ct.pessoas - state.equipe.length === 1 ? " pessoa" : " pessoas") + ", mesmo que a soma das horas pareça dar. O card de custos mostra a saída mais barata, que pode ser um meio período só nos dias que faltam." : "") + "</p>";
    $("#explicaTxt").innerHTML = "<ul>" + li.join("") + "</ul>" + conta +
      "<p><b>Folgas.</b> Cada pessoa tem 2 folgas por semana e pelo menos 11 h de descanso entre um dia e outro. Quem folga no fim de semana alterna entre as semanas A e B, para ninguém trabalhar todo sábado e domingo.</p>" + baseLegal();
  }

  function renderGradePessoa(calc) {
    var v = state.versao, sem = state.semana, R = VERSOES[v];
    var h = '<thead><tr><th class="p cap">Equipe</th>';
    h += thDias();
    h += '<th class="h cap">Horas</th></tr></thead><tbody>';
    state.equipe.forEach(function (p, i) {
      var pc = calc.pessoas[i];
      var tags = [];
      if (p.folgaFixa) tags.push("folga fixa " + NOME_DIA_CURTO[p.folgaFixa].toLowerCase());
      if (p.naoPode && p.naoPode.length) tags.push("não pode " + p.naoPode.map(function (d) { return NOME_DIA_CURTO[d].toLowerCase(); }).join(", "));
      h += '<tr><td class="p"><button type="button" class="who" data-pessoa="' + p.id + '" title="Editar ' + esc(pc.nome) + '"><span class="ini">' + esc(iniciais(pc.nome)) + "</span><span><b>" + esc(pc.nome) + "</b><small>" + esc(p.funcao || "sem função") + "</small>" +
        (tags.length ? '<span class="tags">' + esc(tags.join(" · ")) + "</span>" : "") + "</span></button></td>";
      DIAS.forEach(function (d) {
        var c = celula(state, v, sem, p.id, d), err = pc.erros[d] ? " erro" : "", hj = d === HOJE ? ' class="hoje"' : "";
        var attr = ' data-p="' + p.id + '" data-d="' + d + '"';
        if (c.tipo === "fechado") h += "<td" + hj + '><span class="cell fechado">fechado</span></td>';
        else if (c.tipo === "turno") h += "<td" + hj + '><button type="button" class="cell turno' + err + '"' + attr + ' title="' + esc((c.rotulo || "Turno") + " · " + horas(dur(c))) + '"><b>' + falada(min(c.inicio)) + "–" + falada(min(c.fim)) + "</b><small>" + horas(dur(c)) + (c.rotulo ? " · " + esc(ROTULO_CURTO[c.rotulo.toLowerCase()] || c.rotulo.toLowerCase()) : "") + "</small></button></td>";
        else if (c.tipo === "folga") h += "<td" + hj + '><button type="button" class="cell folga' + err + '"' + attr + "><b>Folga</b></button></td>";
        else h += "<td" + hj + '><button type="button" class="cell livre' + err + '"' + attr + "><b>Reserva</b><small>sem turno</small></button></td>";
      });
      var pct = Math.min(100, Math.round(pc.horas / R.jornadaSemanal * 100));
      h += '<td class="h' + (pc.horas > R.jornadaSemanal + 1e-9 ? " over" : "") + '"><b>' + horas(pc.horas) + '</b><span class="hbar" title="' + horas(pc.horas) + " de " + horas(R.jornadaSemanal) + '"><i style="width:' + pct + '%"></i></span></td></tr>';
    });
    h += "</tbody>" + tfootCobertura(calc);
    $("#grid").innerHTML = h;
  }

  function renderCustos(cus) {
    $("#cSal").value = state.custos.salario;
    $("#cEnc").value = state.custos.encargos;
    $("#cHe").value = state.custos.he;
    var nParc = state.equipe.filter(function (p) { return parcial(p, state.versao); }).length;
    var h = '<div class="op base"><b>Folha atual da equipe</b><span class="v">' + brl(cus.folha) + '/mês</span><p>' + state.equipe.length + " pessoas × salário × " + String(state.custos.encargos).replace(".", ",") + " de encargos" +
      (nParc ? " (" + (nParc === 1 ? "1 em meio período" : nParc + " em meio período") + ", com salário proporcional às horas)" : "") + ".</p></div>";
    var pl = state.plano;
    if (!cus.ops.length) h += '<div class="op best"><b>Nenhum custo extra<span class="tag">tudo coberto</span></b><span class="v">R$ 0</span><p>A equipe atual cobre todo o horário nesta versão.' + (cus.extraGrade ? " Atenção: há " + horas(cus.extraGrade) + " de hora extra na grade." : "") + "</p></div>";
    if (pl && pl.economia) h += '<div class="op economia"><b>Economia com o plano do painel<span class="tag">' + esc(pl.data) + '</span></b><span class="v">' + brl(pl.economia) + "/mês</span><p>" + esc(pl.txt) + " Cobrir o mesmo horário só com gente em tempo integral pediria " + pl.baseN + (pl.baseN === 1 ? " pessoa" : " pessoas") + " (" + brl(pl.base) + "/mês). São " + brl(pl.economia * 12) + " por ano.</p></div>";
    cus.ops.forEach(function (o) {
      h += '<div class="op' + (o.best ? " best" : "") + (o.viavel ? "" : " inv") + '"><b>' + esc(o.titulo) +
        (o.best ? '<span class="tag">mais barata</span>' : "") + (!o.viavel ? '<span class="tag">não resolve</span>' : "") +
        '</b><span class="v">' + (o.semFolha && !o.custo ? "R$ 0" : brl(o.custo)) + "/mês</span><p>" + esc(o.txt) + "</p>" +
        (o.economia ? '<p class="eco">Economia de <b>' + brl(o.economia.valor) + "/mês</b> (" + brl(o.economia.valor * 12) + "/ano) em relação a contratar só em tempo integral: " + o.economia.n + (o.economia.n === 1 ? " pessoa" : " pessoas") + ", " + brl(o.economia.base) + "/mês, para cobrir o mesmo horário.</p>" : "") +
        (o.acao ? '<button type="button" class="b ghost sm acao" data-acao="' + o.id + '">' + esc(o.acao) + "</button>" : "") + "</div>";
    });
    $("#opcoes").innerHTML = h;
    var R = VERSOES[state.versao], C = state.custos, enc = Number(C.encargos) || 1, sal = Number(C.salario) || 0, adic = (Number(C.he) || 50) / 100;
    var calc = [
      "<b>Custo de um funcionário:</b> salário de " + brl(sal) + " × " + String(enc).replace(".", ",") + " = " + brl(sal * enc) + " por mês. O multiplicador junta encargos, férias, 13º e FGTS.",
      "<b>Valor da hora:</b> " + brl(sal) + " ÷ " + (R.jornadaSemanal * 5) + " h por mês (" + R.rotulo + " × 5 semanas) = " + brl2(cus.valorHora) + ".",
      "<b>Hora extra:</b> " + brl2(cus.valorHora) + " + " + Math.round(adic * 100) + "% = " + brl2(cus.valorHora * (1 + adic)) + " por hora, no máximo 2 h por pessoa por dia.",
      "<b>Horas sem cobertura por mês:</b> " + horas(cus.D) + " por semana × " + String(SEM_POR_MES).replace(".", ",") + " semanas = " + horas(cus.D * SEM_POR_MES) + "."
    ];
    if (cus.extraGrade > 0.01) calc.push("<b>Hora extra já na grade:</b> " + horas(cus.extraGrade) + " por semana, somada em todas as opções.");
    calc.push("<b>Contratar:</b> tempo integral para cada " + R.rotulo + " que falta; o resto (até 30 h) vira contrato parcial com salário proporcional.");
    $("#custoCalc").innerHTML = calc.map(function (x) { return "<li>" + x + "</li>"; }).join("");
  }

  // Troca as citações "(CLT, art. 66)" do texto (já escapado) por links para a lei no Planalto.
  function citar(html) {
    Object.keys(LEIS).forEach(function (k) {
      var L = LEIS[k];
      html = html.split("(" + esc(L.ref) + ")").join('(<a class="lei" href="' + FONTE[L.fonte] + '" target="_blank" rel="noopener" title="' + esc(L.regra) + '">' + esc(L.ref) + "</a>)");
    });
    return html;
  }

  function baseLegal() {
    return '<p><b>Base legal.</b> Cada alerta da escala cita a regra de onde vem:</p><ul class="leis">' +
      ["jornada", "he", "interjornada", "dsr", "intervalo", "domingo", "revezamento"].map(function (k) {
        var L = LEIS[k];
        return '<li><a class="lei" href="' + FONTE[L.fonte] + '" target="_blank" rel="noopener">' + esc(L.ref) + "</a>: " + esc(L.regra) + "</li>";
      }).join("") +
      '</ul><p class="nota">Texto conferido na compilação do Planalto. A convenção coletiva da sua categoria pode ter regras próprias (piso, adicional maior, folga no domingo); na dúvida, confirme com seu contador. Veja também as <a href="' + FONTE.ec141 + '" target="_blank" rel="noopener">regras de transição da EC 141/2026</a>.</p>';
  }

  function renderAlertas(calc, cus) {
    var li = [];
    calc.erros.forEach(function (e) { li.push('<li class="erro">' + esc(e) + "</li>"); });
    if (!calc.erros.length) li.push('<li class="ok">Jornada, folgas e descanso de 11 h entre um dia e outro estão dentro da lei nesta semana.</li>');
    DIAS.forEach(function (d) {
      var dia = calc.dias[d];
      if (dia.aberto && dia.falta) li.push("<li>" + NOME_DIA[d] + ": " + esc(textoFaixa(dia.faixas)) + " (" + horas(dia.falta) + ").</li>");
    });
    calc.avisos.forEach(function (a) { li.push("<li>" + esc(a) + "</li>"); });
    // Domingo: no comércio, o descanso precisa cair no domingo ao menos 1 vez a cada 3 semanas.
    if (state.funcionamento.dom) {
      var semDomingo = state.equipe.filter(function (p) {
        return SEMANAS.every(function (s) { return celula(state, state.versao, s, p.id, "dom").tipo === "turno"; });
      }).map(function (p) { return p.nome; });
      if (semDomingo.length) li.push("<li>" + esc(semDomingo.join(", ")) + (semDomingo.length === 1 ? " trabalha" : " trabalham") + " no domingo nas semanas A e B. No comércio, a folga precisa cair no domingo pelo menos 1 vez a cada 3 semanas" + esc(lei("domingo")) + ": ajuste numa das semanas.</li>");
    }
    if (calc.sobra > 0.01) li.push("<li>Há " + horas(calc.sobra) + " por semana com gente a mais que o necessário: serve de reserva para faltas, férias e atestados.</li>");
    $("#alertas").innerHTML = citar(li.join(""));
  }

  /* ------------------------------------------------------------------ */
  /* Configuração (horário e equipe)                                    */
  /* ------------------------------------------------------------------ */

  function chipsDias(marcados, chave) {
    return '<div class="dias-chk">' + DIAS.map(function (d) {
      return '<label title="' + NOME_DIA[d] + '"><input type="checkbox" data-' + chave + '="' + d + '"' + ((marcados || []).indexOf(d) >= 0 ? " checked" : "") + "><span>" + NOME_DIA_CURTO[d] + "</span></label>";
    }).join("") + "</div>";
  }

  function renderCfg() {
    $("#fNome").value = state.negocio.nome || "";
    $("#fTipo").value = state.negocio.tipo || "";
    var h = "<thead><tr><th>Dia</th><th>Abre?</th><th>Abre</th><th>Fecha</th><th>Pessoas ao mesmo tempo</th></tr></thead><tbody>";
    DIAS.forEach(function (d) {
      var f = state.funcionamento[d];
      h += "<tr><td><b>" + NOME_DIA[d] + '</b></td><td><label class="chk"><input type="checkbox" data-h="aberto" data-d="' + d + '"' + (f ? " checked" : "") + "> aberto</label></td>" +
        '<td><input type="time" step="60" data-h="abre" data-d="' + d + '" value="' + (f ? f.abre : "08:00") + '"' + (f ? "" : " disabled") + "></td>" +
        '<td><input type="time" step="60" data-h="fecha" data-d="' + d + '" value="' + (f ? f.fecha : "18:00") + '"' + (f ? "" : " disabled") + "></td>" +
        '<td><input type="number" min="1" max="50" data-h="pessoas" data-d="' + d + '" value="' + (f ? f.pessoas : 1) + '"' + (f ? "" : " disabled") + "></td></tr>";
    });
    $("#tblHorario").innerHTML = h + "</tbody>";

    var e = "<thead><tr><th>Nome</th><th>Função</th><th>Salário (opcional)</th><th>Horas/semana</th><th>Folga fixa</th><th>Não pode trabalhar</th><th></th></tr></thead><tbody>";
    state.equipe.forEach(function (p) {
      e += '<tr data-id="' + p.id + '"><td><input type="text" maxlength="40" data-e="nome" value="' + esc(p.nome) + '"></td>' +
        '<td><input type="text" maxlength="40" data-e="funcao" value="' + esc(p.funcao) + '"></td>' +
        '<td><input type="number" min="0" step="10" data-e="salario" placeholder="média" value="' + (p.salario || "") + '"></td>' +
        '<td><input type="number" min="0" max="60" step="1" data-e="horas" placeholder="integral" value="' + (p.horas || "") + '"></td>' +
        '<td><select data-e="folgaFixa"><option value="">rodízio</option>' + DIAS.map(function (d) { return '<option value="' + d + '"' + (p.folgaFixa === d ? " selected" : "") + ">" + NOME_DIA[d] + "</option>"; }).join("") + "</select></td>" +
        '<td>' + chipsDias(p.naoPode, "np") + "</td>" +
        '<td><button type="button" class="x" data-del="' + p.id + '" title="Remover">×</button></td></tr>';
    });
    $("#tblEquipe").innerHTML = e + "</tbody>";
  }

  /* ------------------------------------------------------------------ */
  /* Edição de uma célula                                               */
  /* ------------------------------------------------------------------ */

  var editando = null;

  function abrirCelula(id, d) {
    var p = state.equipe.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var c = celula(state, state.versao, state.semana, id, d);
    var R = VERSOES[state.versao];
    var f = state.funcionamento[d];
    editando = { id: id, d: d };
    $("#dlgTitulo").textContent = p.nome + " · " + NOME_DIA[d];
    document.querySelectorAll('#dlgForm input[name=tipo]').forEach(function (r) { r.checked = r.value === c.tipo; });
    var turnos = montarDias(state.funcionamento, { jornadaDiariaMax: R.jornadaDiariaMax })[d].turnos || [];
    $("#dlgPresets").innerHTML = turnos.map(function (t) {
      return '<button type="button" data-ini="' + hhmm(t.inicio) + '" data-fim="' + hhmm(t.fim) + '" data-rot="' + esc(t.rotulo) + '">' + esc(t.rotulo) + " " + falada(t.inicio) + "–" + falada(t.fim) + "</button>";
    }).join("");
    var padrao = turnos[0] || { inicio: min(f.abre), fim: min(f.abre) + R.jornadaDiariaMax * 60 };
    $("#dlgIni").value = c.tipo === "turno" ? c.inicio : hhmm(padrao.inicio);
    $("#dlgFim").value = c.tipo === "turno" ? c.fim : hhmm(padrao.fim);
    $("#dlgIni").dataset.rot = c.rotulo || "";
    atualizaDlg();
    $("#dlg").showModal();
  }

  function atualizaDlg() {
    var tipo = (document.querySelector("#dlgForm input[name=tipo]:checked") || {}).value;
    $("#dlgTurno").style.display = tipo === "turno" ? "" : "none";
    var c = { inicio: $("#dlgIni").value, fim: $("#dlgFim").value };
    var R = VERSOES[state.versao];
    var d = dur(c);
    $("#dlgDur").textContent = horas(d) + (d > R.jornadaDiariaMax + 2 + 1e-9 ? " · acima do limite de " + horas(R.jornadaDiariaMax + 2) + " por dia" : d > R.jornadaDiariaMax + 1e-9 ? " · " + horas(d - R.jornadaDiariaMax) + " de hora extra" : "") + (d > 6 ? " · inclui 1 h de intervalo a combinar" : "");
  }

  function salvarCelula() {
    if (!editando) return;
    var snap = JSON.stringify(state), antes = metricas(state);
    var pe = state.equipe.filter(function (x) { return x.id === editando.id; })[0];
    var rot = (pe ? pe.nome : "Pessoa") + " · " + NOME_DIA[editando.d].toLowerCase();
    var tipo = (document.querySelector("#dlgForm input[name=tipo]:checked") || {}).value || "livre";
    var g = state.escalas[state.versao][state.semana];
    g[editando.id] = g[editando.id] || {};
    if (tipo === "turno") {
      var ini = $("#dlgIni").value, fim = $("#dlgFim").value;
      if (!ini || !fim || ini === fim) { toast("Informe a hora de entrada e de saída."); return false; }
      g[editando.id][editando.d] = { tipo: "turno", inicio: ini, fim: fim, rotulo: $("#dlgIni").dataset.rot || "" };
    } else g[editando.id][editando.d] = { tipo: tipo };
    editando = null;
    salvar(); render();
    verificarPiora(snap, antes, "Mudei " + rot);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Exportação                                                         */
  /* ------------------------------------------------------------------ */

  function textoCelula(c) {
    if (c.tipo === "turno") return c.inicio + " às " + c.fim;
    return { folga: "Folga", livre: "Reserva", fechado: "Fechado" }[c.tipo] || "";
  }

  function carregarXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (ok, erro) {
      var s = document.createElement("script");
      s.src = XLSX_URL; s.onload = function () { ok(window.XLSX); }; s.onerror = erro;
      document.head.appendChild(s);
    });
  }

  function baixarPlanilha() {
    toast("Gerando a planilha…");
    carregarXlsx().then(function (X) {
      var wb = X.utils.book_new();
      Object.keys(VERSOES).forEach(function (v) {
        SEMANAS.forEach(function (sem) {
          var calc = calcular(state, v, sem);
          var linhas = [["Escala 5x2 · " + (state.negocio.nome || "") + " · " + VERSOES[v].rotulo + " (" + VERSOES[v].quando + ") · semana " + sem], []];
          linhas.push(["Pessoa", "Função"].concat(DIAS.map(function (d) { return NOME_DIA[d]; })).concat(["Horas na semana"]));
          state.equipe.forEach(function (p, i) {
            linhas.push([calc.pessoas[i].nome, p.funcao || ""].concat(DIAS.map(function (d) { return textoCelula(celula(state, v, sem, p.id, d)); })).concat([Math.round(calc.pessoas[i].horas * 10) / 10]));
          });
          linhas.push([]);
          linhas.push(["Horário", ""].concat(DIAS.map(function (d) { var f = state.funcionamento[d]; return f ? f.abre + " às " + f.fecha : "Fechado"; })));
          linhas.push(["Pessoas necessárias", ""].concat(DIAS.map(function (d) { var f = state.funcionamento[d]; return f ? Number(f.pessoas) : 0; })));
          linhas.push(["Pessoas trabalhando", ""].concat(DIAS.map(function (d) { return calc.trabalhandoNoDia[d] || 0; })));
          linhas.push(["Horas descobertas", ""].concat(DIAS.map(function (d) { return calc.dias[d].aberto ? calc.dias[d].falta : 0; })).concat([calc.falta]));
          linhas.push(["Onde falta gente", ""].concat(DIAS.map(function (d) { return calc.dias[d].aberto && calc.dias[d].falta ? textoFaixa(calc.dias[d].faixas) : ""; })));
          var ws = X.utils.aoa_to_sheet(linhas);
          ws["!cols"] = [{ wch: 18 }, { wch: 14 }].concat(DIAS.map(function () { return { wch: 16 }; })).concat([{ wch: 16 }]);
          X.utils.book_append_sheet(wb, ws, VERSOES[v].rotulo.replace(" ", "") + " semana " + sem);
        });
      });

      var lc = [["Custos mensais estimados · " + (state.negocio.nome || "")], [],
        ["Salário médio", Number(state.custos.salario)], ["Custo total do funcionário (× salário)", Number(state.custos.encargos)], ["Adicional de hora extra (%)", Number(state.custos.he)], []];
      Object.keys(VERSOES).forEach(function (v) {
        var calc = calcular(state, v, "A"), cus = custos(state, v, calc);
        lc.push(["Versão " + VERSOES[v].rotulo + " (" + VERSOES[v].quando + "), semana A"]);
        lc.push(["Folha atual da equipe", Math.round(cus.folha)]);
        lc.push(["Horas descobertas por semana", calc.falta]);
        lc.push(["Valor da hora normal", Math.round(cus.valorHora * 100) / 100]);
        if (!cus.ops.length) lc.push(["Custo extra", 0, "tudo coberto"]);
        cus.ops.forEach(function (o) { lc.push([o.titulo + (o.best ? " (mais barata)" : "") + (o.viavel ? "" : " (não resolve)"), Math.round(o.custo), o.txt]); });
        lc.push([]);
      });
      lc.push(["Valores mensais com 4,33 semanas por mês. Exemplo de cálculo; confirme com o seu contador."]);
      var wc = X.utils.aoa_to_sheet(lc);
      wc["!cols"] = [{ wch: 44 }, { wch: 14 }, { wch: 90 }];
      X.utils.book_append_sheet(wb, wc, "Custos");

      X.writeFile(wb, "escala-5x2-" + slug(state.negocio.nome) + ".xlsx");
      toast("Planilha baixada.");
    }).catch(function () { toast("Não foi possível gerar a planilha agora. Tente de novo."); });
  }

  /* ------------------------------------------------------------------ */
  /* Eventos                                                            */
  /* ------------------------------------------------------------------ */

  function ligar() {
    document.querySelectorAll("[data-v]").forEach(function (b) { b.addEventListener("click", function () { state.versao = b.dataset.v; salvar(); render(); }); });
    document.querySelectorAll("[data-s]").forEach(function (b) { b.addEventListener("click", function () { state.semana = b.dataset.s; salvar(); render(); }); });

    $("#grid").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-p][data-d]"); if (b) return abrirCelula(b.dataset.p, b.dataset.d);
      var w = e.target.closest("[data-pessoa]"); if (w) return abrirPessoa(w.dataset.pessoa);
      var dd = e.target.closest("[data-dia]"); if (dd) return abrirDia(dd.dataset.dia);
    });
    $("#dlgForm").addEventListener("change", atualizaDlg);
    $("#dlgForm").addEventListener("input", function (e) { if (e.target.type === "time") $("#dlgIni").dataset.rot = ""; atualizaDlg(); });
    $("#dlgPresets").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $("#dlgIni").value = b.dataset.ini; $("#dlgFim").value = b.dataset.fim; $("#dlgIni").dataset.rot = b.dataset.rot;
      document.querySelector('#dlgForm input[value=turno]').checked = true;
      atualizaDlg();
    });
    $("#dlgForm").addEventListener("submit", function (e) {
      if (e.submitter && e.submitter.value === "ok" && salvarCelula() === false) e.preventDefault();
    });

    ["cSal", "cEnc", "cHe"].forEach(function (id) {
      $("#" + id).addEventListener("change", function () {
        var k = { cSal: "salario", cEnc: "encargos", cHe: "he" }[id];
        var val = Number($("#" + id).value);
        if (!(val > 0)) return render();
        state.custos[k] = val; salvar(); render();
      });
    });
    $("#opcoes").addEventListener("click", function (e) {
      var b = e.target.closest("[data-acao]"); if (!b) return;
      aplicarPlano();
    });

    $("#fNome").addEventListener("change", function () { state.negocio.nome = $("#fNome").value.trim(); salvar(); render(); });
    $("#fTipo").addEventListener("change", function () { state.negocio.tipo = $("#fTipo").value.trim(); salvar(); });
    $("#tblHorario").addEventListener("change", function (e) {
      var el = e.target, d = el.dataset.d; if (!d) return;
      if (el.dataset.h === "aberto") {
        var tr = el.closest("tr");
        state.funcionamento[d] = el.checked ? { abre: tr.querySelector('[data-h=abre]').value || "08:00", fecha: tr.querySelector('[data-h=fecha]').value || "18:00", pessoas: Number(tr.querySelector('[data-h=pessoas]').value) || 1 } : null;
        renderCfg();
      } else if (state.funcionamento[d]) {
        state.funcionamento[d][el.dataset.h] = el.dataset.h === "pessoas" ? Math.max(1, Number(el.value) || 1) : el.value;
      }
      marcarPendente(); salvar(); render();
    });
    $("#tblEquipe").addEventListener("change", function (e) {
      var tr = e.target.closest("tr[data-id]"); if (!tr) return;
      var p = state.equipe.filter(function (x) { return x.id === tr.dataset.id; })[0]; if (!p) return;
      if (e.target.dataset.np) {
        p.naoPode = Array.prototype.map.call(tr.querySelectorAll("[data-np]:checked"), function (x) { return x.dataset.np; });
        marcarPendente(); salvar(); render(); return;
      }
      var k = e.target.dataset.e;
      p[k] = k === "salario" ? (Number(e.target.value) || null) : k === "horas" ? (Number(e.target.value) > 0 ? Math.min(60, Math.round(Number(e.target.value))) : null) : e.target.value.trim();
      if (k === "folgaFixa" || k === "horas") marcarPendente();
      salvar(); render();
    });
    $("#tblEquipe").addEventListener("click", function (e) {
      var b = e.target.closest("[data-del]"); if (!b) return;
      if (state.equipe.length <= 1) return toast("A escala precisa de pelo menos 1 pessoa.");
      state.equipe = state.equipe.filter(function (p) { return p.id !== b.dataset.del; });
      salvar(); renderCfg(); render();
    });
    $("#btnAddPessoa").addEventListener("click", function () {
      var p = { id: uid(), nome: "Pessoa " + (state.equipe.length + 1), funcao: "", salario: null, folgaFixa: "", naoPode: [] };
      state.equipe.push(p);
      marcarPendente(); salvar(); renderCfg(); render();
    });

    // Montar de novo apaga mudanças feitas à mão: pede um segundo clique para confirmar.
    function montarDeNovo(b, texto) {
      if (!b.dataset.conf) {
        b.dataset.conf = "1"; b.textContent = "Clique de novo para confirmar"; b.classList.add("danger");
        setTimeout(function () { delete b.dataset.conf; b.textContent = texto; b.classList.remove("danger"); }, 4000);
        return;
      }
      delete b.dataset.conf; b.textContent = texto; b.classList.remove("danger");
      state.pendente = false;
      gerarTudo(state); salvar(); render();
      $("#regenAviso").textContent = "Refaz as escalas de 42 h e 40 h. As mudanças feitas à mão na grade se perdem.";
      toast("Escalas de 42 h e 40 h montadas de novo.");
    }
    $("#btnRegen").addEventListener("click", function () { montarDeNovo(this, "Montar a escala de novo com estes dados"); if (!this.dataset.conf) window.scrollTo({ top: 0, behavior: "smooth" }); });
    $("#btnRegen2").addEventListener("click", function () { montarDeNovo(this, "Montar a escala de novo"); });

    function pdf() { fecharMenu(); toast("Na janela de impressão, escolha “Salvar como PDF”."); setTimeout(function () { window.print(); }, 400); }
    $("#btnPdf").addEventListener("click", pdf);
    $("#btnXlsx").addEventListener("click", baixarPlanilha);

    // Menu lateral (gaveta no celular)
    function fecharMenu() { $("#side").classList.remove("open"); $("#backdrop").classList.remove("on"); }
    $("#menuBtn").addEventListener("click", function () { $("#side").classList.add("open"); $("#backdrop").classList.add("on"); });
    $("#sideClose").addEventListener("click", fecharMenu);
    $("#backdrop").addEventListener("click", fecharMenu);
    document.querySelectorAll(".side-nav a, .side-nav [data-v]").forEach(function (a) { a.addEventListener("click", fecharMenu); });
    $("#navCfg").addEventListener("click", function () { $("#cfg").open = true; });
    ligarPerfil();
    ligarEdicao();
  }

  function sair() {
    fetch(PAINEL.sair, { method: "POST", credentials: "same-origin" }).finally(function () { location.href = PAINEL.login; });
  }

  function copiarLink() {
    var url = linkPessoal();
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Link copiado. Guarde: ele abre a sua escala em qualquer aparelho."); }, function () { toast("Copie o endereço da barra do navegador."); });
    else toast("Copie o endereço da barra do navegador.");
  }

  /* ------------------------------------------------------------------ */
  /* Perfil e tema                                                      */
  /* ------------------------------------------------------------------ */

  function temaAtual() {
    try { var t = localStorage.getItem("j40h:tema"); return t === "light" || t === "dark" ? t : "system"; } catch (e) { return "system"; }
  }

  function aplicarTema(t) {
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    try { if (t === "system") localStorage.removeItem("j40h:tema"); else localStorage.setItem("j40h:tema", t); } catch (e) {}
    document.querySelectorAll("#temas [data-tema]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.tema === t ? "true" : "false"); });
  }

  function ligarPerfil() {
    var menu = $("#perfilMenu"), btn = $("#perfilBtn");
    function abrir(sim) { menu.hidden = !sim; btn.setAttribute("aria-expanded", sim ? "true" : "false"); }
    btn.addEventListener("click", function (e) { e.stopPropagation(); abrir(menu.hidden); });
    document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".perfil")) abrir(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { abrir(false); btn.focus(); } });
    $("#temas").addEventListener("click", function (e) { var b = e.target.closest("[data-tema]"); if (b) aplicarTema(b.dataset.tema); });
    aplicarTema(temaAtual());
    // PDF sempre no tema claro.
    var antes = null;
    window.addEventListener("beforeprint", function () { antes = document.documentElement.dataset.theme || null; document.documentElement.dataset.theme = "light"; });
    window.addEventListener("afterprint", function () { if (antes) document.documentElement.dataset.theme = antes; else delete document.documentElement.dataset.theme; });

    if (PAINEL) {
      $("#pmNome").textContent = PAINEL.usuario.nome || "Minha conta";
      $("#pmEmail").textContent = PAINEL.usuario.email;
      btn.textContent = iniciais(PAINEL.usuario.nome || PAINEL.usuario.email);
      $("#pmLink").hidden = true;
      $("#pmSair").hidden = false;
      $("#pmSair").addEventListener("click", sair);
      $("#btnLink").innerHTML = '<svg class="ic"><use href="#i-logout"/></svg>Sair da conta';
      $("#btnLink").addEventListener("click", sair);
    } else {
      $("#pmEmail").textContent = "Escala salva neste aparelho";
      $("#pmLink").addEventListener("click", function () { abrir(false); copiarLink(); });
      $("#btnLink").addEventListener("click", copiarLink);
    }
  }

  function atualizarPerfil() {
    if (PAINEL) return;
    $("#pmNome").textContent = state.negocio.nome || "Minha escala";
    $("#perfilBtn").textContent = iniciais(state.negocio.nome || "Jornada");
  }

  /* ------------------------------------------------------------------ */
  /* Editar pessoa e dia pela grade                                     */
  /* ------------------------------------------------------------------ */

  var pessoaEd = null, diaEd = null;

  function abrirPessoa(id) {
    var p = id ? state.equipe.filter(function (x) { return x.id === id; })[0] : null;
    pessoaEd = p ? p.id : null;
    $("#dlgPTitulo").textContent = p ? "Editar " + (p.nome || "pessoa") : "Adicionar pessoa";
    $("#pNome").value = p ? p.nome : "Pessoa " + (state.equipe.length + 1);
    $("#pFuncao").value = p ? p.funcao : "";
    $("#pSal").value = p && p.salario ? p.salario : "";
    $("#pHoras").value = p && p.horas ? p.horas : "";
    $("#pFixa").innerHTML = '<option value="">rodízio</option>' + DIAS.map(function (d) { return '<option value="' + d + '"' + (p && p.folgaFixa === d ? " selected" : "") + ">" + NOME_DIA[d] + "</option>"; }).join("");
    $("#pNaoPode").innerHTML = chipsDias(p ? p.naoPode : [], "pnp").replace(/^<div class="dias-chk">|<\/div>$/g, "");
    $("#pRemover").hidden = !p;
    $("#pRemover").classList.remove("confirma"); $("#pRemover").textContent = "Remover da equipe";
    $("#dlgP").showModal();
  }

  function salvarPessoa() {
    var nome = $("#pNome").value.trim();
    if (!nome) { toast("Escreva o nome da pessoa."); $("#pNome").focus(); return false; }
    var snap = JSON.stringify(state), antes = metricas(state);
    var naoPode = Array.prototype.map.call(document.querySelectorAll("#pNaoPode [data-pnp]:checked"), function (x) { return x.dataset.pnp; });
    var fixa = $("#pFixa").value;
    var p = pessoaEd ? state.equipe.filter(function (x) { return x.id === pessoaEd; })[0] : null;
    if (!p) {
      p = { id: uid(), nome: nome, funcao: "", salario: null, folgaFixa: "", naoPode: [] };
      state.equipe.push(p);
      marcarPendente();
    } else if (p.folgaFixa !== fixa || p.naoPode.join() !== naoPode.join()) marcarPendente();
    p.nome = nome;
    p.funcao = $("#pFuncao").value.trim();
    p.salario = Number($("#pSal").value) || null;
    var hs = Number($("#pHoras").value) > 0 ? Math.min(60, Math.round(Number($("#pHoras").value))) : null;
    if (hs !== (p.horas || null)) { p.horas = hs; marcarPendente(); }
    p.folgaFixa = fixa;
    p.naoPode = naoPode;
    salvar(); renderCfg(); render();
    verificarPiora(snap, antes, "Editei " + nome);
  }

  function abrirDia(d) {
    diaEd = d;
    var f = state.funcionamento[d];
    $("#dlgDTitulo").textContent = "Horário de " + NOME_DIA[d].toLowerCase();
    $("#dAberto").checked = !!f;
    $("#dAbre").value = f ? f.abre : "08:00";
    $("#dFecha").value = f ? f.fecha : "18:00";
    $("#dPessoas").value = f ? f.pessoas : 1;
    $("#dCampos").style.display = f ? "" : "none";
    $("#dlgD").showModal();
  }

  function salvarDia() {
    var snap = JSON.stringify(state), m0 = metricas(state);
    var antes = JSON.stringify(state.funcionamento[diaEd] || null);
    if (!$("#dAberto").checked) state.funcionamento[diaEd] = null;
    else {
      if (!$("#dAbre").value || !$("#dFecha").value) { toast("Preencha a hora de abrir e de fechar."); return false; }
      state.funcionamento[diaEd] = { abre: $("#dAbre").value, fecha: $("#dFecha").value, pessoas: Math.max(1, Math.min(50, Number($("#dPessoas").value) || 1)) };
    }
    if (JSON.stringify(state.funcionamento[diaEd]) !== antes) marcarPendente();
    salvar(); renderCfg(); render();
    verificarPiora(snap, m0, "Mudei o horário de " + NOME_DIA[diaEd].toLowerCase());
  }

  /* ------------------------------------------------------------------ */
  /* Métricas, desfazer e Ajuste com IA                                 */
  /* ------------------------------------------------------------------ */

  // Um clique: coloca na escala a saída mais barata de contratar (tempo integral + meio período nos
  // horários que faltam), remonta e mostra o antes e depois em horas e em reais, com Desfazer.
  function aplicarPlano() {
    var antes = metricas(state);
    var op = antes.cus.ops.filter(function (o) { return o.id === "contratar"; })[0];
    if (!op || !op.plano) return;
    var snap = JSON.stringify(state), P = op.plano, R = VERSOES[state.versao], novos = [];
    for (var i = 0; i < P.n; i++) novos.push("Contratação " + (i + 1));
    novos.forEach(function (nome) { state.equipe.push({ id: uid(), nome: nome, funcao: "a contratar", salario: null, horas: null, folgaFixa: "", naoPode: [] }); });
    if (P.h) state.equipe.push({ id: uid(), nome: "Meio período", funcao: "a contratar", salario: null, horas: P.h, folgaFixa: "", naoPode: [] });
    gerarTudo(state); state.pendente = false;
    var depois = metricas(state);
    var txt = (P.n ? P.n + (P.n === 1 ? " pessoa" : " pessoas") + " em tempo integral" + (P.h ? " e " : "") : "") + (P.h ? "1 em meio período de " + P.h + " h por semana" : "") +
      ", na versão de " + R.rotulo + ": folha de " + brl(antes.folha) + " para " + brl(depois.folha) + " por mês.";
    state.plano = op.economia ? { data: new Date().toLocaleDateString("pt-BR"), versao: state.versao, txt: txt, economia: Math.round(op.economia.valor), base: Math.round(op.economia.base), baseN: op.economia.n } : null;
    salvar(); renderCfg(); render();
    desfazerSnap = snap;
    dica("<b>Saída aplicada.</b> Horas sem cobertura: " + horas(antes.falta) + " → <b>" + horas(depois.falta) + "</b> por semana. Folha: " + brl(antes.folha) + " → <b>" + brl(depois.folha) + "/mês</b> (+" + brl(depois.folha - antes.folha) + ")." +
      (op.economia ? " Economia de <b>" + brl(op.economia.valor) + "/mês</b> em relação a contratar só em tempo integral." : "") +
      (depois.falta > 0.01 ? " Ainda faltam " + horas(depois.falta) + ": veja os alertas." : "") +
      " Troque os nomes quando contratar.",
      '<button type="button" class="b ghost sm" data-dica="desfazer">Desfazer</button>');
    try { $("#iaDica").scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
  }

  function metricas(s) {
    var c = calcular(s, s.versao, s.semana), k = custos(s, s.versao, c);
    var best = k.ops.filter(function (o) { return o.best; })[0];
    return { falta: c.falta, erros: c.erros.length, custo: best ? best.custo : 0, folha: k.folha, calc: c, cus: k };
  }

  function problemas(a, b) {
    var p = [];
    if (b.falta > a.falta + 0.01) p.push("mais " + horas(b.falta - a.falta) + " sem cobertura por semana");
    if (b.erros > a.erros) p.push((b.erros - a.erros) + (b.erros - a.erros === 1 ? " ponto novo fora da lei" : " pontos novos fora da lei"));
    if (b.custo > a.custo + 1) p.push("custo extra sobe " + brl(b.custo - a.custo) + "/mês");
    return p;
  }

  var desfazerSnap = null;
  function desfazer() {
    if (!desfazerSnap) return;
    state = normalizar(JSON.parse(desfazerSnap)); desfazerSnap = null;
    salvar(); renderCfg(); render();
    $("#iaDica").hidden = true;
    toast("Mudança desfeita.");
  }

  function dica(html, botoes) {
    $("#iaDica").innerHTML = '<div class="txt">' + html + '</div><div class="bts">' + botoes + '<button type="button" class="x" data-dica="fechar" title="Fechar">×</button></div>';
    $("#iaDica").hidden = false;
  }

  // Depois de uma edição à mão: se piorou cobertura, lei ou custo, avisa e oferece desfazer ou pedir à IA.
  function verificarPiora(snap, antes, rotulo) {
    var p = problemas(antes, metricas(state));
    if (!p.length) { $("#iaDica").hidden = true; return false; }
    desfazerSnap = snap;
    var pedido = rotulo + ". Isso causou: " + p.join("; ") + ". Mantendo essa mudança, como resolvo esses problemas?";
    dica("<b>Atenção:</b> essa mudança deixou " + esc(p.join(", ")) + ".",
      '<button type="button" class="b ghost sm" data-dica="desfazer">Desfazer</button>' +
      (PAINEL && PAINEL.ia ? '<button type="button" class="b ia sm" data-dica="ia" data-pedido="' + esc(pedido) + '"><svg class="ic"><use href="#i-spark"/></svg>Pedir sugestão à IA</button>' : ""));
    return true;
  }

  function contextoIA() {
    var R = VERSOES[state.versao], m = metricas(state), c = m.calc;
    return {
      versao: state.versao, semana: state.semana,
      regras: { jornadaSemanal: R.jornadaSemanal, jornadaDiariaMax: R.jornadaDiariaMax },
      negocio: state.negocio,
      funcionamento: DIAS.reduce(function (o, d) { var f = state.funcionamento[d]; o[d] = f ? { aberto: true, abre: f.abre, fecha: f.fecha, pessoas: Number(f.pessoas) || 1 } : { aberto: false, abre: "", fecha: "", pessoas: 0 }; return o; }, {}),
      equipe: state.equipe.map(function (p) { return { id: p.id, nome: p.nome, funcao: p.funcao, salario: p.salario || 0, horas: parcial(p, state.versao) ? Number(p.horas) : 0, folgaFixa: p.folgaFixa || "", naoPode: p.naoPode || [] }; }),
      custos: state.custos,
      grade: state.equipe.map(function (p, i) {
        return { pessoaId: p.id, nome: p.nome, horasSemana: c.pessoas[i].horas, dias: DIAS.reduce(function (o, d) {
          var x = celula(state, state.versao, state.semana, p.id, d);
          o[d] = x.tipo === "turno" ? x.inicio + "-" + x.fim : x.tipo === "livre" ? "reserva" : x.tipo; return o;
        }, {}) };
      }),
      metricas: {
        horasSemCobertura: c.falta,
        ondeFalta: DIAS.filter(function (d) { return c.dias[d].aberto && c.dias[d].falta; }).map(function (d) { return NOME_DIA[d] + ": " + textoFaixa(c.dias[d].faixas); }),
        pontosForaDaLei: c.erros, avisos: c.avisos,
        folhaMes: Math.round(m.folha),
        opcoesDeCusto: m.cus.ops.map(function (o) { return { titulo: o.titulo, custoMes: Math.round(o.custo), resolve: o.viavel, maisBarata: !!o.best, detalhe: o.txt }; })
      }
    };
  }

  var HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

  // Aplica a proposta numa cópia do estado (prévia). Nada é gravado até o cliente aceitar.
  function aplicarProposta(prop) {
    var s = JSON.parse(JSON.stringify(state));
    var antesEstr = JSON.stringify([s.funcionamento, s.equipe]);
    DIAS.forEach(function (d) {
      var f = prop.funcionamento && prop.funcionamento[d]; if (!f) return;
      s.funcionamento[d] = f.aberto && HORA_RE.test(f.abre) && HORA_RE.test(f.fecha) && f.abre !== f.fecha
        ? { abre: f.abre, fecha: f.fecha, pessoas: Math.max(1, Math.min(50, Math.round(Number(f.pessoas) || 1))) } : null;
    });
    if (Array.isArray(prop.equipe) && prop.equipe.length) {
      var usados = {};
      s.equipe = prop.equipe.slice(0, 60).map(function (p) {
        var antigo = state.equipe.filter(function (x) { return x.id === p.id && !usados[x.id]; })[0];
        if (antigo) usados[antigo.id] = 1;
        return {
          id: antigo ? antigo.id : uid(), nome: String(p.nome || "").trim().slice(0, 40) || "Pessoa", funcao: String(p.funcao || "").trim().slice(0, 40),
          salario: Number(p.salario) > 0 ? Number(p.salario) : null, horas: Number(p.horas) > 0 ? Math.min(60, Math.round(Number(p.horas))) : null,
          folgaFixa: DIAS.indexOf(p.folgaFixa) >= 0 ? p.folgaFixa : "",
          naoPode: (p.naoPode || []).filter(function (d) { return DIAS.indexOf(d) >= 0; })
        };
      });
    }
    if (prop.custos) ["salario", "encargos", "he"].forEach(function (k) { var v = Number(prop.custos[k]); if (v > 0) s.custos[k] = v; });
    if (prop.remontar) { gerarTudo(s); s.pendente = false; }
    else if (JSON.stringify([s.funcionamento, s.equipe]) !== antesEstr) s.pendente = true;
    (prop.celulas || []).forEach(function (c) {
      if (DIAS.indexOf(c.dia) < 0 || !s.equipe.some(function (p) { return p.id === c.pessoaId; })) return;
      var g = s.escalas[s.versao][s.semana]; g[c.pessoaId] = g[c.pessoaId] || {};
      if (c.tipo === "turno" && HORA_RE.test(c.inicio) && HORA_RE.test(c.fim) && c.inicio !== c.fim) g[c.pessoaId][c.dia] = { tipo: "turno", inicio: c.inicio, fim: c.fim, rotulo: "" };
      else if (c.tipo === "folga" || c.tipo === "livre") g[c.pessoaId][c.dia] = { tipo: c.tipo };
    });
    return s;
  }

  var ia = { pedido: "", resultado: null, previa: null, anterior: null };

  function iaPasso(qual) {
    $("#iaPasso1").hidden = qual !== 1;
    $("#iaCarregando").hidden = qual !== 2;
    $("#iaResultado").hidden = qual !== 3;
    var acts = { 1: '<button class="b ghost" value="cancel" type="submit">Cancelar</button><button class="b ia" type="button" data-ia="enviar"><svg class="ic"><use href="#i-spark"/></svg>Gerar proposta</button>', 2: "", 3: "" };
    if (qual === 3) {
      var r = ia.resultado;
      acts[3] = r && r.entendeu === false
        ? '<button class="b ghost" value="cancel" type="submit">Fechar</button><button class="b" type="button" data-ia="voltar">Escrever de novo</button>'
        : '<button class="b ghost" value="cancel" type="submit">Descartar</button><button class="b ghost" type="button" data-ia="voltar">Mudar o pedido</button>' +
          (ia.piorou ? '<button class="b ghost" type="button" data-ia="melhorar"><svg class="ic"><use href="#i-spark"/></svg>Pedir alternativa melhor</button>' : "") +
          '<button class="b" type="button" data-ia="aplicar">Aplicar proposta</button>';
    }
    $("#iaActs").innerHTML = acts[qual];
  }

  function abrirIA(pedido) {
    ia = { pedido: pedido || "", resultado: null, previa: null, anterior: null };
    $("#iaPedido").value = ia.pedido;
    var m = metricas(state), sug = [];
    if (m.falta > 0.01) sug.push("Cobrir os horários descobertos sem contratar ninguém");
    if (m.erros) sug.push("Corrigir os pontos fora da lei");
    sug.push("Reduzir o custo da escala");
    if (state.equipe[0]) sug.push((state.equipe[0].nome || "Ana") + " não pode trabalhar aos sábados");
    sug.push("Equilibrar quem folga no fim de semana");
    $("#iaChips").innerHTML = sug.map(function (x) { return '<button type="button" data-sug="' + esc(x) + '">' + esc(x) + "</button>"; }).join("");
    iaPasso(1);
    $("#dlgIA").showModal();
    setTimeout(function () { $("#iaPedido").focus(); }, 50);
  }

  function enviarIA() {
    var pedido = $("#iaPedido").value.trim();
    if (!pedido) { toast("Escreva o que você quer mudar."); return; }
    ia.pedido = pedido;
    iaPasso(2);
    fetch(PAINEL.ia, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pedido: pedido, contexto: contextoIA(), anterior: ia.anterior || undefined }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (x) {
        if (x.status === 401) { location.href = PAINEL.login; return; }
        if (!x.ok || !x.j.resultado) { toast(x.j.erro || "A IA não respondeu. Tente de novo."); iaPasso(1); return; }
        mostrarIA(x.j.resultado);
      })
      .catch(function () { toast("Sem conexão com a IA. Tente de novo."); iaPasso(1); });
  }

  function mostrarIA(r) {
    ia.resultado = r;
    var h = '<p class="ia-resumo">' + citar(esc(r.resumo || "")) + "</p>";
    if (r.entendeu === false) { $("#iaResultado").innerHTML = h; ia.piorou = false; iaPasso(3); return; }
    ia.previa = aplicarProposta(r.proposta || {});
    var a = metricas(state), b = metricas(ia.previa), auto = problemas(a, b);
    ia.piorou = auto.length > 0 || (r.avisos || []).length > 0;
    ia.problemas = auto;
    ia.depois = b;
    if ((r.mudancas || []).length) h += '<p class="rot">O que muda</p><ul class="ia-mud">' + r.mudancas.map(function (x) { return "<li>" + citar(esc(x)) + "</li>"; }).join("") + "</ul>";
    var linha = function (rot, va, vb, fmt, menorMelhor) {
      var cls = Math.abs(vb - va) < 0.01 ? "" : (vb < va) === menorMelhor ? " melhor" : " pior";
      return "<tr><td>" + rot + "</td><td>" + fmt(va) + '</td><td class="' + cls.trim() + '">' + fmt(vb) + "</td></tr>";
    };
    h += '<p class="rot">Antes e depois</p><table class="ia-comp"><thead><tr><th></th><th>Hoje</th><th>Com a proposta</th></tr></thead><tbody>' +
      linha("Horas sem cobertura/semana", a.falta, b.falta, horas, true) +
      linha("Pontos fora da lei", a.erros, b.erros, String, true) +
      linha("Custo extra para cobrir (mês)", a.custo, b.custo, brl, true) +
      linha("Folha da equipe (mês)", a.folha, b.folha, brl, true) + "</tbody></table>";
    var avisos = (r.avisos || []).concat(auto.length ? ["A proposta deixa " + auto.join(", ") + "."] : []);
    if (avisos.length) h += '<div class="ia-avisos"><b>Atenção</b><ul>' + avisos.map(function (x) { return "<li>" + citar(esc(x)) + "</li>"; }).join("") + "</ul></div>";
    if (ia.previa.pendente) h += '<p class="muted sm">A grade atual fica como está; depois de aplicar, use “Montar a escala de novo” para redistribuir os turnos.</p>';
    $("#iaResultado").innerHTML = h;
    iaPasso(3);
  }

  function ligarIA() {
    if (!PAINEL || !PAINEL.ia) return;
    $("#btnIA").hidden = false;
    $("#btnIA").addEventListener("click", function () { abrirIA(""); });
    $("#iaChips").addEventListener("click", function (e) { var b = e.target.closest("[data-sug]"); if (b) { $("#iaPedido").value = b.dataset.sug; $("#iaPedido").focus(); } });
    $("#iaPedido").addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviarIA(); });
    $("#iaActs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-ia]"); if (!b) return;
      var acao = b.dataset.ia;
      if (acao === "enviar") enviarIA();
      else if (acao === "voltar") { ia.anterior = null; iaPasso(1); }
      else if (acao === "melhorar") {
        ia.anterior = { proposta: ia.resultado.proposta, avisosDaIA: ia.resultado.avisos, problemasMedidos: ia.problemas,
          metricasComAProposta: { horasSemCobertura: ia.depois.falta, pontosForaDaLei: ia.depois.calc.erros, custoExtraMes: Math.round(ia.depois.custo), folhaMes: Math.round(ia.depois.folha) } };
        $("#iaPedido").value = ia.pedido;
        enviarIA();
      } else if (acao === "aplicar") {
        desfazerSnap = JSON.stringify(state);
        state = ia.previa;
        salvar(); renderCfg(); render();
        $("#dlgIA").close();
        dica("<b>Proposta da IA aplicada.</b> " + esc(ia.resultado.resumo || ""), '<button type="button" class="b ghost sm" data-dica="desfazer">Desfazer</button>');
      }
    });
  }

  function ligarEdicao() {
    $("#iaDica").addEventListener("click", function (e) {
      var b = e.target.closest("[data-dica]"); if (!b) return;
      if (b.dataset.dica === "desfazer") desfazer();
      else if (b.dataset.dica === "fechar") $("#iaDica").hidden = true;
      else if (b.dataset.dica === "ia") abrirIA(b.dataset.pedido);
    });
    $("#equipeStrip").addEventListener("click", function (e) {
      if (e.target.closest("#btnAddPessoa2")) return abrirPessoa(null);
      var w = e.target.closest("[data-pessoa]"); if (w) abrirPessoa(w.dataset.pessoa);
    });
    $("#vistas").addEventListener("click", function (e) {
      var b = e.target.closest("[data-vista]"); if (!b) return;
      vista = b.dataset.vista;
      try { localStorage.setItem("j40h:vista", vista); } catch (er) {}
      render();
    });
    ligarIA();
    ligarArrastar();
    $("#dlgPForm").addEventListener("submit", function (e) {
      if (e.submitter && e.submitter.value === "ok" && salvarPessoa() === false) e.preventDefault();
    });
    $("#pRemover").addEventListener("click", function () {
      var b = this;
      if (state.equipe.length <= 1) return toast("A escala precisa de pelo menos 1 pessoa.");
      if (!b.classList.contains("confirma")) { b.classList.add("confirma"); b.textContent = "Confirmar remoção"; return; }
      state.equipe = state.equipe.filter(function (p) { return p.id !== pessoaEd; });
      $("#dlgP").close();
      marcarPendente(); salvar(); renderCfg(); render();
      toast("Pessoa removida da equipe.");
    });
    $("#dAberto").addEventListener("change", function () { $("#dCampos").style.display = this.checked ? "" : "none"; });
    $("#dlgDForm").addEventListener("submit", function (e) {
      if (e.submitter && e.submitter.value === "ok" && salvarDia() === false) e.preventDefault();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Arrastar pessoas pelo quadro por turno                             */
  /* ------------------------------------------------------------------ */

  // Horário para quem cai num turno: o mais comum da linha naquele dia; senão o turno do motor que
  // cai nesse grupo; senão um turno do tamanho da jornada encostado na abertura ou no fechamento.
  function turnoDoGrupo(g, d, faixa) {
    if (faixa) { var t = faixa.split("-"); return { inicio: t[0], fim: t[1] }; }
    var f = state.funcionamento[d], R = VERSOES[state.versao], J = Math.round(R.jornadaDiariaMax * 60);
    var dia = montarDias(state.funcionamento, { jornadaDiariaMax: R.jornadaDiariaMax })[d];
    var achou = ((dia && dia.turnos) || []).filter(function (t) { return grupoDe({ tipo: "turno", inicio: hhmm(t.inicio), fim: hhmm(t.fim) }, f) === g; })[0];
    if (achou) return { inicio: hhmm(achou.inicio), fim: hhmm(achou.fim), rotulo: achou.rotulo };
    var a = min(f.abre), b = min(f.fecha); if (b <= a) b += 1440;
    var aberto = b - a, len = Math.min(J, aberto);
    if (g === "dia" && aberto <= J + 120) return { inicio: f.abre, fim: f.fecha };
    if (g === "fechamento") return { inicio: hhmm(b - len), fim: f.fecha };
    if (g === "meio") { var m = a + Math.round((aberto - len) / 2 / 30) * 30; return { inicio: hhmm(m), fim: hhmm(m + len) }; }
    return { inicio: f.abre, fim: hhmm(a + len) };
  }

  // Solta a pessoa id (que estava no dia "de") no grupo g do dia "para". Em outro dia, as duas
  // células da pessoa trocam de lugar: ela leva o turno para o dia novo e o dia antigo fica com o
  // que ela tinha no dia novo (assim o número de folgas não muda).
  function moverPessoa(id, de, g, para, faixa) {
    if (!state.funcionamento[para]) return;
    var grade = state.escalas[state.versao][state.semana];
    grade[id] = grade[id] || {};
    var atual = celula(state, state.versao, state.semana, id, para);
    if (grupoDe(atual, state.funcionamento[para]) === g) {
      if (de !== para) toast("Essa pessoa já está nesse turno " + prep(para) + ".");
      return;
    }
    var snap = JSON.stringify(state), antes = metricas(state);
    var pe = state.equipe.filter(function (x) { return x.id === id; })[0], nome = pe ? pe.nome : "Pessoa";
    var nova;
    if (g === "folga" || g === "livre") nova = { tipo: g };
    else { var t = turnoDoGrupo(g, para, faixa); nova = { tipo: "turno", inicio: t.inicio, fim: t.fim, rotulo: t.rotulo || "" }; }
    if (de !== para) {
      // O dia antigo recebe o que a pessoa fazia no dia novo, no turno equivalente do dia antigo.
      var gAtual = grupoDe(atual, state.funcionamento[para]);
      if (atual.tipo !== "turno") grade[id][de] = { tipo: atual.tipo };
      else {
        var td = document.querySelector('#grid td[data-ag="' + gAtual + '"][data-ad="' + de + '"]');
        var t2 = turnoDoGrupo(gAtual, de, td ? td.dataset.faixa : "");
        grade[id][de] = { tipo: "turno", inicio: t2.inicio, fim: t2.fim, rotulo: t2.rotulo || "" };
      }
    }
    grade[id][para] = nova;
    salvar(); render();
    var nomeDe = function (c) { return c.tipo === "turno" ? "das " + falada(min(c.inicio)) + " às " + falada(min(c.fim)) : c.tipo === "folga" ? "de folga" : "de reserva"; };
    var rot = nome + " " + prep(para) + " " + nomeDe(nova) + (de !== para ? " e " + prep(de) + " " + nomeDe(grade[id][de]) : "");
    if (!verificarPiora(snap, antes, "Movi " + rot)) {
      desfazerSnap = snap;
      dica("Movi " + esc(rot) + ".", '<button type="button" class="b ghost sm" data-dica="desfazer">Desfazer</button>');
    }
  }

  function ligarArrastar() {
    var grid = $("#grid"), box = grid.closest(".grid-scroll") || grid.parentNode;
    var ar = null, ignorarClique = false;
    function alvo(x, y) {
      var el = document.elementFromPoint(x, y), td = el && el.closest && el.closest("#grid td[data-ag]");
      return td && grid.contains(td) ? td : null;
    }
    function marcar(td) {
      if (ar.alvo === td) return;
      if (ar.alvo) ar.alvo.classList.remove("alvo");
      ar.alvo = td; if (td) td.classList.add("alvo");
    }
    function comecar() {
      ar.on = true;
      var r = ar.el.getBoundingClientRect();
      ar.fant = ar.el.cloneNode(true);
      ar.fant.classList.add("fantasma");
      ar.fant.style.width = r.width + "px";
      ar.dx = ar.x0 - r.left; ar.dy = ar.y0 - r.top;
      document.body.appendChild(ar.fant);
      ar.el.classList.add("saindo");
      grid.classList.add("arrastando");
      try { ar.el.setPointerCapture(ar.id); } catch (e) {}
    }
    function mover(x, y) {
      ar.fant.style.transform = "translate(" + (x - ar.dx) + "px," + (y - ar.dy) + "px)";
      marcar(alvo(x, y));
      var b = box.getBoundingClientRect();
      if (x < b.left + 40) box.scrollLeft -= 12; else if (x > b.right - 40) box.scrollLeft += 12;
    }
    function fim(soltar, x, y) {
      if (!ar) return;
      clearTimeout(ar.timer);
      var a = ar; ar = null;
      if (!a.on) return;
      ignorarClique = true; setTimeout(function () { ignorarClique = false; }, 0);
      a.fant.remove(); a.el.classList.remove("saindo"); grid.classList.remove("arrastando");
      if (a.alvo) a.alvo.classList.remove("alvo");
      var td = soltar ? alvo(x, y) : null;
      if (td) moverPessoa(a.p, a.d, td.dataset.ag, td.dataset.ad, td.dataset.faixa || "");
    }
    grid.addEventListener("pointerdown", function (e) {
      if (vista !== "turno" || e.button > 0) return;
      var el = e.target.closest(".pc[data-p]"); if (!el) return;
      ar = { el: el, p: el.dataset.p, d: el.dataset.d, id: e.pointerId, x0: e.clientX, y0: e.clientY, toque: e.pointerType !== "mouse", on: false, alvo: null };
      // No toque, segurar 0,3 s começa a arrastar; mexer antes disso é rolagem da tabela.
      if (ar.toque) ar.timer = setTimeout(function () { if (ar && !ar.on) { comecar(); mover(ar.x0, ar.y0); if (navigator.vibrate) navigator.vibrate(15); } }, 300);
    });
    document.addEventListener("pointermove", function (e) {
      if (!ar || e.pointerId !== ar.id) return;
      if (!ar.on) {
        var longe = Math.abs(e.clientX - ar.x0) + Math.abs(e.clientY - ar.y0) > 6;
        if (!longe) return;
        if (ar.toque) { clearTimeout(ar.timer); ar = null; return; }
        comecar();
      }
      e.preventDefault();
      mover(e.clientX, e.clientY);
    });
    document.addEventListener("pointerup", function (e) { if (ar && e.pointerId === ar.id) fim(true, e.clientX, e.clientY); });
    document.addEventListener("pointercancel", function (e) { if (ar && e.pointerId === ar.id) fim(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ar) fim(false); });
    // Com o dedo já arrastando, a página não rola.
    document.addEventListener("touchmove", function (e) { if (ar && ar.on) e.preventDefault(); }, { passive: false });
    grid.addEventListener("contextmenu", function (e) { if (e.target.closest(".pc")) e.preventDefault(); });
    grid.addEventListener("click", function (e) { if (ignorarClique) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }

  function marcarPendente() {
    state.pendente = true;
    $("#regenAviso").textContent = "Você mudou horário ou equipe. A grade atual foi mantida; clique para montar de novo com os dados novos (as mudanças feitas à mão na grade se perdem).";
  }

  /* ------------------------------------------------------------------ */

  function iniciar(s, novo) {
    state = s;
    ligar();
    renderCfg();
    render();
    if (novo || !PAINEL) salvar();
    else $("#tSalvo").textContent = "salvo na sua conta";
    if (novo) { $("#cfg").open = true; toast("Exemplo carregado. Troque pelos dados do seu negócio no fim da página."); }
  }

  if (PAINEL) {
    fetch(PAINEL.api, { credentials: "same-origin" })
      .then(function (r) {
        if (r.status === 401) { location.href = PAINEL.login; throw new Error("sessão"); }
        return r.json();
      })
      .then(function (d) { iniciar(d.estado ? normalizar(d.estado) : estadoExemplo(), !d.estado); })
      .catch(function (e) { if (e.message !== "sessão") toast("Não foi possível abrir sua escala. Recarregue a página."); });
  } else {
    state = carregar();
    iniciar(state || estadoExemplo(), !state);
  }

  // Usado pelo teste automatizado.
  window.__j40h = { get state() { return state; }, calcular: calcular, custos: custos, linkPessoal: linkPessoal, contextoIA: contextoIA, aplicarProposta: aplicarProposta, metricas: metricas };
})();
