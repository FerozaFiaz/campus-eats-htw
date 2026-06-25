import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getCanteenImage } from "@/constants/canteenImages";
import { Colors } from "@/constants/colors";
import { getOpenStatusLabel, isCanteenOpenNow } from "@/constants/openingHours";
import { Radius, Shadow, Spacing, Typography } from "@/constants/theme";
import { useSettings } from "@/hooks/useSettings";
import { Canteen } from "@/types/canteen";

interface CanteenCardProps {
    canteen: Canteen;
    isFavorite?: boolean;
    onPress: () => void;
}

export function CanteenCard({ canteen, isFavorite = false, onPress }: CanteenCardProps) {
    const { activeScheme, settings } = useSettings();
    const colors = Colors[activeScheme];
    const addressLine = [canteen.address, canteen.zipcode, canteen.city].filter(Boolean).join(", ");
    const isOpen = isCanteenOpenNow(canteen);
    const image = useMemo(() => getCanteenImage(canteen), [canteen]);
    const [imageFailed, setImageFailed] = useState(false);
    const fallbackLetter = canteen.name.replace(/^mensa\s+/i, "").trim().charAt(0).toUpperCase() || "M";

    useEffect(() => {
        setImageFailed(false);
    }, [image.uri]);

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                {
                    backgroundColor: colors.surface,
                    borderColor: isFavorite ? colors.primary : colors.border,
                    opacity: pressed ? 0.86 : 1,
                    shadowColor: colors.shadow
                }
            ]}
        >
            <View style={[styles.accent, { backgroundColor: isOpen ? colors.primary : colors.border }]} />
            <View style={[styles.imageWrap, { backgroundColor: image.backgroundColor }]}>
                <Text style={styles.imageFallbackText}>{fallbackLetter}</Text>
                {!imageFailed ? (
                    <Image
                        cachePolicy="disk"
                        contentFit="cover"
                        onError={() => setImageFailed(true)}
                        source={{ uri: image.uri }}
                        style={styles.image}
                        transition={180}
                    />
                ) : null}
                <View style={styles.imageShade} />
            </View>
            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text numberOfLines={2} style={[styles.name, { color: colors.text }]}>
                        {canteen.name}
                    </Text>
                    {isFavorite ? <Ionicons color={colors.primary} name="star" size={18} /> : null}
                </View>
                <Text numberOfLines={2} style={[styles.address, { color: colors.muted }]}>
                    {addressLine}
                </Text>
                <View
                    style={[
                        styles.statusPill,
                        {
                            backgroundColor: isOpen ? colors.surfaceAlt : "transparent",
                            borderColor: isOpen ? colors.primary : colors.border
                        }
                    ]}
                >
                    <Ionicons
                        color={isOpen ? colors.primary : colors.muted}
                        name={isOpen ? "time" : "time-outline"}
                        size={13}
                    />
                    <Text style={[styles.statusText, { color: isOpen ? colors.primary : colors.muted }]}>
                        {getOpenStatusLabel(canteen, new Date(), settings.language)}
                    </Text>
                </View>
                {canteen.district ? (
                    <Text numberOfLines={1} style={[styles.district, { color: colors.muted }]}>
                        {canteen.district}
                    </Text>
                ) : null}
                <View style={styles.metaRow}>
                    {canteen.universities[0] ? (
                        <View style={[styles.metaPill, { backgroundColor: colors.surfaceAlt }]}>
                            <Ionicons color={colors.muted} name="school-outline" size={12} />
                            <Text numberOfLines={1} style={[styles.metaText, { color: colors.muted }]}>
                                {canteen.universities[0]}
                            </Text>
                        </View>
                    ) : null}
                    {canteen.averageRating ? (
                        <View style={[styles.metaPill, { backgroundColor: colors.surfaceAlt }]}>
                            <Ionicons color={colors.warning} name="star" size={12} />
                            <Text style={[styles.metaText, { color: colors.muted }]}>
                                {canteen.averageRating.toFixed(1)} / 5
                            </Text>
                        </View>
                    ) : null}
                    {canteen.clickAndCollect ? (
                        <View style={[styles.metaPill, { backgroundColor: colors.surfaceAlt }]}>
                            <Ionicons color={colors.primary} name="bag-handle-outline" size={12} />
                            <Text style={[styles.metaText, { color: colors.primary }]}>Click&Collect</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        ...Shadow.card,
        borderRadius: Radius.md,
        borderWidth: 1,
        flexDirection: "row",
        marginHorizontal: Spacing.lg,
        marginVertical: Spacing.sm,
        overflow: "hidden",
        padding: Spacing.lg
    },
    accent: {
        bottom: 0,
        left: 0,
        position: "absolute",
        top: 0,
        width: 4
    },
    imageWrap: {
        alignItems: "center",
        borderRadius: Radius.md,
        height: 72,
        justifyContent: "center",
        marginRight: Spacing.md,
        overflow: "hidden",
        width: 72
    },
    image: {
        ...StyleSheet.absoluteFillObject,
        height: "100%",
        width: "100%"
    },
    imageFallbackText: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "800"
    },
    imageShade: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.08)"
    },
    content: {
        flex: 1
    },
    titleRow: {
        alignItems: "flex-start",
        flexDirection: "row",
        gap: Spacing.sm
    },
    name: {
        flex: 1,
        fontSize: 17,
        fontWeight: "700",
        lineHeight: 22
    },
    address: {
        fontSize: 14,
        lineHeight: 19,
        marginTop: Spacing.sm
    },
    statusPill: {
        alignItems: "center",
        alignSelf: "flex-start",
        borderRadius: Radius.md,
        borderWidth: 1,
        flexDirection: "row",
        gap: 5,
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 6
    },
    statusText: {
        fontSize: Typography.kicker,
        fontWeight: "800"
    },
    district: {
        fontSize: Typography.caption,
        marginTop: Spacing.xs
    },
    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
        marginTop: Spacing.sm
    },
    metaText: {
        fontSize: Typography.kicker,
        fontWeight: "700"
    },
    metaPill: {
        alignItems: "center",
        borderRadius: Radius.sm,
        flexDirection: "row",
        gap: 4,
        maxWidth: "100%",
        paddingHorizontal: 8,
        paddingVertical: 5
    }
});
