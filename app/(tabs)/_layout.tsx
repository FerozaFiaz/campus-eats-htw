import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { getCopy } from "@/constants/i18n";
import { Radius } from "@/constants/theme";
import { useSettings } from "@/hooks/useSettings";

export default function TabLayout() {
    const { activeScheme, settings } = useSettings();
    const colors = Colors[activeScheme];
    const copy = getCopy(settings.language);
    const initialRouteName = settings.startScreen === "favorites"
        ? "favorites"
        : settings.startScreen === "settings"
            ? "settings"
            : "index";
    const renderIcon = (
        color: string,
        focused: boolean,
        activeName: keyof typeof Ionicons.glyphMap,
        inactiveName: keyof typeof Ionicons.glyphMap
    ) => (
        <View style={[styles.iconWrap, { backgroundColor: focused ? colors.surfaceAlt : "transparent" }]}>
            <Ionicons name={focused ? activeName : inactiveName} size={22} color={color} />
        </View>
    );

    return (
        <Tabs
            initialRouteName={initialRouteName}
            screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: "700" },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.muted,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "700",
                    marginTop: 2
                },
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 72,
                    paddingBottom: 10,
                    paddingTop: 8
                },
                tabBarItemStyle: {
                    borderRadius: 8,
                    marginHorizontal: 3
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: settings.language === "en" ? "Canteens" : "Mensen",
                    tabBarLabel: settings.language === "en" ? "Canteens" : "Mensen",
                    tabBarIcon: ({ color, focused }) => renderIcon(color, focused, "restaurant", "restaurant-outline")
                }}
            />
            <Tabs.Screen
                name="favorites"
                options={{
                    title: copy.favorites,
                    tabBarLabel: copy.favorites,
                    tabBarIcon: ({ color, focused }) => renderIcon(color, focused, "heart", "heart-outline")
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: settings.language === "en" ? "Settings" : "Einstellungen",
                    tabBarLabel: settings.language === "en" ? "Settings" : "Einstellungen",
                    tabBarIcon: ({ color, focused }) => renderIcon(color, focused, "settings", "settings-outline")
                }}
            />
            <Tabs.Screen name="project" options={{ href: null }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconWrap: {
        alignItems: "center",
        borderRadius: Radius.md,
        height: 34,
        justifyContent: "center",
        width: 48
    }
});
