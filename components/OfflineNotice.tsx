import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { getCopy } from "@/constants/i18n";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSettings } from "@/hooks/useSettings";

interface OfflineNoticeProps {
    message?: string;
}

export function OfflineNotice({ message }: OfflineNoticeProps) {
    const { activeScheme, settings } = useSettings();
    const { isOnline } = useNetworkStatus();
    const colors = Colors[activeScheme];
    const copy = getCopy(settings.language);

    if (isOnline) {
        return null;
    }

    return (
        <View style={[styles.notice, { backgroundColor: colors.surfaceAlt, borderColor: colors.warning }]}>
            <Text style={[styles.title, { color: colors.text }]}>{copy.noInternet}</Text>
            <Text style={[styles.message, { color: colors.muted }]}>{message ?? copy.offlineDefault}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    notice: {
        borderRadius: 8,
        borderWidth: 1,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12
    },
    title: {
        fontSize: 14,
        fontWeight: "800"
    },
    message: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4
    }
});
