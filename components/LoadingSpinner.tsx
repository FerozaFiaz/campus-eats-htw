import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { getCopy } from "@/constants/i18n";
import { useSettings } from "@/hooks/useSettings";

interface LoadingSpinnerProps {
    label?: string;
}

export function LoadingSpinner({ label }: LoadingSpinnerProps) {
    const { activeScheme, settings } = useSettings();
    const colors = Colors[activeScheme];
    const copy = getCopy(settings.language);

    return (
        <View style={styles.container}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.label, { color: colors.muted }]}>{label ?? copy.loading}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        padding: 24
    },
    label: {
        fontSize: 15,
        marginTop: 12
    }
});