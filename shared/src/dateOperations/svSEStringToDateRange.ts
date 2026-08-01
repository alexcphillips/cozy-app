// use the isValidsvSEFormat validator before calling svSEStringToDateRange
export function svSEStringToDateRange(str: string) {
    return {
        start: `${str}T00:00:00.000Z`,
        end: `${str}T23:59:59.999Z`,
    };
}
