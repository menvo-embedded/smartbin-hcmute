import * as SQLite from 'expo-sqlite';

/**
 * Cơ sở dữ liệu cục bộ. Mọi thao tác ghi đều vào đây trước,
 * sau đó hàng đợi đồng bộ đẩy lên server khi có mạng.
 */
let db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('smartbin.db');
  await migrate(db);
  return db;
}

async function migrate(d: SQLite.SQLiteDatabase) {
  await d.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sort_events (
      local_id   TEXT PRIMARY KEY,
      server_id  TEXT,
      device_id  TEXT NOT NULL,
      user_id    TEXT,
      waste_type TEXT NOT NULL,
      source     TEXT NOT NULL,
      confidence REAL,
      created_at TEXT NOT NULL,
      synced     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS devices_cache (
      id           TEXT PRIMARY KEY,
      code         TEXT,
      name         TEXT,
      area         TEXT,
      latitude     REAL,
      longitude    REAL,
      is_online    INTEGER,
      last_seen_at TEXT,
      updated_at   TEXT
    );

    -- Hàng đợi thao tác chờ đồng bộ. Mỗi dòng là một lần ghi của người dùng.
    CREATE TABLE IF NOT EXISTS sync_queue (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      entity     TEXT NOT NULL,          -- sort_events | collection_tasks
      operation  TEXT NOT NULL,          -- insert | update
      payload    TEXT NOT NULL,          -- JSON
      created_at TEXT NOT NULL,
      attempts   INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_synced ON sort_events(synced);
  `);
}
