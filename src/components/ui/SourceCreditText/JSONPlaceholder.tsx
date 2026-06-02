export function JSONPlaceholderCreditText(
    urlRouteTextWithSlash: string | null,
) {
    const sourceUrl = "https://jsonplaceholder.typicode.com";
    const fullSourceUrl = `${sourceUrl}${urlRouteTextWithSlash ?? ""}`;

    return (
        <p>
            This data is from:{" "}
            <a href={fullSourceUrl} target="_blank">
                {fullSourceUrl}{" "}
            </a>
        </p>
    );
}

JSONPlaceholderCreditText(null);
