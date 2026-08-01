export function isValidsvSEFormat(str: string) {
    // Examples
    // isValidsvSEFormat("2026-07-31"); // true
    // isValidsvSEFormat("2026-02-31"); // false (invalid calendar date)
    // isValidsvSEFormat("26-07-31"); // false (bad pattern)

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!str.match(regex)) return false;

    const [year, month, day] = str.split("-").map(Number);
    if (!year || !month || !day) return false;

    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

export function isIsoDate(str: string) {
    if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
    const d = new Date(str);
    return d instanceof Date && !isNaN(d.getTime()) && d.toISOString() === str;
}
