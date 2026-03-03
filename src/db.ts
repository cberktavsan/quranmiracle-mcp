import Database from 'better-sqlite3';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

let db: Database.Database | null = null;

function findDbPath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const prodPath = resolve(__dirname, '..', 'data', 'qurandb.sqlite');
  if (existsSync(prodPath)) return prodPath;
  throw new Error(`QuranDB database not found. Checked: ${prodPath}`);
}

export function getDb(): Database.Database {
  if (db === null) {
    const dbPath = findDbPath();
    db = new Database(dbPath, { readonly: true });
    db.pragma('journal_mode = WAL');
    db.pragma('cache_size = -64000');
  }
  return db;
}

export function closeDb(): void {
  if (db !== null) {
    db.close();
    db = null;
  }
}
