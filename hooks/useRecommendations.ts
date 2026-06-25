import { useEffect, useMemo, useState } from "react";

import { fetchMeals, formatApiDate } from "@/constants/api";
import { calculateSmartMealScore, getMealId } from "@/constants/mealIntelligence";
import { AppSettings, FavoriteMeal, Meal } from "@/types/canteen";

const STOP_WORDS = new Set(["mit", "und", "oder", "der", "die", "das", "auf", "an", "in", "von", "vom"]);

function keywordSet(value: string): Set<string> {
    return new Set(
        value
            .toLowerCase()
            .replace(/[^a-zäöüß0-9\s-]/gi, " ")
            .split(/\s+/)
            .map((word) => word.trim())
            .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    );
}

function scoreMeal(meal: Meal, favorites: FavoriteMeal[]): number {
    const mealKeywords = keywordSet(meal.name);

    return favorites.reduce((score, favorite) => {
        let nextScore = score;

        if (favorite.category.toLowerCase() === meal.category.toLowerCase()) {
            nextScore += 3;
        }

        const favoriteKeywords = keywordSet(favorite.name);
        favoriteKeywords.forEach((keyword) => {
            if (mealKeywords.has(keyword)) {
                nextScore += 1;
            }
        });

        return nextScore;
    }, 0);
}

export function useRecommendations(canteenId: string | undefined, settingsOrFavorites: AppSettings | FavoriteMeal[]) {
    const [recommendations, setRecommendations] = useState<Meal[]>([]);
    const [loading, setLoading] = useState(false);
    const favoriteMeals = Array.isArray(settingsOrFavorites) ? settingsOrFavorites : settingsOrFavorites.favoriteMeals;
    const settings = Array.isArray(settingsOrFavorites) ? undefined : settingsOrFavorites;
    const targetCanteenId = canteenId ?? favoriteMeals[0]?.canteenId;

    const favoriteMealIds = useMemo(
        () => new Set(favoriteMeals.map((meal) => meal.id)),
        [favoriteMeals]
    );
    const settingsSignature = Array.isArray(settingsOrFavorites)
        ? "favorites-only"
        : JSON.stringify({
            avoidedAdditiveKeywords: settingsOrFavorites.avoidedAdditiveKeywords,
            dietPreference: settingsOrFavorites.dietPreference,
            maxStudentPrice: settingsOrFavorites.maxStudentPrice
        });

    useEffect(() => {
        let cancelled = false;

        async function loadRecommendations() {
            if (!targetCanteenId || favoriteMeals.length === 0) {
                setLoading(false);
                setRecommendations([]);
                return;
            }

            setLoading(true);
            try {
                const today = formatApiDate(new Date());
                const meals = await fetchMeals(targetCanteenId, today);
                const scoredMeals = meals
                    .filter((meal) => !favoriteMealIds.has(getMealId(meal)))
                    .map((meal) => ({
                        meal,
                        score: settings
                            ? calculateSmartMealScore(meal, favoriteMeals, settings).score
                            : scoreMeal(meal, favoriteMeals)
                    }))
                    .filter((entry) => entry.score > 0)
                    .sort((left, right) => right.score - left.score)
                    .slice(0, 3)
                    .map((entry) => entry.meal);

                if (!cancelled) {
                    setRecommendations(scoredMeals);
                }
            } catch {
                if (!cancelled) {
                    setRecommendations([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadRecommendations();

        return () => {
            cancelled = true;
        };
    }, [favoriteMealIds, favoriteMeals, settings, settingsSignature, targetCanteenId]);

    return {
        recommendations,
        loading
    };
}