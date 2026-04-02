/*
Phone Number Mnemonics

Problem Statement:
Almost every digit is associated with some letters in the alphabet; this allows for certain 
phone numbers to spell out actual words. For example, the phone number "8463" could be written
as "time".

Given a stringified phone number of any non-zero length, write a function that returns all
mnemonics for this phone number, in any order.

For this problem, a valid mnemonic may only contain letters and the digits 0 and 1. In other
words, if a digit is able to be represented by a letter, then it must be. Digits 0 and 1 are
the only two digits that don't have letter representations on the keyboard.

The digit-letter mappings are as follows:
0 -> 0
1 -> 1
2 -> a, b, c
3 -> d, e, f
4 -> g, h, i
5 -> j, k, l
6 -> m, n, o
7 -> p, q, r, s
8 -> t, u, v
9 -> w, x, y, z

Sample Input:
phoneNumber = "1905"

Sample Output:
[
    "1w0j", "1w0k", "1w0l",
    "1x0j", "1x0k", "1x0l",
    "1y0j", "1y0k", "1y0l",
    "1z0j", "1z0k", "1z0l"
]
// The mnemonics could be ordered differently.

Test Cases:
1. phoneNumber = "1905"
   Expected Output: [
       "1w0j", "1w0k", "1w0l",
       "1x0j", "1x0k", "1x0l",
       "1y0j", "1y0k", "1y0l",
       "1z0j", "1z0k", "1z0l"
   ]

2. phoneNumber = "23"
   Expected Output: [
       "ad", "ae", "af",
       "bd", "be", "bf",
       "cd", "ce", "cf"
   ]

3. phoneNumber = "0123"
   Expected Output: [
       "01ad", "01ae", "01af",
       "01bd", "01be", "01bf",
       "01cd", "01ce", "01cf"
   ]

4. phoneNumber = "1"
   Expected Output: ["1"]

Solution Approaches:
1. Recursive Solution (Optimal): O(4^n * n) time | O(4^n) space
   where n is the length of the phone number
   - For each digit that maps to letters, try all possibilities
   - Use recursion to build combinations
   - Base case: when all digits are processed

2. Iterative Solution: O(4^n * n) time | O(4^n) space
   - Use a queue to build combinations
   - Process one digit at a time
   - Less intuitive but avoids recursion overhead
*/

function phoneNumberMnemonics(phoneNumber) {
    // Write your code here
}

// The digit-letter mapping
const DIGIT_LETTERS = {
    0: ['0'],
    1: ['1'],
    2: ['a', 'b', 'c'],
    3: ['d', 'e', 'f'],
    4: ['g', 'h', 'i'],
    5: ['j', 'k', 'l'],
    6: ['m', 'n', 'o'],
    7: ['p', 'q', 'r', 's'],
    8: ['t', 'u', 'v'],
    9: ['w', 'x', 'y', 'z']
};

// Test Cases
const testCases = [
    {
        phoneNumber: "1905",
        expected: [
            "1w0j", "1w0k", "1w0l",
            "1x0j", "1x0k", "1x0l",
            "1y0j", "1y0k", "1y0l",
            "1z0j", "1z0k", "1z0l"
        ]
    },
    {
        phoneNumber: "23",
        expected: [
            "ad", "ae", "af",
            "bd", "be", "bf",
            "cd", "ce", "cf"
        ]
    },
    {
        phoneNumber: "0123",
        expected: [
            "01ad", "01ae", "01af",
            "01bd", "01be", "01bf",
            "01cd", "01ce", "01cf"
        ]
    },
    {
        phoneNumber: "1",
        expected: ["1"]
    },
    {
        phoneNumber: "444",
        expected: [
            "ggg", "ggh", "ggi", "ghg", "ghh", "ghi",
            "gig", "gih", "gii", "hgg", "hgh", "hgi",
            "hhg", "hhh", "hhi", "hig", "hih", "hii",
            "igg", "igh", "igi", "ihg", "ihh", "ihi",
            "iig", "iih", "iii"
        ]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = phoneNumberMnemonics(testCase.phoneNumber);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Phone Number: "${testCase.phoneNumber}"`);
        console.log(`Your Output: ${JSON.stringify(result)}`);
        console.log(`Expected Output: ${JSON.stringify(testCase.expected)}`);
        const passed = arraysEqual(result.sort(), testCase.expected.sort());
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare arrays
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

// Run the tests
runTests();
