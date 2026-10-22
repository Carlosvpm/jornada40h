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
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS convites (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  estado TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  expira_em INTEGER NOT NULL,
  usado_em TEXT
);
CREATE TABLE IF NOT EXISTS escalas (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  estado TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DIR, { recursive: true });
  db = new Database(path.join(DIR, "jornada40h.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export type Usuario = { id: number; email: string; nome: string };
