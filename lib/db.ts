import type { Database as DatabaseType } from "bun:sqlite";
import { mkdirSync } from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "app.db");

let _db: DatabaseType | null = null;

function initDb(): DatabaseType {
  if (_db) return _db;

  mkdirSync(DB_DIR, { recursive: true });

  // Dynamic require so Next.js build (Node.js worker) doesn't fail
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Database } = require("bun:sqlite") as typeof import("bun:sqlite");
  _db = new Database(DB_PATH, { create: true });

  _db.run("PRAGMA journal_mode = WAL");
  _db.run("PRAGMA foreign_keys = ON");

  // --- better-auth tables ---

  _db.run(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    )
  `);

  // --- App tables ---

  _db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      public_slug TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES user(id)
    )
  `);

  // --- Indexes ---

  _db.run(
    "CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id)"
  );
  _db.run(
    "CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(user_id)"
  );
  _db.run(
    "CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier)"
  );
  _db.run("CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)");
  _db.run(
    "CREATE INDEX IF NOT EXISTS idx_notes_public_slug ON notes(public_slug)"
  );
  _db.run(
    "CREATE INDEX IF NOT EXISTS idx_notes_is_public ON notes(is_public)"
  );

  return _db;
}

// --- Helper functions ---

// Bun SQLite requires $-prefixed keys in binding objects (e.g. { $id: "abc" })
type ParamValue = string | number | boolean | null | bigint;
type Params = Record<`$${string}`, ParamValue>;

export function query<T>(sql: string, params?: Params): T[] {
  const db = initDb();
  const stmt = db.query(sql);
  return (params ? stmt.all(params) : stmt.all()) as T[];
}

export function get<T>(sql: string, params?: Params): T | undefined {
  const db = initDb();
  const stmt = db.query(sql);
  return (params ? stmt.get(params) : stmt.get()) as T | undefined;
}

export function run(sql: string, params?: Params) {
  const db = initDb();
  const stmt = db.query(sql);
  return params ? stmt.run(params) : stmt.run();
}

export function getDb(): DatabaseType {
  return initDb();
}
