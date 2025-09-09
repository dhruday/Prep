/*
Longest Substring Without Duplication

Problem Statement:
Write a function that takes in a string and returns its longest substring without duplicate
characters. You can assume that there will only be one longest substring without duplication.

Sample Input:
string = "clementisacap"

Sample Output:
"mentisac"
// "mentisac" is the longest substring without duplicate characters.

Test Cases:
1. string = "clementisacap"
   Expected Output: "mentisac"

2. string = "abcdeabcdefc"
   Expected Output: "abcdef"

3. string = "abcb"
   Expected Output: "abc"

4. string = "aaaaaa"
   Expected Output: "a"

5. string = "abcdefghijklmnopqrstuvwxyz"
   Expected Output: "abcdefghijklmnopqrstuvwxyz"

Solution Approaches:
1. Sliding Window (Optimal): O(n) time | O(min(n, a)) space
   where n is the length of the string and a is the size of the alphabet
   - Use sliding window to track current substring
   - Use hash map to track last occurrence of each character
   - Update window when duplicate is found

2. Brute Force: O(n²) time | O(min(n, a)) space
   - Check all possible substrings
   - Keep track of longest valid substring
   - Not efficient for long strings
*/

function longestSubstringWithoutDuplication(string) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        string: "clementisacap",
        expected: "mentisac"
    },
    {
        string: "abcdeabcdefc",
        expected: "abcdef"
    },
    {
        string: "abcb",
        expected: "abc"
    },
    {
        string: "aaaaaa",
        expected: "a"
    },
    {
        string: "abcdefghijklmnopqrstuvwxyz",
        expected: "abcdefghijklmnopqrstuvwxyz"
    },
    {
        string: "aaabcccc",
        expected: "abc"
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = longestSubstringWithoutDuplication(testCase.string);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input String: "${testCase.string}"`);
        console.log(`Your Output: "${result}"`);
        console.log(`Expected Output: "${testCase.expected}"`);
        const passed = isValidSubstring(result, testCase.string) && 
                      !hasDuplicates(result) && 
                      result.length === testCase.expected.length;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to check if result is a valid substring
function isValidSubstring(substring, originalString) {
    return originalString.includes(substring);
}

// Helper function to check if string has duplicates
function hasDuplicates(string) {
    return new Set(string).size !== string.length;
}

// Run the tests
runTests();
