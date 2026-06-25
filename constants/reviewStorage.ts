import AsyncStorage from "@react-native-async-storage/async-storage";

import { MealReview } from "@/types/canteen";

export const REVIEW_USER_ID_KEY = "campus-eats:review-user-id";
export const LOCAL_REVIEW_KEY_PREFIX = "campus-eats:local-meal-review:";

export function localReviewKey(mealId: string): string {
    return `${LOCAL_REVIEW_KEY_PREFIX}${mealId}`;
}

export async function getLocalReview(mealId: string): Promise<MealReview | undefined> {
    const stored = await AsyncStorage.getItem(localReviewKey(mealId));

    if (!stored) {
        return undefined;
    }

    try {
        return JSON.parse(stored) as MealReview;
    } catch {
        await AsyncStorage.removeItem(localReviewKey(mealId));
        return undefined;
    }
}

export async function saveLocalReview(mealId: string, review: MealReview): Promise<void> {
    await AsyncStorage.setItem(localReviewKey(mealId), JSON.stringify(review));
}

export async function removeLocalReview(mealId: string): Promise<void> {
    await AsyncStorage.removeItem(localReviewKey(mealId));
}

export async function listLocalReviews(): Promise<MealReview[]> {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(LOCAL_REVIEW_KEY_PREFIX));
    const entries = await AsyncStorage.multiGet(keys);
    const reviews: MealReview[] = [];

    entries.forEach(([, value]) => {
        if (!value) {
            return;
        }

        try {
            reviews.push(JSON.parse(value) as MealReview);
        } catch {
            // Invalid entries are ignored here; individual reads clean themselves up.
        }
    });

    return reviews.sort((left, right) => (right.lastUpdated ?? "").localeCompare(left.lastUpdated ?? ""));
}

export async function clearLocalReviews(): Promise<void> {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(LOCAL_REVIEW_KEY_PREFIX));

    if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
    }
}

export async function resetReviewUserId(): Promise<void> {
    await AsyncStorage.removeItem(REVIEW_USER_ID_KEY);
}
