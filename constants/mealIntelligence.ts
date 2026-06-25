import type { AppSettings, FavoriteMeal, LanguagePreference, Meal, MealPrice } from "@/types/canteen";

const STOP_WORDS = new Set(["mit", "und", "oder", "der", "die", "das", "auf", "an", "in", "von", "vom"]);

export interface SmartMealResult {
    score: number;
    reasons: string[];
    warnings: string[];
}

export function scoreLabel(score: number, language: LanguagePreference = "de"): string {
    if (score >= 80) {
        return language === "en" ? "Great match" : "Sehr passend";
    }

    if (score >= 60) {
        return language === "en" ? "Good match" : "Gut passend";
    }

    if (score >= 40) {
        return language === "en" ? "Okay" : "Okay";
    }

    return language === "en" ? "Less suitable" : "Weniger passend";
}

export interface MealFilterOptions {
    query: string;
    onlyRecommended: boolean;
    onlySustainable: boolean;
    onlyBudget: boolean;
}

export function getMealId(meal: Meal): string {
    return meal.ID ?? meal.id ?? `${meal.category}:${meal.name}`;
}

export function getStudentPrice(meal: Meal): number | undefined {
    return meal.price?.student ?? getPrice(meal.prices, ["Student", "Studierende"]);
}

function getPrice(prices: MealPrice[] | undefined, labels: string[]): number | undefined {
    return prices?.find((entry) => labels.includes(entry.priceType))?.price;
}

export function keywordSet(value: string): Set<string> {
    return new Set(
        value
            .toLowerCase()
            .replace(/[^a-zäöüß0-9\s-]/gi, " ")
            .split(/\s+/)
            .map((word) => word.trim())
            .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    );
}

export function badgeNames(meal: Meal): string[] {
    return meal.badges?.map((badge) => badge.name.toLowerCase()) ?? [];
}

export function additiveLabels(meal: Meal): string[] {
    return meal.additives?.map((additive) => {
        if (typeof additive === "string") {
            return additive;
        }

        return additive.text ?? additive.name ?? additive.abbreviation ?? additive.ID ?? additive.id ?? "";
    }).filter(Boolean) ?? [];
}

export function isVegan(meal: Meal): boolean {
    return badgeNames(meal).some((badge) => badge.includes("vegan"));
}

export function isVegetarian(meal: Meal): boolean {
    return isVegan(meal) || badgeNames(meal).some((badge) => badge.includes("vegetar"));
}

export function matchesDietPreference(meal: Meal, settings: AppSettings): boolean {
    if (settings.dietPreference === "vegan") {
        return isVegan(meal);
    }

    if (settings.dietPreference === "vegetarian") {
        return isVegetarian(meal);
    }

    return true;
}

export function hasAvoidedAdditive(meal: Meal, settings: AppSettings): boolean {
    const labels = additiveLabels(meal).join(" ").toLowerCase();

    return settings.avoidedAdditiveKeywords.some((keyword) => labels.includes(keyword.toLowerCase()));
}

export function isSustainable(meal: Meal): boolean {
    const badges = badgeNames(meal).join(" ");

    return badges.includes("co2_bewertung_a")
        || badges.includes("grüner")
        || badges.includes("gruener")
        || (typeof meal.co2Bilanz === "number" && meal.co2Bilanz <= 550);
}

export function calculateSmartMealScore(
    meal: Meal,
    favoriteMeals: FavoriteMeal[],
    settings: AppSettings
): SmartMealResult {
    let score = 40;
    const reasons: string[] = [];
    const warnings: string[] = [];
    const studentPrice = getStudentPrice(meal);
    const mealKeywords = keywordSet(meal.name);

    favoriteMeals.forEach((favorite) => {
        if (favorite.category.toLowerCase() === meal.category.toLowerCase()) {
            score += 15;
            reasons.push("Lieblings-Kategorie");
        }

        keywordSet(favorite.name).forEach((keyword) => {
            if (mealKeywords.has(keyword)) {
                score += 6;
                reasons.push(`ähnlich zu ${keyword}`);
            }
        });
    });

    if (settings.dietPreference !== "none" && matchesDietPreference(meal, settings)) {
        score += 18;
        reasons.push(settings.dietPreference === "vegan" ? "vegan passend" : "vegetarisch passend");
    }

    if (settings.dietPreference !== "none" && !matchesDietPreference(meal, settings)) {
        score -= 35;
        warnings.push("passt nicht zum Ernährungsprofil");
    }

    if (typeof settings.maxStudentPrice === "number" && typeof studentPrice === "number") {
        if (studentPrice <= settings.maxStudentPrice) {
            score += 12;
            reasons.push("im Budget");
        } else {
            score -= 20;
            warnings.push("über Budget");
        }
    }

    if (isSustainable(meal) && settings.preferSustainableMeals !== false) {
        score += 10;
        reasons.push("nachhaltige Wahl");
    }

    if (hasAvoidedAdditive(meal, settings)) {
        score -= 50;
        warnings.push("enthält vermiedene Zusatzstoffe");
    }

    if (settings.preferLowCo2Meals !== false && typeof meal.co2Bilanz === "number" && meal.co2Bilanz <= 350) {
        score += 6;
        reasons.push("niedrige CO2-Bilanz");
    }

    return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        reasons: Array.from(new Set(reasons)).slice(0, 3),
        warnings: Array.from(new Set(warnings)).slice(0, 2)
    };
}

export function filterMeals(meals: Meal[], settings: AppSettings, options: MealFilterOptions): Meal[] {
    const query = options.query.trim().toLowerCase();

    return meals.filter((meal) => {
        const studentPrice = getStudentPrice(meal);
        const score = calculateSmartMealScore(meal, settings.favoriteMeals, settings).score;
        const searchable = [
            meal.name,
            meal.category,
            ...badgeNames(meal),
            ...additiveLabels(meal)
        ].join(" ").toLowerCase();

        if (query && !searchable.includes(query)) {
            return false;
        }

        if (!matchesDietPreference(meal, settings)) {
            return false;
        }

        if (hasAvoidedAdditive(meal, settings)) {
            return false;
        }

        if ((options.onlyBudget || settings.hideOverBudget) && typeof settings.maxStudentPrice === "number") {
            if (typeof studentPrice !== "number" || studentPrice > settings.maxStudentPrice) {
                return false;
            }
        }

        if (options.onlySustainable && !isSustainable(meal)) {
            return false;
        }

        if (options.onlyRecommended && score < 60) {
            return false;
        }

        return true;
    });
}