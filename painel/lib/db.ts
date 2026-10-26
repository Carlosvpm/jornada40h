import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// SQLite num arquivo só, em DATA_DIR (no Dokploy, um volume montado em /data).
const DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS codigos (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  criado_em INTEGER NOT NULL,
  expira_em INTEGER NOT NULL,
  erros INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS codigos_email ON codigos(email);
CREATE TABLE IF NOT EXISTS limites (
  chave TEXT PRIMARY KEY,
  inicio INTEGER NOT NULL,
  n INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS escalas (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  estado TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY,
  criado_em INTEGER NOT NULL,
  sid TEXT NOT NULL,
  ev TEXT NOT NULL,
  variante TEXT NOT NULL DEFAULT '',
  anuncio TEXT NOT NULL DEFAULT '',
  termo TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS eventos_criado ON eventos(criado_em);
`;

let db: Database.Database | null = null;

// Versões anteriores tinham login com senha e convites por link. Leva as contas e os convites
// pendentes (com a escala inicial) para o modelo sem senha.
// Recria uma tabela com a definição do SCHEMA atual, mantendo as linhas (receita do SQLite:
// cria a nova, copia, apaga a velha e renomeia a nova; renomear a velha reescreveria as FKs das outras).
function recriar(d: Database.Database, tabela: string, colunas: string) {
  const def = SCHEMA.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${tabela} \\(([\\s\\S]*?)\\n\\);`))![1];
  d.exec(`
    CREATE TABLE ${tabela}_nova (${def});
    INSERT INTO ${tabela}_nova (${colunas}) SELECT ${colunas} FROM ${tabela};
    DROP TABLE ${tabela};
    ALTER TABLE ${tabela}_nova RENAME TO ${tabela};
  `);
}

function migrar(d: Database.Database) {
  const cols = (d.prepare("PRAGMA table_info(usuarios)").all() as { name: string }[]).map(c => c.name);
  // Uma versão desta migração renomeava usuarios e deixava as FKs de sessoes/escalas apontando
  // para "usuarios_antigos", que já não existe. Refaz essas tabelas com a FK certa.
  const quebradas = (d.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE '%usuarios_antigos%'").all() as { name: string }[]).map(t => t.name);
  if (cols.includes("senha_hash") || quebradas.length) {
    d.pragma("foreign_keys = OFF");
    d.transaction(() => {
      if (cols.includes("senha_hash")) recriar(d, "usuarios", "id, email, nome, criado_em");
      if (quebradas.includes("sessoes")) recriar(d, "sessoes", "token_hash, usuario_id, expira_em");
      if (quebradas.includes("escalas")) recriar(d, "escalas", "usuario_id, estado, atualizado_em");
    })();
    d.pragma("foreign_keys = ON");
  }
  const temConvites = d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='convites'").get();
  if (temConvites) {
    const pendentes = d.prepare("SELECT email, nome, estado FROM convites WHERE usado_em IS NULL").all() as { email: string; nome: string; estado: string | null }[];
    d.transaction(() => {
      for (const c of pendentes) liberarAcesso(d, c.email, c.nome, c.estado);
      d.exec("DROP TABLE convites");
    })();
  }
}

/** Cria a conta (se não existe) e grava a escala inicial (se ainda não há escala). Devolve o id. */
export function liberarAcesso(d: Database.Database, email: string, nome: string, estado: string | null): number {
  d.prepare("INSERT INTO usuarios (email, nome) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET nome = CASE WHEN excluded.nome <> '' THEN excluded.nome ELSE usuarios.nome END").run(email, nome);
  const { id } = d.prepare("SELECT id FROM usuarios WHERE email = ?").get(email) as { id: number };
  if (estado) d.prepare("INSERT OR IGNORE INTO escalas (usuario_id, estado) VALUES (?, ?)").run(id, estado);
  return id;
}

/** Apaga códigos vencidos (15 min), sessões vencidas e janelas de limite já fechadas. */
export function faxina(d: Database.Database = getDb()) {
  const agora = Date.now();
  d.prepare("DELETE FROM codigos WHERE expira_em <= ?").run(agora);
  d.prepare("DELETE FROM sessoes WHERE expira_em <= ?").run(agora);
  d.prepare("DELETE FROM limites WHERE inicio <= ?").run(agora - 24 * 3600e3);
}

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DIR, { recursive: true });
  const d = new Database(path.join(DIR, "jornada40h.db"));
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(SCHEMA);
  migrar(d);
  faxina(d);
  setInterval(() => faxina(d), 60e3).unref();
  db = d;
  return d;
}

export type Usuario = { id: number; email: string; nome: string };
