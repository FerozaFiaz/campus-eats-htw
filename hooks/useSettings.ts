import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    createElement,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { ColorSchemeName, useColorScheme } from "react-native";

import {
    AppSettings,
    DietPreference,
    FavoriteMeal,
    LanguagePreference,
    StartScreenPreference,
    ThemePreference
} from "@/types/canteen";

const SETTINGS_KEY = "campus-eats:settings";
export const INITIALIZED_KEY = "initialized";

const DEFAULT_SETTINGS: AppSettings = {
    initialized: false,
    favoriteCanteenId: undefined,
    favoriteCanteenIds: [],
    favoriteMeals: [],
    theme: "system",
    language: "de",
    dietPreference: "none",
    maxStudentPrice: undefined,
    maxStaffPrice: undefined,
    maxGuestPrice: undefined,
    hideOverBudget: false,
    preferSustainableMeals: true,
    preferLowCo2Meals: true,
    openFavoriteCanteenOnStart: false,
    showTopMealFirst: true,
    loadWholeWeekMenus: true,
    openOnlyCanteens: false,
    htwCanteensFirst: true,
    startScreen: "home",
    avoidedAdditiveKeywords: [],
    canteenSearchHistory: [],
    mealSearchHistory: []
};

type SearchHistoryScope = "canteen" | "meal";

async function readSettings(): Promise<AppSettings> {
    const [rawSettings, initializedFlag] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(INITIALIZED_KEY)
    ]);
    let parsed: Partial<AppSettings> = {};

    try {
        parsed = rawSettings ? JSON.parse(rawSettings) as Partial<AppSettings> : {};
    } catch {
        parsed = {};
    }

    return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        initialized: initializedFlag === "true" || parsed.initialized === true,
        favoriteCanteenIds: Array.isArray(parsed.favoriteCanteenIds) ? parsed.favoriteCanteenIds : [],
        favoriteMeals: Array.isArray(parsed.favoriteMeals) ? parsed.favoriteMeals : [],
        theme: parsed.theme ?? "system",
        language: parsed.language === "en" ? "en" : "de",
        dietPreference: parsed.dietPreference ?? "none",
        maxStudentPrice: typeof parsed.maxStudentPrice === "number" ? parsed.maxStudentPrice : undefined,
        maxStaffPrice: typeof parsed.maxStaffPrice === "number" ? parsed.maxStaffPrice : undefined,
        maxGuestPrice: typeof parsed.maxGuestPrice === "number" ? parsed.maxGuestPrice : undefined,
        hideOverBudget: parsed.hideOverBudget === true,
        preferSustainableMeals: parsed.preferSustainableMeals !== false,
        preferLowCo2Meals: parsed.preferLowCo2Meals !== false,
        openFavoriteCanteenOnStart: parsed.openFavoriteCanteenOnStart === true,
        showTopMealFirst: parsed.showTopMealFirst !== false,
        loadWholeWeekMenus: parsed.loadWholeWeekMenus !== false,
        openOnlyCanteens: parsed.openOnlyCanteens === true,
        htwCanteensFirst: parsed.htwCanteensFirst !== false,
        startScreen: parsed.startScreen ?? "home",
        avoidedAdditiveKeywords: Array.isArray(parsed.avoidedAdditiveKeywords) ? parsed.avoidedAdditiveKeywords : [],
        canteenSearchHistory: Array.isArray(parsed.canteenSearchHistory) ? parsed.canteenSearchHistory : [],
        mealSearchHistory: Array.isArray(parsed.mealSearchHistory) ? parsed.mealSearchHistory : []
    };
}

async function writeSettings(settings: AppSettings): Promise<void> {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    await AsyncStorage.setItem(INITIALIZED_KEY, settings.initialized ? "true" : "false");
}

function resolveThemePreference(preference: ThemePreference, systemScheme: ColorSchemeName): "light" | "dark" {
    if (preference === "dark" || preference === "light") {
        return preference;
    }

    return systemScheme === "dark" ? "dark" : "light";
}

