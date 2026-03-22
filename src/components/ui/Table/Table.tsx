import { useMemo, useState } from "react";
import styles from "./Table.module.css";

export type Column<T> = {
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (row: T) => React.ReactNode;
};

export type TableProps<T> = {
    data: T[];
    columns: Column<T>[];
};

type SortDirection = "asc" | "desc" | null;

type SortState<T> = {
    key: keyof T | null;
    direction: SortDirection;
};

export default function Table<T>({ data, columns }: TableProps<T>) {
    const [sort, setSort] = useState<SortState<T>>({
        key: null,
        direction: null,
    });

    function handleSort(key: keyof T) {
        setSort((prev) => {
            if (prev.key !== key) {
                return { key, direction: "asc" };
            }

            if (prev.direction === "asc") {
                return { key, direction: "desc" };
            }

            return { key: null, direction: null };
        });
    }
    const sortedData = useMemo(() => {
        if (!sort.key || !sort.direction) return data;
        const key = sort.key;

        return [...data].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [sort, data]);

    function getSortIcon(key: keyof T) {
        if (sort.key !== key) return "↕";
        if (sort.direction === "asc") return "↑";
        if (sort.direction === "desc") return "↓";
    }

    return (
        <table>
            <thead>
                <tr>
                    {columns.map((col) => (
                        <th
                            key={String(col.key)}
                            className={styles["cell"]}
                            onClick={() =>
                                col.sortable ? handleSort(col.key) : undefined
                            }
                        >
                            {col.label}
                            {col.sortable && (
                                <div className={styles["sort-button"]}>
                                    {getSortIcon(col.key)}
                                </div>
                            )}
                        </th>
                    ))}
                </tr>
            </thead>

            <tbody>
                {sortedData.map((row, i) => (
                    <tr key={i}>
                        {columns.map((col) => (
                            <td
                                key={String(col.key)}
                                className={styles["cell"]}
                            >
                                {col.render
                                    ? col.render(row)
                                    : String(row[col.key])}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
