import { ColorSchemeName } from "react-native";

export const HTW_GREEN = "#6BAD2A";

export const Colors = {
    light: {
        primary: HTW_GREEN,
        background: "#F6F8F4",
        surface: "#FFFFFF",
        surfaceAlt: "#ECF4E7",
        text: "#1C1C1E",
        muted: "#626A60",
        border: "#DCE6D6",
        danger: "#C62828",
        warning: "#F6A609",
        shadow: "#000000"
    },
    dark: {
        primary: HTW_GREEN,
        background: "#0F1410",
        surface: "#1A211B",
        surfaceAlt: "#263321",
        text: "#FFFFFF",
        muted: "#C3D0BD",
        border: "#3D4A38",
        danger: "#FF6B6B",
        warning: "#FFD166",
        shadow: "#000000"
    }
};

export type AppColorScheme = keyof typeof Colors;

export function resolveScheme(scheme: ColorSchemeName): AppColorScheme {
    return scheme === "dark" ? "dark" : "light";
}
