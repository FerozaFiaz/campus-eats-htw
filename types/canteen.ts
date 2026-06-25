export interface CanteenAddress {
    street?: string;
    city?: string;
    zipcode?: string;
    district?: string;
    geolocation?: GeoLocation;
    geoLocation?: GeoLocation;
}

export interface GeoLocation {
    latitude?: number;
    longitude?: number;
}

export interface BusinessHour {
    openAt: string;
    closeAt: string;
    businessHourType: string;
}

export interface BusinessDay {
    day: string;
    businesshours?: BusinessHour[];
    businessHours?: BusinessHour[];
}

export interface ContactInfo {
    phone?: string;
    email?: string;
}

export interface CanteenReview {
    ID?: string;
    id?: string;
    canteenID?: string;
    userID?: string;
    averageRating?: number;
    comment?: string;
    detailRatings?: Array<{
        name: string;
        rating: number;
    }>;
    createdAt?: string;
    lastUpdated?: string;
}

export interface ApiCanteen {
    ID?: string;
    id?: string;
    name: string;
    address?: CanteenAddress;
    contactInfo?: ContactInfo;
    clickAndCollect?: boolean;
    businessDays?: BusinessDay[];
    canteenReviews?: CanteenReview[];
    canteenReviewData?: CanteenReview[];
    universities?: string[];
    url?: string;
    lastUpdated?: string;
}

export interface Canteen {
    id: string;
    name: string;
    address: string;
    city: string;
    zipcode?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
    businessDays: BusinessDay[];
    phone?: string;
    email?: string;
    clickAndCollect: boolean;
    universities: string[];
    averageRating?: number;
    reviewCount: number;
    url?: string;
    lastUpdated?: string;
}

export type PriceType = "Student" | "Studierende" | "Angestellte" | "Gäste" | "Staff" | "Guest" | string;

export interface MealPrice {
    price: number;
    priceType: PriceType;
}

export interface Additive {
    ID?: string;
    id?: string;
    name?: string;
    text?: string;
    abbreviation?: string;
    referenceid?: string;
}

export interface Badge {
    ID?: string;
    id?: string;
    name: string;
    description?: string;
}

export interface Meal {
    ID?: string;
    id?: string;
    name: string;
    category: string;
    prices?: MealPrice[];
    price?: {
        student?: number;
        staff?: number;
        guest?: number;
    };
    additives?: Array<Additive | string>;
    badges?: Badge[];
    waterBilanz?: number;
    co2Bilanz?: number;
    mealReviews?: MealReview[];
}

export interface MealReview {
    ID?: string;
    id?: string;
    mealID?: string;
    mealId?: string;
    mealName?: string;
    mealCategory?: string;
    canteenName?: string;
    userID?: string;
    userId?: string;
    averageRating?: number;
    comment?: string;
    localOnly?: boolean;
    pendingSync?: boolean;
    detailRatings?: Array<{
        name: string;
        rating: number;
    }>;
    createdAt?: string;
    lastUpdated?: string;
}

export interface MealReviewUpdate {
    ID?: string;
    mealID: string;
    userID: string;
    detailRatings: Array<{
        name: string;
        rating: number;
    }>;
    comment?: string;
}

export interface ReviewSummary {
    averageRating?: number;
    reviewCount: number;
    latestComment?: string;
}

export interface FavoriteMeal {
    id: string;
    name: string;
    category: string;
    canteenId: string;
    canteenName: string;
}

export interface MealSection {
    title: string;
    data: Meal[];
}

export interface CachedMealPlan {
    canteenId: string;
    date: string;
    meals: Meal[];
    updatedAt: string;
}

export interface AppSettings {
    initialized: boolean;
    favoriteCanteenId?: string;
    favoriteCanteenIds: string[];
    favoriteMeals: FavoriteMeal[];
    theme: ThemePreference;
    language: LanguagePreference;
    dietPreference: DietPreference;
    maxStudentPrice?: number;
    maxStaffPrice?: number;
    maxGuestPrice?: number;
    hideOverBudget?: boolean;
    preferSustainableMeals?: boolean;
    preferLowCo2Meals?: boolean;
    openFavoriteCanteenOnStart?: boolean;
    showTopMealFirst?: boolean;
    loadWholeWeekMenus?: boolean;
    openOnlyCanteens?: boolean;
    htwCanteensFirst?: boolean;
    startScreen?: StartScreenPreference;
    avoidedAdditiveKeywords: string[];
    canteenSearchHistory: string[];
    mealSearchHistory: string[];
}

export type ThemePreference = "system" | "light" | "dark";

export type LanguagePreference = "de" | "en";

export type DietPreference = "none" | "vegetarian" | "vegan";

export type StartScreenPreference = "home" | "favorites" | "settings";
