export function stringIsOnlyNumberOrFloat(str: string) {
    return /^\d+(\.\d+)?$/.test(str);
}
