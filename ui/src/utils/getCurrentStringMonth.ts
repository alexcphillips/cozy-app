const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
] as const;

export default function getCurrentStringMonth(): string {
    // getMonth() is always 0-11, so the fallback is unreachable - it exists to
    // satisfy noUncheckedIndexedAccess without an assertion.
    return MONTHS[new Date().getMonth()] ?? "";
}
