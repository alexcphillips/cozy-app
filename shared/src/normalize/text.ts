export function normalizeSearchText(value: string) {
    return value.toLowerCase().replace(/[\u2010-\u2015\u2212]/g, "-");
}

export function normalizeText(value: string) {
    return value.replace(/[\u2010-\u2015\u2212]/g, "-");
}
