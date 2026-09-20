import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

declare global {
  // eslint-disable-next-line no-var
  var __mercadoDb: DatabaseSync | undefined;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.MERCADO_DB ?? path.join(DATA_DIR, "mercado.db");

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  const schema = fs.readFileSync(
    path.join(process.cwd(), "src", "db", "schema.sql"),
    "utf8",
  );
  db.exec(schema);
  migrate(db);
  return db;
}

/**
 * Agrega columnas nuevas a bases de datos creadas con versiones anteriores del
 * esquema (SQLite no vuelve a aplicar CREATE TABLE IF NOT EXISTS).
 */
function migrate(db: DatabaseSync) {
  const additions: [string, string, string][] = [
    ["items", "shop_id", "TEXT"],
    ["items", "stock", "INTEGER NOT NULL DEFAULT 1"],
    ["orders", "quantity", "INTEGER NOT NULL DEFAULT 1"],
    ["orders", "shop_id", "TEXT"],
    ["orders", "variant_label", "TEXT NOT NULL DEFAULT ''"],
    ["orders", "is_wholesale", "INTEGER NOT NULL DEFAULT 0"],
    ["orders", "shipment_id", "TEXT"],
    ["items", "external_sku", "TEXT NOT NULL DEFAULT ''"],
    ["items", "origin", "TEXT NOT NULL DEFAULT 'own'"],
    ["items", "source_shop_id", "TEXT"],
    ["items", "source_item_id", "TEXT"],
    ["shops", "specialty", "TEXT NOT NULL DEFAULT ''"],
    ["shops", "sourcing_needs", "TEXT NOT NULL DEFAULT ''"],
    ["shops", "is_producer", "INTEGER NOT NULL DEFAULT 0"],
  ];
  for (const [table, column, definition] of additions) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
}

export function getDb(): DatabaseSync {
  if (!globalThis.__mercadoDb) {
    globalThis.__mercadoDb = open();
  }
  return globalThis.__mercadoDb;
}

type Params = Array<string | number | null | bigint | Uint8Array>;

function normalize(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  return value;
}

function normalizeRow<T>(row: unknown): T {
  if (row === undefined || row === null) return row as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    out[k] = normalize(v);
  }
  return out as T;
}

export function all<T = Record<string, unknown>>(
  sql: string,
  params: Params = [],
): T[] {
  return getDb()
    .prepare(sql)
    .all(...params)
    .map((r) => normalizeRow<T>(r));
}

export function get<T = Record<string, unknown>>(
  sql: string,
  params: Params = [],
): T | undefined {
  const row = getDb()
    .prepare(sql)
    .get(...params);
  return row === undefined ? undefined : normalizeRow<T>(row);
}

export function run(sql: string, params: Params = []) {
  return getDb()
    .prepare(sql)
    .run(...params);
}

export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix = "") {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += b.toString(36).padStart(2, "0");
  return prefix + s.slice(0, 16);
}
