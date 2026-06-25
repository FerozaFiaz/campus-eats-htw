import { SQLiteDatabase } from "expo-sqlite";

async function addColumnIfMissing(database: SQLiteDatabase, table: string, column: string, definition: string) {
    const rows = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    const exists = rows.some((row) => row.name === column);

    if (!exists) {
        await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
}

export async function runMigrations(database: SQLiteDatabase): Promise<void> {
    await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS canteens (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      zipcode TEXT,
      district TEXT,
      latitude REAL,
      longitude REAL,
      business_days_json TEXT NOT NULL DEFAULT '[]',
      phone TEXT,
      email TEXT,
      click_and_collect INTEGER NOT NULL DEFAULT 0,
      universities_json TEXT NOT NULL DEFAULT '[]',
      average_rating REAL,
      review_count INTEGER NOT NULL DEFAULT 0,
      url TEXT,
      last_updated TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_canteens_name ON canteens(name);
    CREATE INDEX IF NOT EXISTS idx_canteens_city ON canteens(city);

    CREATE TABLE IF NOT EXISTS meal_cache (
      canteen_id TEXT NOT NULL,
      date TEXT NOT NULL,
      meals_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (canteen_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_meal_cache_date ON meal_cache(date);

    CREATE TABLE IF NOT EXISTS additives (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      reference_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );
  `);

    await addColumnIfMissing(database, "canteens", "latitude", "REAL");
    await addColumnIfMissing(database, "canteens", "longitude", "REAL");
    await addColumnIfMissing(database, "canteens", "business_days_json", "TEXT NOT NULL DEFAULT '[]'");
    await addColumnIfMissing(database, "canteens", "phone", "TEXT");
    await addColumnIfMissing(database, "canteens", "email", "TEXT");
    await addColumnIfMissing(database, "canteens", "click_and_collect", "INTEGER NOT NULL DEFAULT 0");
    await addColumnIfMissing(database, "canteens", "universities_json", "TEXT NOT NULL DEFAULT '[]'");
    await addColumnIfMissing(database, "canteens", "average_rating", "REAL");
    await addColumnIfMissing(database, "canteens", "review_count", "INTEGER NOT NULL DEFAULT 0");
    await addColumnIfMissing(database, "canteens", "url", "TEXT");
    await addColumnIfMissing(database, "canteens", "last_updated", "TEXT");
}
