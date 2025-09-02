function validateSubsequence(array, sequence) {
    let seqIndex = 0;
    for (let i = 0; i < array.length; i++) {
        if (seqIndex === sequence.length) break;
        if (array[i] === sequence[seqIndex]) seqIndex++;
    }
    return seqIndex === sequence.length;
}
validateSubsequence([1, 2, 3, 4, 5], [2, 4]);
validateSubsequence([5, 1, 22, 25, 6, -1, 8, 10], [1, 6, -1, 10]);
validateSubsequence([1, 2, 3], [1, 2]);
validateSubsequence([1, 2, 3, 4, 5], [1, 6, 4]);