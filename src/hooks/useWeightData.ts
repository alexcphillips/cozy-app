import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../apiFetch";
import { stringIsOnlyNumberOrFloat } from "../utils/stringIsOnlyNumberOrFloat";

export type WeightEntry = { weight: number; created_at: string };

export function useWeightData() {
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [weightEntryValue, setWeightEntryValue] = useState("");
    const [weightEntryError, setWeightEntryError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function loadEntries() {
            const response = await apiFetch("/api/weight-entries");
            if (response.ok) setWeightEntries(await response.json());
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
        if (currentMonth.length < 2) return 0;
        return (
            currentMonth[0].weight -
            currentMonth[currentMonth.length - 1].weight
        );
    }, [weightEntries]);

    async function handleAddEntry(e: React.SyntheticEvent) {
        e.preventDefault();
        setWeightEntryError("");
        if (!stringIsOnlyNumberOrFloat(weightEntryValue)) {
            setWeightEntryError("Invalid weight");
            return;
        }
        setIsLoading(true);
        const response = await apiFetch("/api/weight-entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weight: Number(weightEntryValue) }),
        });
        setIsLoading(false);
        if (!response.ok) {
            setWeightEntryError("Api error");
            return;
        }
        const newEntry = await response.json();
        setWeightEntries((current) => [newEntry, ...current]);
        setWeightEntryValue("");
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
