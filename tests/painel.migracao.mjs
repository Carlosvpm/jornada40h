// Migração do banco do painel: do schema com senha/convites para o login por código, sem perder
// contas nem escalas, e reparo do banco que uma versão anterior da migração deixou com as FKs de
// sessoes/escalas apontando para "usuarios_antigos" (tabela apagada).
//
// Uso: node --experimental-strip-types tests/painel.migracao.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PAINEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "painel");
const Database = require(path.join(PAINEL, "node_modules", "better-sqlite3"));

const SCHEMA_SENHA = `
CREATE TABLE usuarios (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, nome TEXT NOT NULL DEFAULT '', senha_hash TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE sessoes (token_hash TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, expira_em INTEGER NOT NULL);
CREATE TABLE convites (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, nome TEXT NOT NULL DEFAULT '', estado TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now')), expira_em INTEGER NOT NULL, usado_em TEXT);
CREATE TABLE escalas (usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE, estado TEXT NOT NULL, atualizado_em TEXT NOT NULL DEFAULT (datetime('now')));
INSERT INTO usuarios (email, senha_hash) VALUES ('a@x.com', 'h');
INSERT INTO escalas (usuario_id, estado) VALUES (1, '{"a":1}');
INSERT INTO convites (token_hash, email, nome, estado, expira_em) VALUES ('t', 'andre@x.com', 'André', '{"b":2}', 9e12);
`;

// Estado em que a migração antiga parou: usuarios já sem senha, FKs penduradas, convites ainda lá.
const QUEBRADO = `
PRAGMA foreign_keys = OFF;
ALTER TABLE usuarios RENAME TO usuarios_antigos;
CREATE TABLE usuarios (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, nome TEXT NOT NULL DEFAULT '', criado_em TEXT NOT NULL DEFAULT (datetime('now')));
INSERT INTO usuarios (id, email, nome, criado_em) SELECT id, email, nome, criado_em FROM usuarios_antigos;
DROP TABLE usuarios_antigos;
`;

let falhas = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? "ok  " : "FALHOU"} ${msg}`); if (!cond) falhas++; };

async function cenario(nome, sql) {
  console.log(nome);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "j40h-mig-"));
  const d0 = new Database(path.join(dir, "jornada40h.db"));
  d0.exec(sql);
  d0.close();
  process.env.DATA_DIR = dir;
  // Módulo novo a cada cenário (getDb guarda a conexão).
  const db = (await import(path.join(PAINEL, "lib", "db.ts") + "?" + nome)).getDb();
  const emails = db.prepare("SELECT email FROM usuarios ORDER BY id").all().map(r => r.email);
  ok(emails.join() === "a@x.com,andre@x.com", "contas mantidas e convite pendente vira conta");
  ok(db.prepare("SELECT COUNT(*) n FROM escalas").get().n === 2, "escalas mantidas (inclusive a do convite)");
  ok(!db.prepare("SELECT 1 FROM sqlite_master WHERE sql LIKE '%usuarios_antigos%' OR name IN ('convites', 'usuarios_nova')").get(), "sem tabela velha nem FK pendurada");
  ok(db.pragma("foreign_key_check").length === 0, "foreign_key_check limpo");
  db.prepare("INSERT INTO sessoes VALUES ('s', 1, 9e12)").run();
  db.prepare("DELETE FROM usuarios WHERE id = 1").run();
  ok(!db.prepare("SELECT 1 FROM sessoes").get() && !db.prepare("SELECT 1 FROM escalas WHERE usuario_id = 1").get(), "apagar conta apaga sessão e escala (cascade)");
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
}

await cenario("1. banco com senha e convites", SCHEMA_SENHA);
await cenario("2. banco deixado quebrado pela migração anterior", SCHEMA_SENHA + QUEBRADO);

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo ok");
process.exit(falhas ? 1 : 0);
