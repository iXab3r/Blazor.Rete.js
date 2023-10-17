export function sortByIndex<T extends [string, undefined | { index?: number }][]>(
    entries: T
) {
    entries.sort((a, b) => {
        const ai = a[1]?.index || 0;
        const bi = b[1]?.index || 0;

        return ai - bi;
    });
}
