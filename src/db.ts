import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

let db: Database.Database | null = null;

function findDbPath(): string {
  const candidates = [
    resolve(process.cwd(), 'data', 'qurandb.sqlite'),                                // Vercel (CWD = project root)
    resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'qurandb.sqlite'), // Local dev
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`QuranDB database not found. Checked:\n${candidates.join('\n')}`);
}

export function getDb(): Database.Database {
  if (db === null) {
    const dbPath = findDbPath();
    db = new Database(dbPath, { readonly: true });
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
