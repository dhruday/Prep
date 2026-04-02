/*
Longest Common Subsequence

Problem Statement:
Write a function that takes in two strings and returns their longest common subsequence.

A subsequence of a string is a set of characters that aren't necessarily adjacent in
the string but that are in the same order as they appear in the string. For example,
the characters ["a", "c", "d"] form a subsequence of the string "abcd", and so do the
characters ["b", "d"]. Note that a single character in a string and the string itself
are both valid subsequences of the string.

You can assume that there will only be one longest common subsequence.

Sample Input:
str1 = "ZXVVYZW"
str2 = "XKYKZPW"

Sample Output:
["X", "Y", "Z", "W"]

Constraints:
- The strings will only contain uppercase letters
- Either string can be empty
- The subsequence must maintain the order of characters as they appear in the original string
*/

function longestCommonSubsequence(str1, str2) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            str1: "ZXVVYZW",
            str2: "XKYKZPW",
            expected: ["X", "Y", "Z", "W"],
            description: "Sample test case"
        },
        {
            str1: "",
            str2: "ABC",
            expected: [],
            description: "One empty string"
        },
        {
            str1: "",
            str2: "",
            expected: [],
            description: "Both empty strings"
        },
        {
            str1: "ABCDGH",
            str2: "AEDFHR",
            expected: ["A", "D", "H"],
            description: "Classic example"
        },
        {
            str1: "AGGTAB",
            str2: "GXTXAYB",
            expected: ["G", "T", "A", "B"],
            description: "Multiple possible subsequences"
        },
        {
            str1: "AAAA",
            str2: "AAAA",
            expected: ["A", "A", "A", "A"],
            description: "Same strings"
        },
        {
            str1: "SHINCHAN",
            str2: "NOHARAAA",
            expected: ["N", "H", "A", "A"],
            description: "Different length strings"
        },
        {
            str1: "ABCDE",
            str2: "VWXYZ",
            expected: [],
            description: "No common characters"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Find longest common subsequence
        const result = longestCommonSubsequence(testCase.str1, testCase.str2);
        
        // Compare with expected
        const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
        
        console.log(`Input:`);
        console.log(`  String 1: "${testCase.str1}"`);
        console.log(`  String 2: "${testCase.str2}"`);
        console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