type SettingsContextValue = ReturnType<typeof useSettingsState>;

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function useSettingsState() {
    const systemScheme = useColorScheme();
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const storedSettings = await readSettings();
            settingsRef.current = storedSettings;
            setSettings(storedSettings);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    const updateSettings = useCallback(async (updater: (current: AppSettings) => AppSettings) => {
        const next = updater(settingsRef.current);
        settingsRef.current = next;
        setSettings(next);
        await writeSettings(next);
    }, []);

    const setInitialized = useCallback(async (initialized: boolean) => {
        await updateSettings((current) => ({ ...current, initialized }));
    }, [updateSettings]);

    const setFavoriteCanteen = useCallback(async (canteenId: string) => {
        await updateSettings((current) => ({
            ...current,
            favoriteCanteenId: canteenId,
            favoriteCanteenIds: Array.from(new Set([canteenId, ...current.favoriteCanteenIds]))
        }));
    }, [updateSettings]);

    const removeFavoriteCanteen = useCallback(async (canteenId: string) => {
        await updateSettings((current) => ({
            ...current,
            favoriteCanteenId: current.favoriteCanteenId === canteenId ? undefined : current.favoriteCanteenId,
            favoriteCanteenIds: current.favoriteCanteenIds.filter((id) => id !== canteenId)
        }));
    }, [updateSettings]);

    const toggleFavoriteMeal = useCallback(async (meal: FavoriteMeal) => {
        await updateSettings((current) => {
            const exists = current.favoriteMeals.some((favorite) => favorite.id === meal.id);

            return {
                ...current,
                favoriteMeals: exists
                    ? current.favoriteMeals.filter((favorite) => favorite.id !== meal.id)
                    : [meal, ...current.favoriteMeals]
            };
        });
    }, [updateSettings]);

    const removeFavoriteMeal = useCallback(async (mealId: string) => {
        await updateSettings((current) => ({
            ...current,
            favoriteMeals: current.favoriteMeals.filter((meal) => meal.id !== mealId)
        }));
    }, [updateSettings]);

    const setThemePreference = useCallback(async (theme: ThemePreference) => {
        await updateSettings((current) => ({ ...current, theme }));
    }, [updateSettings]);

    const setLanguagePreference = useCallback(async (language: LanguagePreference) => {
        await updateSettings((current) => ({ ...current, language }));
    }, [updateSettings]);

    const setDietPreference = useCallback(async (dietPreference: DietPreference) => {
        await updateSettings((current) => ({ ...current, dietPreference }));
    }, [updateSettings]);

    const setMaxStudentPrice = useCallback(async (maxStudentPrice: number | undefined) => {
        await updateSettings((current) => ({ ...current, maxStudentPrice }));
    }, [updateSettings]);

    const setMaxStaffPrice = useCallback(async (maxStaffPrice: number | undefined) => {
        await updateSettings((current) => ({ ...current, maxStaffPrice }));
    }, [updateSettings]);

    const setMaxGuestPrice = useCallback(async (maxGuestPrice: number | undefined) => {
        await updateSettings((current) => ({ ...current, maxGuestPrice }));
    }, [updateSettings]);

    const setStartScreen = useCallback(async (startScreen: StartScreenPreference) => {
        await updateSettings((current) => ({ ...current, startScreen }));
    }, [updateSettings]);

    const setBooleanPreference = useCallback(async (
        key: keyof Pick<
            AppSettings,
            | "hideOverBudget"
            | "preferSustainableMeals"
            | "preferLowCo2Meals"
            | "openFavoriteCanteenOnStart"
            | "showTopMealFirst"
            | "loadWholeWeekMenus"
            | "openOnlyCanteens"
            | "htwCanteensFirst"
        >,
        value: boolean
    ) => {
        await updateSettings((current) => ({ ...current, [key]: value }));
    }, [updateSettings]);

    const resetAppSettings = useCallback(async () => {
        await updateSettings((current) => ({
            ...DEFAULT_SETTINGS,
            initialized: current.initialized
        }));
    }, [updateSettings]);

    const toggleAvoidedAdditiveKeyword = useCallback(async (keyword: string) => {
        await updateSettings((current) => {
            const normalizedKeyword = keyword.trim();
            const exists = current.avoidedAdditiveKeywords.includes(normalizedKeyword);

            return {
                ...current,
                avoidedAdditiveKeywords: exists
                    ? current.avoidedAdditiveKeywords.filter((entry) => entry !== normalizedKeyword)
                    : [...current.avoidedAdditiveKeywords, normalizedKeyword]
            };
        });
    }, [updateSettings]);

    const rememberSearchQuery = useCallback(async (scope: SearchHistoryScope, query: string) => {
        const normalizedQuery = query.trim();

        if (normalizedQuery.length < 2) {
            return;
        }

        await updateSettings((current) => {
            const key = scope === "canteen" ? "canteenSearchHistory" : "mealSearchHistory";
            const history = current[key].filter((entry) => entry.toLowerCase() !== normalizedQuery.toLowerCase());

            return {
                ...current,
                [key]: [normalizedQuery, ...history].slice(0, 8)
            };
        });
    }, [updateSettings]);

    const clearSearchHistory = useCallback(async (scope: SearchHistoryScope) => {
        await updateSettings((current) => ({
            ...current,
            [scope === "canteen" ? "canteenSearchHistory" : "mealSearchHistory"]: []
        }));
    }, [updateSettings]);

    const activeScheme = useMemo(
        () => resolveThemePreference(settings.theme, systemScheme),
        [settings.theme, systemScheme]
    );

    return {
        settings,
        loading,
        activeScheme,
        reloadSettings: loadSettings,
        setInitialized,
        setFavoriteCanteen,
        removeFavoriteCanteen,
        toggleFavoriteMeal,
        removeFavoriteMeal,
        setThemePreference,
        setLanguagePreference,
        setDietPreference,
        setMaxStudentPrice,
        setMaxStaffPrice,
        setMaxGuestPrice,
        setStartScreen,
        setBooleanPreference,
        resetAppSettings,
        toggleAvoidedAdditiveKeyword,
        rememberSearchQuery,
        clearSearchHistory
    };
}

interface SettingsProviderProps {
    children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    const value = useSettingsState();

    return createElement(SettingsContext.Provider, { value }, children);
}

export function useSettings() {
    const context = useContext(SettingsContext);

    if (!context) {
        throw new Error("useSettings must be used inside SettingsProvider.");
    }

    return context;
}
