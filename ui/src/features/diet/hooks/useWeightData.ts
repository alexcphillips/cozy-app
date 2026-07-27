import { useState, useEffect, useMemo } from "react";
import type { WeightEntry } from "@cozy/shared";
import { toErrorMessage } from "../../../lib/api";
import { stringIsOnlyNumberOrFloat } from "../../../utils/stringIsOnlyNumberOrFloat";
import { dietApi } from "../api/diet.api";

/**
 * Owns the weight-entry list plus everything derived from it. Pages render the
 * result; they never fetch weight data themselves.
 */
export function useWeightData() {
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [weightEntryValue, setWeightEntryValue] = useState("");
    const [weightEntryError, setWeightEntryError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function loadEntries() {
            try {
                setWeightEntries(await dietApi.listWeightEntries());
            } catch (err) {
                setWeightEntryError(toErrorMessage(err));
            }
        }
        loadEntries();
    }, []);

    const computedChartData = useMemo(() => {
        if (weightEntries.length === 0)
            return { labels: [], values: [], max: 0, min: 0 };
        const chronological = [...weightEntries].sort(
            (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
        );
        const values = chronological.map((e) => e.weight);
        return {
            labels: chronological.map((e) =>
                new Date(e.created_at).toLocaleDateString("en-US"),
            ),
            values,
            max: Math.max(...values),
            min: Math.min(...values),
        };
    }, [weightEntries]);

    const progressThisMonth = useMemo(() => {
        const now = new Date();
        const currentMonth = weightEntries.filter((e) => {
            const d = new Date(e.created_at);
            return (
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
            );
        });
        // Entries are newest-first, so this is (latest - earliest) for the month.
        const latest = currentMonth[0];
        const earliest = currentMonth[currentMonth.length - 1];

        if (!latest || !earliest) return 0;

        return latest.weight - earliest.weight;
    }, [weightEntries]);

    async function handleAddEntry(e: React.SyntheticEvent) {
        e.preventDefault();
        setWeightEntryError("");
        if (!stringIsOnlyNumberOrFloat(weightEntryValue)) {
            setWeightEntryError("Invalid weight");
            return;
        }
        setIsLoading(true);
        try {
            const newEntry = await dietApi.createWeightEntry({
                weight: Number(weightEntryValue),
            });
            setWeightEntries((current) => [newEntry, ...current]);
            setWeightEntryValue("");
        } catch (err) {
            setWeightEntryError(toErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    return {
        weightEntries,
        weightEntryValue,
        setWeightEntryValue,
        weightEntryError,
        isLoading,
        computedChartData,
        progressThisMonth,
        handleAddEntry,
    };
}
