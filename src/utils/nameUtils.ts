export function getUniqueName(desiredName: string, existingNames: string[]): string {
    if (!desiredName) return desiredName;

    const exactMatch = existingNames.find((n) => n.toLowerCase() === desiredName.toLowerCase());
    if (!exactMatch) return desiredName;

    let counter = 1;
    while (true) {
        const candidate = `${desiredName} (${counter})`;
        const match = existingNames.find((n) => n.toLowerCase() === candidate.toLowerCase());
        if (!match) return candidate;
        counter++;
    }
}
