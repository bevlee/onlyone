export const equivalentWord = (wordA: string, wordB: string): boolean => {
    let stemmedA = getStem(wordA)
    let stemmedB = getStem(wordB)
    return stemmedA == stemmedB;
}

export const getStem = (word: string): string => {
    return word.trim().toLowerCase();
}