import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchCanteens } from "@/constants/api";
import { getAllCanteens, saveCanteens } from "@/database/db";
import { Canteen } from "@/types/canteen";

const OFFLINE_CONNECTION_MESSAGE = "Keine Internetverbindung. Bitte prüfe deine Internetverbindung.";

async function assertOnline(): Promise<void> {
    const state = await NetInfo.fetch();

    if (!Boolean(state.isConnected) || state.isInternetReachable === false) {
        throw new Error(OFFLINE_CONNECTION_MESSAGE);
    }
}

export function useCanteens(searchTerm = "") {
    const [canteens, setCanteens] = useState<Canteen[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [warning, setWarning] = useState<string | undefined>();
    const requestIdRef = useRef(0);

    const loadCanteens = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(undefined);
        setWarning(undefined);
        try {
            const localCanteens = await getAllCanteens();
            if (requestId === requestIdRef.current) {
                setCanteens(localCanteens);
            }
        } catch (loadError) {
            if (requestId === requestIdRef.current) {
                setError(loadError instanceof Error ? loadError.message : "Die lokalen Mensen konnten nicht geladen werden.");
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadCanteens();
    }, [loadCanteens]);

    const syncCanteens = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        setRefreshing(true);
        setError(undefined);
        setWarning(undefined);

        try {
            await assertOnline();
            const remoteCanteens = await fetchCanteens();
            await saveCanteens(remoteCanteens);
            const localCanteens = await getAllCanteens();
            if (requestId === requestIdRef.current) {
                setCanteens(localCanteens);
            }
        } catch (syncError) {
            if (requestId === requestIdRef.current) {
                const message = syncError instanceof Error ? syncError.message : "Die Mensen konnten nicht aktualisiert werden.";
                const localCanteens = await getAllCanteens().catch(() => []);

                if (requestId !== requestIdRef.current) {
                    return;
                }

                if (localCanteens.length > 0) {
                    setCanteens(localCanteens);
                    setWarning(`${message} Gespeicherte Mensa-Daten werden weiter verwendet.`);
                    setError(undefined);
                } else {
                    setError(message);
                }
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    const filteredCanteens = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        if (!query) {
            return canteens;
        }

        return canteens.filter((canteen) => {
            const searchable = `${canteen.name} ${canteen.address} ${canteen.city} ${canteen.district ?? ""}`.toLowerCase();
            return searchable.includes(query);
        });
    }, [canteens, searchTerm]);

    return {
        canteens,
        filteredCanteens,
        loading,
        refreshing,
        error,
        warning,
        reloadCanteens: loadCanteens,
        syncCanteens
    };
}