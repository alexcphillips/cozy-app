/**
 * Today in the user's own timezone as "YYYY-MM-DD" - the format the server's
 * `isValidsvSEFormat` validator expects for `localDate` params.
 *
 * The sv-SE locale is used because it formats dates ISO-style natively, so this
 * never goes through UTC and can't report "yesterday" late in the evening.
 */
export function getLocalDateString(date: Date = new Date()): string {
    return new Intl.DateTimeFormat("sv-SE").format(date);
}
