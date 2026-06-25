import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { CanteenCard } from "@/components/CanteenCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { OfflineNotice } from "@/components/OfflineNotice";
import { SkeletonList } from "@/components/SkeletonList";
import { Colors } from "@/constants/colors";
import { getCopy } from "@/constants/i18n";
import { getOpenStatusLabel, isCanteenOpenNow, smartCanteenScore } from "@/constants/openingHours";
import { Radius, Shadow, Spacing, Typography } from "@/constants/theme";
import { useCanteens } from "@/hooks/useCanteens";
import { formatDistance, useNearbyCanteens } from "@/hooks/useNearbyCanteens";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useSettings } from "@/hooks/useSettings";
import { Canteen, Meal } from "@/types/canteen";

const POPULAR_CANTEEN_SEARCHES = ["HTW", "Mitte", "BHT", "Charlottenburg", "Teltow"];

export default function CanteensScreen() {
    const [searchTerm, setSearchTerm] = useState("");
    const openedFavoriteOnStartRef = useRef(false);
    const { activeScheme, settings, rememberSearchQuery, clearSearchHistory } = useSettings();
    const colors = Colors[activeScheme];
    const copy = getCopy(settings.language);
    const { canteens, filteredCanteens, loading, refreshing, error, warning, reloadCanteens, syncCanteens } = useCanteens(searchTerm);
    const {
        nearestOpenCanteen,
        loading: locationLoading,
        error: locationError,
        hasLocation,
        requestLocation
    } = useNearbyCanteens(canteens);
    const favoriteCanteen = useMemo(
        () => canteens.find((canteen) => canteen.id === settings.favoriteCanteenId),
        [canteens, settings.favoriteCanteenId]
    );
    const smartCanteen = useMemo(
        () => [...canteens].sort(
            (left, right) => smartCanteenScore(right, settings.favoriteCanteenId) - smartCanteenScore(left, settings.favoriteCanteenId)
        )[0],
        [canteens, settings.favoriteCanteenId]
    );
    const { recommendations, loading: recommendationsLoading } = useRecommendations(
        settings.favoriteCanteenId,
        settings
    );
    const openCanteenCount = useMemo(
        () => canteens.filter((canteen) => isCanteenOpenNow(canteen)).length,
        [canteens]
    );

    useEffect(() => {
        if (!settings.openFavoriteCanteenOnStart || openedFavoriteOnStartRef.current || !favoriteCanteen) {
            return;
        }

        openedFavoriteOnStartRef.current = true;
        router.push(`/canteen/${favoriteCanteen.id}`);
    }, [favoriteCanteen, settings.openFavoriteCanteenOnStart]);

    const listData = useMemo(() => {
        const visibleCanteens = settings.openOnlyCanteens
            ? filteredCanteens.filter((canteen) => isCanteenOpenNow(canteen))
            : filteredCanteens;
        const sortedCanteens = settings.htwCanteensFirst === false
            ? visibleCanteens
            : [...visibleCanteens].sort((left, right) => Number(right.name.toLowerCase().includes("htw")) - Number(left.name.toLowerCase().includes("htw")));

        if (!favoriteCanteen) {
            return sortedCanteens;
        }

        return sortedCanteens.filter((canteen) => canteen.id !== favoriteCanteen.id);
    }, [favoriteCanteen, filteredCanteens, settings.htwCanteensFirst, settings.openOnlyCanteens]);

    function openCanteen(canteen: Canteen) {
        void rememberSearchQuery("canteen", searchTerm);
        router.push(`/canteen/${canteen.id}`);
    }

    function applySearchQuery(query: string) {
        setSearchTerm(query);
        void rememberSearchQuery("canteen", query);
    }

    function renderRecommendation(meal: Meal) {
        return (
            <View key={meal.ID ?? meal.id ?? meal.name} style={[styles.recommendationItem, { borderColor: colors.border }]}>
                <Text numberOfLines={1} style={[styles.recommendationName, { color: colors.text }]}>
                    {meal.name}
                </Text>
                <Text style={[styles.recommendationCategory, { color: colors.muted }]}>{meal.category}</Text>
            </View>
        );
    }

    function renderStat(value: string | number, label: string, icon: keyof typeof Ionicons.glyphMap) {
        return (
            <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.statIcon, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons color={colors.primary} name={icon} size={15} />
                </View>
                <View style={styles.statTextWrap}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                    <Text numberOfLines={1} style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
                </View>
            </View>
        );
    }

    const header = (
        <View>
            <View
                style={[
                    styles.hero,
                    { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }
                ]}
            >
                <View style={[styles.heroIcon, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons color={colors.primary} name="restaurant-outline" size={24} />
                </View>
                <View style={styles.heroText}>
                    <Text style={[styles.heroKicker, { color: colors.primary }]}>
                        {settings.language === "en" ? "Campus lunch planner" : "Campus Lunch Planner"}
                    </Text>
                    <Text style={[styles.appName, { color: colors.text }]}>CampusEats</Text>
                    <Text style={[styles.subtitle, { color: colors.muted }]}>
                        {canteens.length} {copy.canteensStored}
                    </Text>
                </View>
            </View>

            <OfflineNotice
                message={
                    settings.language === "en"
                        ? "Check your internet connection. Canteens and previously loaded menus remain available offline."
                        : "Bitte prüfe deine Internetverbindung. Mensen und bereits geladene Speisepläne bleiben offline verfügbar."
                }
            />

            {warning ? (
                <View style={[styles.warningBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.warning }]}>
                    <Ionicons color={colors.warning} name="alert-circle-outline" size={17} />
                    <View style={styles.warningTextWrap}>
                        <Text style={[styles.warningTitle, { color: colors.text }]}>{copy.refreshFailedTitle}</Text>
                        <Text style={[styles.warningText, { color: colors.muted }]}>{warning}</Text>
                    </View>
                </View>
            ) : null}

            <View style={styles.statsRow}>
                {renderStat(openCanteenCount, settings.language === "en" ? "open now" : "jetzt offen", "time-outline")}
                {renderStat(settings.favoriteCanteenIds.length, copy.favorites, "heart-outline")}
                {renderStat(filteredCanteens.length, copy.searchResults, "search-outline")}
            </View>

            <TextInput
                autoCapitalize="none"
                onSubmitEditing={() => void rememberSearchQuery("canteen", searchTerm)}
                placeholder={copy.canteenSearchPlaceholder}
                placeholderTextColor={colors.muted}
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={[
                    styles.search,
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
                ]}
            />
            <View style={styles.chipBlock}>
                <View style={styles.chipHeaderRow}>
                    <Text style={[styles.chipTitle, { color: colors.text }]}>{copy.popular}</Text>
                </View>
                <View style={styles.searchChips}>
                    {POPULAR_CANTEEN_SEARCHES.map((query) => (
                        <Pressable
                            key={query}
                            accessibilityRole="button"
                            onPress={() => applySearchQuery(query)}
                            style={[styles.searchChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                        >
                            <Text style={[styles.searchChipText, { color: colors.text }]}>{query}</Text>
                        </Pressable>
                    ))}
                </View>
                {settings.canteenSearchHistory.length > 0 ? (
                    <>
                        <View style={styles.chipHeaderRow}>
                            <Text style={[styles.chipTitle, { color: colors.text }]}>{copy.history}</Text>
                            <Pressable accessibilityRole="button" onPress={() => void clearSearchHistory("canteen")}>
                                <Text style={[styles.clearHistory, { color: colors.primary }]}>{copy.clearHistory}</Text>
                            </Pressable>
                        </View>
                        <View style={styles.searchChips}>
                            {settings.canteenSearchHistory.map((query) => (
                                <Pressable
                                    key={query}
                                    accessibilityRole="button"
                                    onPress={() => setSearchTerm(query)}
                                    style={[styles.searchChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                >
                                    <Ionicons color={colors.primary} name="time-outline" size={13} />
                                    <Text style={[styles.searchChipText, { color: colors.text }]}>{query}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </>
                ) : null}
            </View>

            {smartCanteen ? (
                <View
                    style={[
                        styles.aiBanner,
                        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }
                    ]}
                >
                    <View style={styles.kickerRow}>
                        <Ionicons color={colors.primary} name="sparkles-outline" size={14} />
                        <Text style={[styles.aiKicker, { color: colors.primary }]}>{copy.smartBreakPlan}</Text>
                    </View>
                    <Text style={[styles.aiTitle, { color: colors.text }]}>{smartCanteen.name}</Text>
                    <Text style={[styles.aiText, { color: colors.muted }]}>
                        {getOpenStatusLabel(smartCanteen, new Date(), settings.language)}.
                    </Text>
                </View>
            ) : null}

            <View
                style={[
                    styles.locationBanner,
                    { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }
                ]}
            >
                <View style={styles.kickerRow}>
                    <Ionicons color={colors.primary} name="navigate-outline" size={14} />
                    <Text style={[styles.aiKicker, { color: colors.primary }]}>{copy.nearby}</Text>
                </View>
                {nearestOpenCanteen ? (
                    <>
                        <Text style={[styles.aiTitle, { color: colors.text }]}>{nearestOpenCanteen.canteen.name}</Text>
                        <Text style={[styles.aiText, { color: colors.muted }]}>
                            {formatDistance(nearestOpenCanteen.distanceMeters)} · {getOpenStatusLabel(nearestOpenCanteen.canteen, new Date(), settings.language)}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => openCanteen(nearestOpenCanteen.canteen)}
                            style={[styles.locationButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.locationButtonText}>{copy.openCanteen}</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <Text style={[styles.aiText, { color: colors.muted }]}>
                            {locationError ?? copy.locationPermissionHint}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            disabled={locationLoading}
                            onPress={requestLocation}
                            style={[styles.locationButton, { backgroundColor: colors.primary, opacity: locationLoading ? 0.7 : 1 }]}
                        >
                            <Text style={styles.locationButtonText}>
                                {locationLoading ? copy.loadingLocation : hasLocation ? copy.locationRefresh : copy.locationUse}
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>

            {favoriteCanteen ? (
                <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {settings.language === "en" ? "Favorite canteen" : "Lieblings-Mensa"}
                    </Text>
                    <CanteenCard canteen={favoriteCanteen} isFavorite onPress={() => openCanteen(favoriteCanteen)} />
                </View>
            ) : null}

            <View style={[styles.recommendationBanner, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{copy.forYou}</Text>
                {recommendationsLoading ? (
                    <Text style={[styles.bannerText, { color: colors.muted }]}>
                        {settings.language === "en" ? "Finding matching meals..." : "Suche passende Gerichte..."}
                    </Text>
                ) : recommendations.length > 0 ? (
                    recommendations.map(renderRecommendation)
                ) : (
                    <Text style={[styles.bannerText, { color: colors.muted }]}>
                        {copy.noRecommendations}
                    </Text>
                )}
            </View>

            <Text style={[styles.sectionTitle, styles.allTitle, { color: colors.text }]}>{copy.allCanteens}</Text>
        </View>
    );

    if (loading) {
        return <SkeletonList kind="canteen" count={5} />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={reloadCanteens} />;
    }

    return (
        <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={header}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
                        <Ionicons color={colors.primary} name="search-outline" size={26} />
                    </View>
                    <Text style={[styles.emptyText, { color: colors.muted }]}>{copy.emptyCanteenSearch}</Text>
                </View>
            }
            renderItem={({ item }) => (
                <CanteenCard
                    canteen={item}
                    isFavorite={settings.favoriteCanteenIds.includes(item.id)}
                    onPress={() => openCanteen(item)}
                />
            )}
            contentContainerStyle={[styles.listContent, { backgroundColor: colors.background }]}
            refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={syncCanteens} />}
            keyboardShouldPersistTaps="handled"
        />
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: Spacing.xl
    },
    hero: {
        ...Shadow.card,
        alignItems: "center",
        borderRadius: Radius.md,
        borderWidth: 1,
        flexDirection: "row",
        gap: Spacing.md,
        margin: Spacing.lg,
        padding: Spacing.lg
    },
    heroIcon: {
        alignItems: "center",
        borderRadius: Radius.md,
        height: 54,
        justifyContent: "center",
        width: 54
    },
    heroText: {
        flex: 1,
        minWidth: 0
    },
    heroKicker: {
        fontSize: Typography.kicker,
        fontWeight: "900",
        marginBottom: 4,
        textTransform: "uppercase"
    },
    appName: {
        fontSize: 30,
        fontWeight: "800"
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 21,
        marginTop: 6
    },
    search: {
        borderRadius: Radius.md,
        borderWidth: 1,
        fontSize: 16,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md
    },
    chipBlock: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg
    },
    chipHeaderRow: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: Spacing.sm
    },
    chipTitle: {
        fontSize: 13,
        fontWeight: "800"
    },
    clearHistory: {
        fontSize: 12,
        fontWeight: "800"
    },
    searchChips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
        marginTop: Spacing.sm
    },
    searchChip: {
        alignItems: "center",
        borderRadius: Radius.md,
        borderWidth: 1,
        flexDirection: "row",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7
    },
    searchChipText: {
        fontSize: 13,
        fontWeight: "800"
    },
    statsRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md
    },
    statPill: {
        alignItems: "center",
        borderRadius: Radius.md,
        borderWidth: 1,
        flexDirection: "row",
        flex: 1,
        gap: 8,
        minWidth: 0,
        paddingHorizontal: 10,
        paddingVertical: 10
    },
    statIcon: {
        alignItems: "center",
        borderRadius: Radius.sm,
        height: 28,
        justifyContent: "center",
        width: 28
    },
    statTextWrap: {
        flex: 1,
        minWidth: 0
    },
    statValue: {
        fontSize: 18,
        fontWeight: "900"
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "700",
        marginTop: 2
    },
    aiBanner: {
        ...Shadow.card,
        borderRadius: Radius.md,
        borderWidth: 1,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        padding: Spacing.lg
    },
    locationBanner: {
        ...Shadow.card,
        borderRadius: Radius.md,
        borderWidth: 1,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        padding: Spacing.lg
    },
    locationButton: {
        alignItems: "center",
        borderRadius: Radius.md,
        marginTop: Spacing.md,
        paddingVertical: 11
    },
    locationButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "800"
    },
    aiKicker: {
        fontSize: Typography.kicker,
        fontWeight: "900",
        textTransform: "uppercase"
    },
    kickerRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 5,
        marginBottom: 6
    },
    aiTitle: {
        fontSize: 18,
        fontWeight: "800",
        lineHeight: 23
    },
    aiText: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8
    },
    sectionBlock: {
        marginBottom: 8
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: Spacing.sm,
        marginHorizontal: Spacing.lg
    },
    allTitle: {
        marginTop: 8
    },
    recommendationBanner: {
        borderRadius: Radius.md,
        margin: Spacing.lg,
        padding: Spacing.lg
    },
    bannerText: {
        fontSize: 15,
        lineHeight: 21
    },
    warningBanner: {
        alignItems: "flex-start",
        borderRadius: Radius.md,
        borderWidth: 1,
        flexDirection: "row",
        gap: 10,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        padding: Spacing.md
    },
    warningTextWrap: {
        flex: 1,
        minWidth: 0
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: "800"
    },
    warningText: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4
    },
    recommendationItem: {
        borderTopWidth: 1,
        paddingVertical: 10
    },
    recommendationName: {
        fontSize: 15,
        fontWeight: "700"
    },
    recommendationCategory: {
        fontSize: 13,
        marginTop: 3
    },
    empty: {
        alignItems: "center",
        padding: Spacing.xl
    },
    emptyIcon: {
        alignItems: "center",
        borderRadius: Radius.md,
        height: 48,
        justifyContent: "center",
        marginBottom: Spacing.md,
        width: 48
    },
    emptyText: {
        fontSize: 15,
        textAlign: "center"
    }
});
