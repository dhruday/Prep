/*
Longest Substring Without Repeating Characters

Problem Statement:
Return the length of the longest contiguous substring containing no repeated characters.

Solution:
Track the last index of every character. When a repeated character falls inside
the current window, move the left boundary just past its previous index.

Complexity: O(n) time | O(min(n, alphabet size)) space
*/

function longestSubstringWithoutRepeats(text) {
    const lastSeen = new Map();
    let left = 0;
    let best = 0;

    for (let right = 0; right < text.length; right++) {
        const previousIndex = lastSeen.get(text[right]);
        if (previousIndex !== undefined && previousIndex >= left) left = previousIndex + 1;
        lastSeen.set(text[right], right);
        best = Math.max(best, right - left + 1);
    }

    return best;
}

function runTests() {
    const tests = [['abcabcbb', 3], ['bbbbb', 1], ['pwwkew', 3], ['', 0], ['dvdf', 3]];
    const passed = tests.every(([input, expected]) => longestSubstringWithoutRepeats(input) === expected);
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { longestSubstringWithoutRepeats };
