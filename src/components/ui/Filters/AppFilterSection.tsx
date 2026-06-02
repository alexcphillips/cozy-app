import { useState } from "react";
import AppFilter, { type AppFilterProps } from "./AppFilter";
import styles from "./AppFilterSection.module.css";

export type AppFilterSectionProps = {
    filters: Omit<AppFilterProps, "isActive" | "onClick">[];
    onChange?: (selectedId: string | null) => void;
};

export default function AppFilterSection({
    filters,
    onChange,
}: AppFilterSectionProps) {
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

    const handleToggle = (id: string) => {
        const nextState = selectedFilter === id ? null : id;
        setSelectedFilter(nextState);
        if (onChange) onChange(nextState);
    };

    return (
        <div className={styles["section-container"]}>
            {filters.map((item) => (
                <AppFilter
                    id={item.id}
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    isActive={selectedFilter === item.id}
                    onClick={() => handleToggle(item.id)}
                />
            ))}
        </div>
    );
}
