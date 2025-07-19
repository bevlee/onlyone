export const equivalentWords = (wordA, wordB) => {
    let stemmedA = normalise(wordA)
    let stemmedB = normalise(wordB)
    return stemmedA == stemmedB;
}

export const normalise = (word) => {
    return word.trim().toLowerCase();
}

export const dedupeClues = (clues) => {
    const wordIndexes = {};

    for (let i = 0; i < clues.length; i++) {
        if (clues[i] in wordIndexes) {
            wordIndexes[clues[i]].push(i);
        } else {
            wordIndexes[clues[i]] = [i]
        }
    }

    let updatedClues = new Array(clues.length);

    for (const [word, indicies] of Object.entries(wordIndexes)) {
        if (indicies.length == 1) {
            updatedClues[indicies[0]] = word;
        } else {
            for (let index of indicies) {
                updatedClues[index] = "Duplicate Clue :(";
            }
        }
    }

    return updatedClues;
}