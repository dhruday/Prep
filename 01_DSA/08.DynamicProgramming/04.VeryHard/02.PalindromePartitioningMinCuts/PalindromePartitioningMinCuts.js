/*
Palindrome Partitioning Min Cuts

Problem Statement:
Write a function that takes in a string and returns the minimum number of cuts needed
to perform on the string such that each remaining substring is a palindrome.

A palindrome is defined as a string that's written the same forward as backward. Note
that single characters are palindromes.

Sample Input:
string = "noonabbad"

Sample Output:
2 // "noon | abba | d"
// The string can be cut into "noon", "abba", and "d", which are all palindromes.
// Note that there might be other ways to cut the string into palindromes (e.g., "n | oon | abba | d"),
// but cutting it into "noon | abba | d" requires only 2 cuts, which is minimal.

Constraints:
- 1 ≤ string.length ≤ 1000
- The string will contain only lowercase letters
*/

function palindromePartitioningMinCuts(string) {
    // Write your code here
}

// Helper function to check if a string is a palindrome
function isPalindrome(str, start, end) {
    while (start < end) {
        if (str[start] !== str[end]) return false;
        start++;
        end--;
    }
    return true;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: "noonabbad",
            expected: 2,
            description: "Sample test case"
        },
        {
            input: "a",
            expected: 0,
            description: "Single character"
        },
        {
            input: "aa",
            expected: 0,
            description: "Two same characters"
        },
        {
            input: "ab",
            expected: 1,
            description: "Two different characters"
        },
        {
            input: "ababbbabbababa",
            expected: 3,
            description: "Long string with multiple palindromes"
        },
        {
            input: "abcdefg",
            expected: 6,
            description: "No palindromes longer than 1"
        },
        {
            input: "racecar",
            expected: 0,
            description: "Single palindrome"
        },
        {
            input: "aaa",
            expected: 0,
            description: "All same characters"
        },
        {
            input: "abba",
            expected: 0,
            description: "Even length palindrome"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate minimum cuts
        const result = palindromePartitioningMinCuts(testCase.input);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input: "${testCase.input}"`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
