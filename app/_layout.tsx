import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ApiError, fetchAdditives, fetchBadges, fetchCanteens, fetchMenuRange, formatApiDate } from "@/constants/api";
import { Colors } from "@/constants/colors";
import {
    countAdditives,
    countBadges,
    countCachedMealPlans,
    countCanteens,
    countCanteensMissingDetails,
    getAllCanteens,
    initializeDatabase,
    saveAdditives,
    saveBadges,
    saveCanteens,
    saveMealPlan
} from "@/database/db";
import { INITIALIZED_KEY, SettingsProvider, useSettings } from "@/hooks/useSettings";

const DAILY_OFFLINE_SYNC_KEY = "campus-eats:last-daily-offline-sync";
const DAILY_MENU_CACHE_DAYS = 7;
const MENU_PREFETCH_BATCH_SIZE = 4;

function dateAfter(date: string, days: number): string {
    const nextDate = new Date(`${date}T12:00:00`);
    nextDate.setDate(nextDate.getDate() + days);
    return formatApiDate(nextDate);
}

function dateRange(startDate: string, days: number): string[] {
    return Array.from({ length: days }, (_, index) => dateAfter(startDate, index));
}

async function syncMenusForCanteen(canteenId: string, startDate: string, dates: string[]): Promise<boolean> {
    try {
        const menus = await fetchMenuRange(canteenId, startDate, dates[dates.length - 1]);
        const menusByDate = new Map(menus.map((menu) => [menu.date, menu.meals ?? []]));

        await Promise.all(
            dates.map((date) => saveMealPlan(canteenId, date, menusByDate.get(date) ?? []))
        );

        return true;
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            await Promise.all(dates.map((date) => saveMealPlan(canteenId, date, [])));
            return true;
        }

        return false;
    }
}

async function syncDailyOfflineData(): Promise<void> {
    const today = formatApiDate(new Date());
    const [lastSync, cachedMealPlanCount] = await Promise.all([
        AsyncStorage.getItem(DAILY_OFFLINE_SYNC_KEY),
        countCachedMealPlans()
    ]);

    if (lastSync === today && cachedMealPlanCount > 0) {
        return;
    }

    const [canteens, additives, badges] = await Promise.all([
        fetchCanteens(),
        fetchAdditives(),
        fetchBadges()
    ]);

    await saveCanteens(canteens);
    await saveAdditives(additives);
    await saveBadges(badges);

    const localCanteens = await getAllCanteens();
    const dates = dateRange(today, DAILY_MENU_CACHE_DAYS);
    let failedMenuSyncs = 0;

    for (let index = 0; index < localCanteens.length; index += MENU_PREFETCH_BATCH_SIZE) {
        const batch = localCanteens.slice(index, index + MENU_PREFETCH_BATCH_SIZE);
        const results = await Promise.all(
            batch.map((canteen) => syncMenusForCanteen(canteen.id, today, dates))
        );
        failedMenuSyncs += results.filter((synced) => !synced).length;
    }

    if (failedMenuSyncs === 0) {
        await AsyncStorage.setItem(DAILY_OFFLINE_SYNC_KEY, today);
    }
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <SettingsProvider>
                <BootstrappedLayout />
            </SettingsProvider>
        </SafeAreaProvider>
    );
}

function BootstrappedLayout() {
    const { activeScheme, loading: settingsLoading, setInitialized } = useSettings();
    const colors = Colors[activeScheme];
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [setupStep, setSetupStep] = useState("CampusEats wird vorbereitet...");

    const bootstrap = useCallback(async () => {
        setReady(false);
        setError(undefined);
        setSetupStep("Lokale Datenbank wird geöffnet...");

        try {
            await initializeDatabase();
            setSetupStep("Offline-Daten werden geprüft...");
            const [initializedFlag, localCount, missingDetails, additiveCount, badgeCount] = await Promise.all([
                AsyncStorage.getItem(INITIALIZED_KEY),
                countCanteens(),
                countCanteensMissingDetails(),
                countAdditives(),
                countBadges()
            ]);

            if (initializedFlag !== "true" || localCount === 0 || missingDetails > 0 || additiveCount === 0 || badgeCount === 0) {
                setSetupStep("Mensen, Badges und Zusatzstoffe werden geladen...");
                const [canteens, additives, badges] = await Promise.all([
                    fetchCanteens(),
                    fetchAdditives(),
                    fetchBadges()
                ]);
                setSetupStep("Offline-Daten werden gespeichert...");
                await saveCanteens(canteens);
                await saveAdditives(additives);
                await saveBadges(badges);
                await setInitialized(true);
            }

            setReady(true);
        } catch {
            const localCount = await countCanteens().catch(() => 0);

            if (localCount > 0) {
                setReady(true);
                return;
            }

            setError("Beim ersten Start müssen die Berliner Mensen einmal geladen werden. Bitte Internetverbindung prüfen.");
        }
    }, [setInitialized]);

    useEffect(() => {
        if (!settingsLoading) {
            void bootstrap();
        }
    }, [bootstrap, settingsLoading]);

    if (settingsLoading || !ready) {
        return (
            <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
                {error ? (
                    <ErrorMessage message={error} onRetry={bootstrap} retryLabel="Setup erneut starten" />
                ) : (
                    <LoadingSpinner label={setupStep} />
                )}
            </SafeAreaView>
        );
    }

    return (
        <>
            <DailyOfflineSync />
            <StatusBar style={activeScheme === "dark" ? "light" : "dark"} />
            <Stack
                screenOptions={{
                    contentStyle: { backgroundColor: colors.background },
                    headerStyle: { backgroundColor: colors.surface },
                    headerTintColor: colors.text,
                    headerTitleStyle: { fontWeight: "700" }
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="canteen/[id]" options={{ title: "Speiseplan" }} />
            </Stack>
        </>
    );
}

function DailyOfflineSync() {
    const runningRef = useRef(false);

    useEffect(() => {
        if (runningRef.current) {
            return;
        }

        runningRef.current = true;
        void syncDailyOfflineData()
            .catch(() => undefined)
            .finally(() => {
                runningRef.current = false;
            });
    }, []);

    return null;
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: "center"
    }
});