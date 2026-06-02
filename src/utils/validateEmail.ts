export function isEmailValid(email: string) {
    // TBD
    return email.includes("@") && email.split("@").length === 2;
}
