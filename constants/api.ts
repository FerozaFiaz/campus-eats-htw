import {
    Additive,
    ApiCanteen,
    Badge,
    Canteen,
    CanteenReview,
    Meal,
    MealReview,
    MealReviewUpdate
} from "@/types/canteen";

const DEFAULT_API_BASE_URL = "https://mensa.gregorflachs.de/api/v1";
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "";
const REQUEST_TIMEOUT_MS = 12000;

export class ApiError extends Error {
    status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

interface ApiFetchOptions extends RequestInit {
    query?: Record<string, string | boolean | number | undefined>;
}

function buildUrl(path: string, query?: ApiFetchOptions["query"]): string {
    const url = new URL(`${API_BASE_URL}${path}`);

    Object.entries(query ?? {}).forEach(([key, value]) => {
        if (value !== undefined) {
            url.searchParams.set(key, String(value));
        }
    });

    return url.toString();
}

function usesDirectMensaApi(): boolean {
    try {
        return new URL(API_BASE_URL).hostname === "mensa.gregorflachs.de";
    } catch {
        return false;
    }
}

function messageForStatus(status: number): string {
    switch (status) {
        case 401:
            return "Der API-Key fehlt. Bitte prüfe die .env Datei.";
        case 403:
            return "Der API-Key wurde abgelehnt. Bitte prüfe EXPO_PUBLIC_API_KEY.";
        case 404:
            return "Für diese Anfrage wurden keine Daten gefunden.";
        case 429:
            return "Zu viele Anfragen. Bitte kurz warten und erneut versuchen.";
        case 500:
            return "Die Mensa-API hat gerade ein Serverproblem.";
        default:
            return "Die Mensa-API ist gerade nicht erreichbar.";
    }
}

async function readErrorMessage(response: Response): Promise<string> {
    const fallback = messageForStatus(response.status);
    const contentType = response.headers.get("content-type") ?? "";

    try {
        if (contentType.includes("application/json")) {
            const body = await response.json() as { detail?: string; message?: string; error?: string };
            return body.detail ?? body.message ?? body.error ?? fallback;
        }

        const body = await response.text();
        return body.trim() || fallback;
    } catch {
        return fallback;
    }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    if (usesDirectMensaApi() && !API_KEY) {
        throw new ApiError("Der API-Key fehlt. Bitte EXPO_PUBLIC_API_KEY setzen oder EXPO_PUBLIC_API_BASE_URL auf den Proxy zeigen lassen.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;

    try {
        response = await fetch(buildUrl(path, options.query), {
            ...options,
            signal: options.signal ?? controller.signal,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(API_KEY ? { "x-api-key": API_KEY } : {}),
                ...options.headers
            }
        });
    } catch (error) {
        const isTimeout = error instanceof Error && error.name === "AbortError";
        throw new ApiError(
            isTimeout
                ? "Die Anfrage hat zu lange gedauert. Bitte Verbindung prüfen und erneut versuchen."
                : "Keine Verbindung zur Mensa-API. Bitte Internetverbindung prüfen.",
            isTimeout ? 408 : undefined
        );
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        throw new ApiError(await readErrorMessage(response), response.status);
    }

    return response.json() as Promise<T>;
}

export function normalizeCanteen(apiCanteen: ApiCanteen): Canteen {
    const address = apiCanteen.address;
    const street = address?.street?.trim();
    const zipcode = address?.zipcode?.trim();
    const city = address?.city?.trim() || "Berlin";
    const id = apiCanteen.ID ?? apiCanteen.id;
    const geolocation = address?.geolocation ?? address?.geoLocation;
    const reviews = apiCanteen.canteenReviews ?? apiCanteen.canteenReviewData ?? [];
    const reviewRatings = reviews
        .map((review) => review.averageRating)
        .filter((rating): rating is number => typeof rating === "number");
    const averageRating = reviewRatings.length > 0
        ? reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length
        : undefined;

    if (!id) {
        throw new ApiError(`Mensa ohne ID erhalten: ${apiCanteen.name}`);
    }

    return {
        id,
        name: apiCanteen.name,
        address: street || "Adresse nicht angegeben",
        city,
        zipcode,
        district: address?.district?.trim(),
        latitude: geolocation?.latitude,
        longitude: geolocation?.longitude,
        businessDays: apiCanteen.businessDays ?? [],
        phone: apiCanteen.contactInfo?.phone,
        email: apiCanteen.contactInfo?.email,
        clickAndCollect: apiCanteen.clickAndCollect ?? false,
        universities: apiCanteen.universities?.map((university) => university.trim()).filter(Boolean) ?? [],
        averageRating,
        reviewCount: reviews.length,
        url: apiCanteen.url,
        lastUpdated: apiCanteen.lastUpdated
    };
}

export async function fetchCanteens(): Promise<Canteen[]> {
    const canteens = await apiFetch<ApiCanteen[]>("/canteen", {
        query: {
            loadingtype: "complete"
        }
    });

    if (canteens.length === 0) {
        throw new ApiError("Die API hat keine Mensen zurückgegeben.");
    }

    return canteens
        .flatMap((canteen) => {
            try {
                return [normalizeCanteen(canteen)];
            } catch {
                return [];
            }
        })
        .filter((canteen) => canteen.city.toLowerCase().includes("berlin"))
        .sort((left, right) => left.name.localeCompare(right.name, "de"));
}

interface MenuResponse {
    date: string;
    canteenId?: string;
    canteeenId?: string;
    meals?: Meal[];
}

function normalizeDate(value: string): string {
    return value.split("T")[0];
}

function reviewsWithAverage<T extends { averageRating?: number; detailRatings?: Array<{ rating: number }> }>(reviews: T[]): T[] {
    return reviews.map((review) => {
        if (typeof review.averageRating === "number" || !review.detailRatings?.length) {
            return review;
        }

        const ratings = review.detailRatings
            .map((detail) => detail.rating)
            .filter((rating): rating is number => typeof rating === "number");

        if (ratings.length === 0) {
            return review;
        }

        return {
            ...review,
            averageRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        };
    });
}

export async function fetchMeals(canteenId: string, date: string): Promise<Meal[]> {
    try {
        const menus = await fetchMenuRange(canteenId, date, date);
        return menus.find((menu) => menu.date === date)?.meals ?? menus[0]?.meals ?? [];
    } catch (error) {
        if (error instanceof ApiError && error.status !== 404) {
            throw error;
        }
    }

    return apiFetch<Meal[]>(`/canteen/${encodeURIComponent(canteenId)}/meal`, {
        query: {
            loadImages: false,
            date
        }
    }).catch((error) => {
        if (error instanceof ApiError && error.status === 404) {
            return [];
        }

        throw error;
    });
}

export async function fetchMenuRange(canteenId: string, startdate: string, enddate: string): Promise<MenuResponse[]> {
    const menus = await apiFetch<MenuResponse[]>("/menue", {
        query: {
            loadingtype: "complete",
            canteenId,
            startdate,
            enddate
        }
    });

    return menus.map((menu) => ({
        ...menu,
        date: normalizeDate(menu.date),
        meals: menu.meals?.map((meal) => ({
            ...meal,
            mealReviews: meal.mealReviews ? reviewsWithAverage(meal.mealReviews) : undefined
        })) ?? []
    }));
}

export async function fetchAdditives(): Promise<Additive[]> {
    return apiFetch<Additive[]>("/additive");
}

export async function fetchBadges(): Promise<Badge[]> {
    return apiFetch<Badge[]>("/badge");
}

export async function fetchCanteenReviews(canteenId: string): Promise<CanteenReview[]> {
    return apiFetch<CanteenReview[]>("/canteenreview", {
        query: {
            canteenId,
            sortby: "date:desc",
            limit: 5
        }
    }).catch((error) => {
        if (error instanceof ApiError && error.status === 404) {
            return [];
        }

        throw error;
    });
}

export async function fetchMealReviews(mealId: string, userId?: string): Promise<MealReview[]> {
    return apiFetch<MealReview[]>("/mealreview", {
        query: {
            mealId,
            usderId: userId,
            sortby: "date:desc",
            limit: 20
        }
    }).then(reviewsWithAverage).catch((error) => {
        if (error instanceof ApiError && error.status === 404) {
            return [];
        }

        throw error;
    });
}

export async function submitMealReview(review: MealReviewUpdate): Promise<MealReview> {
    return apiFetch<MealReview>("/mealreview", {
        method: review.ID ? "PUT" : "POST",
        body: JSON.stringify(review)
    });
}

export function formatApiDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}
