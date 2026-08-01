// use the isIsoDate validator before calling ISOStringToDateRange
export function ISOStringToDateRange(isoString: string) {
    const todayDatePart = isoString.split("T")[0];

    return {
        start: `${todayDatePart}T00:00:00.000Z`,
        end: `${todayDatePart}T23:59:59.999Z`,
    };
}
