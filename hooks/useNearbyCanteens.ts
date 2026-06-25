import * as Location from "expo-location";
import { useCallback, useMemo, useState } from "react";

import { isCanteenOpenNow } from "@/constants/openingHours";
import { Canteen } from "@/types/canteen";

interface NearbyCanteen {
    canteen: Canteen;
    distanceMeters: number;
}

function distanceMeters(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
): number {
    const earthRadiusMeters = 6371000;
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;
    const deltaLat = (to.latitude - from.latitude) * Math.PI / 180;
    const deltaLon = (to.longitude - from.longitude) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
}

export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }

    return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

export function useNearbyCanteens(canteens: Canteen[]) {
    const [location, setLocation] = useState<Location.LocationObjectCoords | undefined>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const requestLocation = useCallback(async () => {
        setLoading(true);
        setError(undefined);

        try {
            const permission = await Location.requestForegroundPermissionsAsync();

            if (permission.status !== "granted") {
                setError("Standortfreigabe wurde nicht erteilt.");
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });
            setLocation(currentLocation.coords);
        } catch {
            setError("Standort konnte gerade nicht bestimmt werden.");
        } finally {
            setLoading(false);
        }
    }, []);

    const nearbyCanteens = useMemo<NearbyCanteen[]>(() => {
        if (!location) {
            return [];
        }

        return canteens
            .filter((canteen) => typeof canteen.latitude === "number" && typeof canteen.longitude === "number")
            .map((canteen) => ({
                canteen,
                distanceMeters: distanceMeters(location, {
                    latitude: canteen.latitude ?? 0,
                    longitude: canteen.longitude ?? 0
                })
            }))
            .sort((left, right) => {
                const openScore = Number(isCanteenOpenNow(right.canteen)) - Number(isCanteenOpenNow(left.canteen));
                return openScore || left.distanceMeters - right.distanceMeters;
            });
    }, [canteens, location]);

    return {
        nearbyCanteens,
        nearestOpenCanteen: nearbyCanteens.find((entry) => isCanteenOpenNow(entry.canteen)) ?? nearbyCanteens[0],
        loading,
        error,
        hasLocation: Boolean(location),
        requestLocation
    };
}
