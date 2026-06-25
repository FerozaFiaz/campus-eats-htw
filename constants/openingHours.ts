import { BusinessDay, BusinessHour, Canteen, LanguagePreference } from "@/types/canteen";

const WEEKDAY_KEYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function minutesFromTime(value: string): number {
    const [hours, minutes] = value.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
}

function hoursForDay(day: BusinessDay): BusinessHour[] {
    return day.businessHours ?? day.businesshours ?? [];
}

function todayKey(date = new Date()): string {
    return WEEKDAY_KEYS[date.getDay()];
}

export function getTodayOpeningHours(canteen: Canteen, date = new Date()): BusinessHour[] {
    const day = canteen.businessDays.find((entry) => entry.day === todayKey(date));
    const hours = day ? hoursForDay(day) : [];
    const lunchHours = hours.filter((hour) => hour.businessHourType === "Mittagstisch");

    return lunchHours.length > 0 ? lunchHours : hours.filter((hour) => hour.businessHourType === "Mensa");
}

export function getOpeningSummary(canteen: Canteen, date = new Date(), language: LanguagePreference = "de"): string {
    const hours = getTodayOpeningHours(canteen, date);

    if (hours.length === 0) {
        return language === "en" ? "No opening hours saved today" : "Heute keine Öffnungszeiten hinterlegt";
    }

    return hours.map((hour) => `${hour.openAt}-${hour.closeAt}`).join(", ");
}

export function getDetailedOpeningSummary(canteen: Canteen, date = new Date(), language: LanguagePreference = "de"): string {
    const day = canteen.businessDays.find((entry) => entry.day === todayKey(date));
    const hours = day ? hoursForDay(day) : [];

    if (hours.length === 0) {
        return language === "en" ? "No opening hours saved today" : "Heute keine Öffnungszeiten hinterlegt";
    }

    const grouped = hours.reduce<Record<string, string[]>>((result, hour) => {
        const type = hour.businessHourType || (language === "en" ? "Opening" : "Öffnung");
        result[type] = [...(result[type] ?? []), `${hour.openAt}-${hour.closeAt}`];
        return result;
    }, {});

    return Object.entries(grouped)
        .map(([type, ranges]) => `${type}: ${ranges.join(", ")}`)
        .join(" · ");
}

export function isCanteenOpenNow(canteen: Canteen, date = new Date()): boolean {
    const now = date.getHours() * 60 + date.getMinutes();

    return getTodayOpeningHours(canteen, date).some((hour) => {
        const openAt = minutesFromTime(hour.openAt);
        const closeAt = minutesFromTime(hour.closeAt);
        return now >= openAt && now <= closeAt;
    });
}

export function getOpenStatusLabel(canteen: Canteen, date = new Date(), language: LanguagePreference = "de"): string {
    if (isCanteenOpenNow(canteen, date)) {
        return `${language === "en" ? "Open now" : "Jetzt geöffnet"} · ${getOpeningSummary(canteen, date, language)}`;
    }

    return `${language === "en" ? "Today" : "Heute"}: ${getOpeningSummary(canteen, date, language)}`;
}

export function buildMapsUrl(canteen: Canteen): string {
    if (typeof canteen.latitude === "number" && typeof canteen.longitude === "number") {
        return `https://www.google.com/maps/search/?api=1&query=${canteen.latitude},${canteen.longitude}`;
    }

    const query = encodeURIComponent(`${canteen.name} ${canteen.address} ${canteen.city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function smartCanteenScore(canteen: Canteen, favoriteCanteenId?: string): number {
    let score = 0;

    if (canteen.id === favoriteCanteenId) {
        score += 5;
    }

    if (isCanteenOpenNow(canteen)) {
        score += 4;
    }

    if (canteen.name.toLowerCase().includes("htw")) {
        score += 2;
    }

    return score;
}