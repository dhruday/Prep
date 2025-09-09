/*
Caesar Cipher Encryptor

Problem Statement:
Write a function that takes in a non-empty string of lowercase letters and a non-negative
integer key, and returns a new string obtained by shifting every letter in the input string
by k positions in the alphabet, where k is the key.

Note:
- The alphabet should wrap around (e.g., 'z' shifted by 1 becomes 'a')
- All letters will be lowercase
- The key will always be a non-negative integer

Sample Input:
string = "xyz"
key = 2

Sample Output:
"zab" // Each letter is shifted 2 spots: 'x' -> 'y' -> 'z', 'y' -> 'z' -> 'a', 'z' -> 'a' -> 'b'

Test Cases:
1. string = "xyz", key = 2
   Expected Output: "zab"

2. string = "abc", key = 0
   Expected Output: "abc"

3. string = "abc", key = 3
   Expected Output: "def"

4. string = "xyz", key = 5
   Expected Output: "cde"

5. string = "abc", key = 26
   Expected Output: "abc"

6. string = "abc", key = 52
   Expected Output: "abc"

Solution Approaches:
1. ASCII Values (Optimal): O(n) time | O(n) space
   - Convert each character to ASCII value
   - Add key and handle wrapping using modulo
   - Convert back to character

2. Array Method: O(n) time | O(n) space
   - Create array of alphabet
   - Use modulo to handle wrapping
   - Map each character to new position
*/

function caesarCipherEncryptor(string, key) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        string: "xyz",
        key: 2,
        expected: "zab"
    },
    {
        string: "abc",
        key: 0,
        expected: "abc"
    },
    {
        string: "abc",
        key: 3,
        expected: "def"
    },
    {
        string: "xyz",
        key: 5,
        expected: "cde"
    },
    {
        string: "abc",
        key: 26,
        expected: "abc"
    },
    {
        string: "abc",
        key: 52,
        expected: "abc"
    },
    {
        string: "iwufqnkqkqoolxzzlzihqfm",
        key: 25,
        expected: "hvtepmjpjpnnkwyykyhgpel"
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = caesarCipherEncryptor(testCase.string, testCase.key);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input String: "${testCase.string}"`);
        console.log(`Key: ${testCase.key}`);
        console.log(`Your Output: "${result}"`);
        console.log(`Expected Output: "${testCase.expected}"`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
