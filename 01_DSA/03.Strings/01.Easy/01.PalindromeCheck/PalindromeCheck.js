/*
Palindrome Check

Problem Statement:
Write a function that takes in a non-empty string and returns a boolean representing whether
or not the string is a palindrome. A palindrome is defined as a string that reads the same
forward and backward.

Note: Single-character strings are palindromes.

Sample Input:
string = "abcdcba"

Sample Output:
true // it's written the same forward and backward

Test Cases:
1. string = "abcdcba"
   Expected Output: true

2. string = "a"
   Expected Output: true

3. string = "ab"
   Expected Output: false

4. string = "aba"
   Expected Output: true

5. string = "racecar"
   Expected Output: true

Solution Approaches:
1. Two Pointer (Optimal): O(n) time | O(1) space
   - Use two pointers, one at start and one at end
   - Compare characters and move pointers inward
   - Stop if characters don't match or pointers meet

2. String Reversal: O(n) time | O(n) space
   - Create reversed string
   - Compare with original
*/

function isPalindrome(string) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        string: "abcdcba",
        expected: true
    },
    {
        string: "a",
        expected: true
    },
    {
        string: "ab",
        expected: false
    },
    {
        string: "aba",
        expected: true
    },
    {
        string: "racecar",
        expected: true
    },
    {
        string: "hello",
        expected: false
    },
    {
        string: "A man, a plan, a canal: Panama",
        expected: true
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = isPalindrome(testCase.string);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input String: "${testCase.string}"`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
