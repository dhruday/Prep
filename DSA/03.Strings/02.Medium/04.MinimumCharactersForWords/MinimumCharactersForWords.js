/*
Minimum Characters For Words

Problem Statement:
Write a function that takes in an array of words and returns the smallest array of characters
needed to form all of the words. The characters don't need to be in any particular order.

For example, the characters ["y", "r", "o", "u"] are needed to form the words ["your", "you", "or", "yo"].

Note that the input words won't contain any spaces; however, they might contain punctuation
and/or special characters.

Sample Input:
words = ["this", "that", "did", "deed", "them!", "a"]

Sample Output:
["t", "t", "h", "i", "s", "a", "d", "d", "e", "e", "m", "!"]
// The characters could be ordered differently

Test Cases:
1. words = ["this", "that", "did", "deed", "them!", "a"]
   Expected Output: ["t", "t", "h", "i", "s", "a", "d", "d", "e", "e", "m", "!"]

2. words = ["your", "you", "or", "yo"]
   Expected Output: ["y", "o", "u", "r"]

3. words = ["abc", "ab", "a"]
   Expected Output: ["a", "b", "c"]

4. words = ["!!!"]
   Expected Output: ["!", "!", "!"]

5. words = [".", ".", "."]
   Expected Output: ["."]

Solution Approaches:
1. Character Frequency Count (Optimal): O(n * l) time | O(c) space
   where n is the number of words,
   l is the length of the longest word,
   and c is the number of unique characters across all words
   - Track maximum frequency of each character needed
   - Build result array based on frequencies

2. Set-based Approach: O(n * l) time | O(c) space
   - Create set of unique characters
   - Count frequencies
   - Less efficient for multiple occurrences
*/

function minimumCharactersForWords(words) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        words: ["this", "that", "did", "deed", "them!", "a"],
        expected: ["t", "t", "h", "i", "s", "a", "d", "d", "e", "e", "m", "!"]
    },
    {
        words: ["your", "you", "or", "yo"],
        expected: ["y", "o", "u", "r"]
    },
    {
        words: ["abc", "ab", "a"],
        expected: ["a", "b", "c"]
    },
    {
        words: ["!!!"],
        expected: ["!", "!", "!"]
    },
    {
        words: [".", ".", "."],
        expected: ["."]
    },
    {
        words: ["ccccc", "ccc", "cc", "c"],
        expected: ["c", "c", "c", "c", "c"]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = minimumCharactersForWords(testCase.words);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Words: [${testCase.words.map(w => `"${w}"`).join(", ")}]`);
        console.log(`Your Output: [${result.map(c => `"${c}"`).join(", ")}]`);
        console.log(`Expected Output: [${testCase.expected.map(c => `"${c}"`).join(", ")}]`);
        const passed = areCharacterArraysEqual(result, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare character arrays
function areCharacterArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    
    // Sort both arrays and compare
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    
    return JSON.stringify(sorted1) === JSON.stringify(sorted2);
}

// Run the tests
runTests();
