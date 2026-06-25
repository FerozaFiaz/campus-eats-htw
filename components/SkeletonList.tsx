import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import { useSettings } from "@/hooks/useSettings";

interface SkeletonListProps {
    kind?: "canteen" | "meal";
    count?: number;
}

export function SkeletonList({ kind = "canteen", count = 4 }: SkeletonListProps) {
    const { activeScheme } = useSettings();
    const colors = Colors[activeScheme];
    const rows = Array.from({ length: count }, (_, index) => index);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {rows.map((row) => (
                <View
                    key={row}
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            shadowColor: colors.shadow
                        }
                    ]}
                >
                    {kind === "canteen" ? <View style={[styles.image, { backgroundColor: colors.surfaceAlt }]} /> : null}
                    <View style={styles.content}>
                        <View style={[styles.lineWide, { backgroundColor: colors.surfaceAlt }]} />
                        <View style={[styles.lineMedium, { backgroundColor: colors.surfaceAlt }]} />
                        <View style={styles.footerRow}>
                            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]} />
                            <View style={[styles.pillSmall, { backgroundColor: colors.surfaceAlt }]} />
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Spacing.lg
    },
    card: {
        ...Shadow.card,
        borderRadius: Radius.md,
        borderWidth: 1,
        flexDirection: "row",
        marginHorizontal: Spacing.lg,
        marginVertical: Spacing.sm,
        padding: Spacing.lg
    },
    image: {
        borderRadius: Radius.md,
        height: 72,
        marginRight: Spacing.md,
        width: 72
    },
    content: {
        flex: 1,
        justifyContent: "center"
    },
    lineWide: {
        borderRadius: Radius.sm,
        height: 16,
        width: "78%"
    },
    lineMedium: {
        borderRadius: Radius.sm,
        height: 12,
        marginTop: Spacing.md,
        width: "58%"
    },
    footerRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginTop: Spacing.md
    },
    pill: {
        borderRadius: Radius.md,
        height: 24,
        width: 92
    },
    pillSmall: {
        borderRadius: Radius.md,
        height: 24,
        width: 58
    }
});
