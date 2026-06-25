import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { getCopy } from "@/constants/i18n";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import { useSettings } from "@/hooks/useSettings";

interface ErrorMessageProps {
    title?: string;
    message: string;
    retryLabel?: string;
    onRetry?: () => void;
}

export function ErrorMessage({
                                 title,
                                 message,
                                 retryLabel,
                                 onRetry
                             }: ErrorMessageProps) {
    const { activeScheme, settings } = useSettings();
    const colors = Colors[activeScheme];
    const copy = getCopy(settings.language);

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }
            ]}
        >
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons color={colors.danger} name="alert-circle-outline" size={28} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title ?? copy.unknownError}</Text>
            <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
            {onRetry ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={({ pressed }) => [
                        styles.button,
                        { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }
                    ]}
                >
                    <Ionicons color="#FFFFFF" name="refresh-outline" size={16} />
                    <Text style={styles.buttonText}>{retryLabel ?? copy.retry}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...Shadow.card,
        alignItems: "center",
        borderRadius: Radius.md,
        borderWidth: 1,
        margin: Spacing.lg,
        padding: Spacing.lg
    },
    iconWrap: {
        alignItems: "center",
        borderRadius: Radius.md,
        height: 54,
        justifyContent: "center",
        marginBottom: Spacing.md,
        width: 54
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8
    },
    message: {
        fontSize: 15,
        lineHeight: 21,
        textAlign: "center"
    },
    button: {
        alignItems: "center",
        borderRadius: Radius.md,
        flexDirection: "row",
        gap: 6,
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700"
    }
});
