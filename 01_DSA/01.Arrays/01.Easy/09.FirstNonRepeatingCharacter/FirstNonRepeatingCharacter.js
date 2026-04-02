/*
First Non-Repeating Character

Problem Statement:
Write a function that takes in a string of lowercase English-alphabet letters and returns
the index of the string's first non-repeating character.

The first non-repeating character is the first character in a string that occurs only once.
If the input string doesn't have any non-repeating characters, your function should return -1.

Sample Input:
string = "abcdcaf"

Sample Output:
1 // b is the first non-repeating character in the string

Test Cases:
1. string = "abcdcaf"
   Expected Output: 1

2. string = "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
   Expected Output: -1

3. string = "abcdefghijklmnopqrstuvwxyz"
   Expected Output: 0

4. string = "faadabcbbebdf"
   Expected Output: 6

5. string = "a"
   Expected Output: 0

6. string = "aa"
   Expected Output: -1

Solution Approaches:
1. Hash Table (Two Passes): O(n) time | O(1) space
   - First pass: count character frequencies
   - Second pass: find first character with frequency 1

2. Hash Table (One Pass): O(n) time | O(1) space
   - Store both frequency and first index
   - After one pass, find character with frequency 1
*/

function firstNonRepeatingCharacter(string) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        string: "abcdcaf",
        expected: 1
    },
    {
        string: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
        expected: -1
    },
    {
        string: "abcdefghijklmnopqrstuvwxyz",
        expected: 0
    },
    {
        string: "faadabcbbebdf",
        expected: 6
    },
    {
        string: "a",
        expected: 0
    },
    {
        string: "aa",
        expected: -1
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = firstNonRepeatingCharacter(testCase.string);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input String: "${testCase.string}"`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
