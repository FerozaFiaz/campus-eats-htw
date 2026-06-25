import * as SQLite from "expo-sqlite";

import { Additive, Badge, CachedMealPlan, Canteen, Meal } from "@/types/canteen";
import { runMigrations } from "@/database/migrations";

interface CanteenRow {
    id: string;
    name: string;
    address: string;
    city: string;
    zipcode: string | null;
    district: string | null;
    latitude: number | null;
    longitude: number | null;
    business_days_json: string | null;
    phone: string | null;
    email: string | null;
    click_and_collect: number | null;
    universities_json: string | null;
    average_rating: number | null;
    review_count: number | null;
    url: string | null;
    last_updated: string | null;
}

interface MealCacheRow {
    canteen_id: string;
    date: string;
    meals_json: string;
    updated_at: string;
}

interface AdditiveRow {
    id: string;
    text: string;
    reference_id: string | null;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!databasePromise) {
        databasePromise = SQLite.openDatabaseAsync("campus-eats.db");
    }

    const database = await databasePromise;
    await runMigrations(database);
    return database;
}

function mapCanteenRow(row: CanteenRow): Canteen {
    let businessDays: Canteen["businessDays"] = [];

    try {
        businessDays = row.business_days_json ? JSON.parse(row.business_days_json) as Canteen["businessDays"] : [];
    } catch {
        businessDays = [];
    }
    let universities: string[] = [];

    try {
        universities = row.universities_json ? JSON.parse(row.universities_json) as string[] : [];
    } catch {
        universities = [];
    }

    return {
        id: row.id,
        name: row.name,
        address: row.address,
        city: row.city,
        zipcode: row.zipcode ?? undefined,
        district: row.district ?? undefined,
        latitude: row.latitude ?? undefined,
        longitude: row.longitude ?? undefined,
        businessDays,
        phone: row.phone ?? undefined,
        email: row.email ?? undefined,
        clickAndCollect: row.click_and_collect === 1,
        universities,
        averageRating: row.average_rating ?? undefined,
        reviewCount: row.review_count ?? 0,
        url: row.url ?? undefined,
        lastUpdated: row.last_updated ?? undefined
    };
}

export async function initializeDatabase(): Promise<void> {
    await getDatabase();
}

export async function saveCanteens(canteens: Canteen[]): Promise<void> {
    const database = await getDatabase();
    const updatedAt = new Date().toISOString();

    await database.withTransactionAsync(async () => {
        for (const canteen of canteens) {
            await database.runAsync(
                `INSERT OR REPLACE INTO canteens
         (id, name, address, city, zipcode, district, latitude, longitude, business_days_json,
          phone, email, click_and_collect, universities_json, average_rating, review_count, url, last_updated, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    canteen.id,
                    canteen.name,
                    canteen.address,
                    canteen.city,
                    canteen.zipcode ?? null,
                    canteen.district ?? null,
                    canteen.latitude ?? null,
                    canteen.longitude ?? null,
                    JSON.stringify(canteen.businessDays),
                    canteen.phone ?? null,
                    canteen.email ?? null,
                    canteen.clickAndCollect ? 1 : 0,
                    JSON.stringify(canteen.universities),
                    canteen.averageRating ?? null,
                    canteen.reviewCount,
                    canteen.url ?? null,
                    canteen.lastUpdated ?? null,
                    updatedAt
                ]
            );
        }
    });
}

export async function getAllCanteens(): Promise<Canteen[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<CanteenRow>(
        `SELECT id, name, address, city, zipcode, district, latitude, longitude, business_days_json,
            phone, email, click_and_collect, universities_json, average_rating, review_count, url, last_updated
     FROM canteens
     ORDER BY name COLLATE NOCASE ASC`
    );

    return rows.map(mapCanteenRow);
}

export async function getCanteenById(id: string): Promise<Canteen | undefined> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<CanteenRow>(
        `SELECT id, name, address, city, zipcode, district, latitude, longitude, business_days_json,
            phone, email, click_and_collect, universities_json, average_rating, review_count, url, last_updated
     FROM canteens
     WHERE id = ?`,
        [id]
    );

    return row ? mapCanteenRow(row) : undefined;
}

export async function countCanteens(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM canteens");
    return result?.total ?? 0;
}

export async function countCanteensMissingDetails(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ total: number }>(
        "SELECT COUNT(*) as total FROM canteens WHERE business_days_json = '[]' OR business_days_json IS NULL"
    );
    return result?.total ?? 0;
}

export async function saveMealPlan(canteenId: string, date: string, meals: Meal[]): Promise<void> {
    const database = await getDatabase();

    await database.runAsync(
        `INSERT OR REPLACE INTO meal_cache (canteen_id, date, meals_json, updated_at)
     VALUES (?, ?, ?, ?)`,
        [canteenId, date, JSON.stringify(meals), new Date().toISOString()]
    );
}

export async function getCachedMealPlan(canteenId: string, date: string): Promise<CachedMealPlan | undefined> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<MealCacheRow>(
        "SELECT canteen_id, date, meals_json, updated_at FROM meal_cache WHERE canteen_id = ? AND date = ?",
        [canteenId, date]
    );

    if (!row) {
        return undefined;
    }

    try {
        return {
            canteenId: row.canteen_id,
            date: row.date,
            meals: JSON.parse(row.meals_json) as Meal[],
            updatedAt: row.updated_at
        };
    } catch {
        return undefined;
    }
}

export async function countCachedMealPlans(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM meal_cache");
    return result?.total ?? 0;
}

export async function clearCachedMealPlans(): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("DELETE FROM meal_cache");
}

export async function saveAdditives(additives: Additive[]): Promise<void> {
    const database = await getDatabase();
    const updatedAt = new Date().toISOString();

    await database.withTransactionAsync(async () => {
        for (const additive of additives) {
            const id = additive.id ?? additive.ID ?? additive.abbreviation ?? additive.text;

            if (!id) {
                continue;
            }

            await database.runAsync(
                `INSERT OR REPLACE INTO additives (id, text, reference_id, updated_at)
         VALUES (?, ?, ?, ?)`,
                [
                    id,
                    additive.text ?? additive.name ?? additive.abbreviation ?? additive.referenceid ?? id,
                    additive.referenceid ?? additive.abbreviation ?? null,
                    updatedAt
                ]
            );
        }
    });
}

export async function getAllAdditives(): Promise<Additive[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<AdditiveRow>(
        "SELECT id, text, reference_id FROM additives ORDER BY text COLLATE NOCASE ASC"
    );

    return rows.map((row) => ({
        id: row.id,
        ID: row.id,
        text: row.text,
        name: row.text,
        abbreviation: row.reference_id ?? undefined,
        referenceid: row.reference_id ?? undefined
    }));
}

export async function saveBadges(badges: Badge[]): Promise<void> {
    const database = await getDatabase();
    const updatedAt = new Date().toISOString();

    await database.withTransactionAsync(async () => {
        for (const badge of badges) {
            const id = badge.id ?? badge.ID ?? badge.name;

            if (!id) {
                continue;
            }

            await database.runAsync(
                `INSERT OR REPLACE INTO badges (id, name, description, updated_at)
         VALUES (?, ?, ?, ?)`,
                [id, badge.name, badge.description ?? null, updatedAt]
            );
        }
    });
}

export async function countAdditives(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM additives");
    return result?.total ?? 0;
}

export async function countBadges(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM badges");
    return result?.total ?? 0;
}
