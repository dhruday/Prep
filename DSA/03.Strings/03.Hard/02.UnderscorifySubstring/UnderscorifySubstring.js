/*
Underscorify Substring

Problem Statement:
Write a function that takes in two strings: a main string and a substring, and returns a
version of the main string with every instance of the substring wrapped in underscores.

If two or more instances of the substring overlap or are adjacent, the underscores should
wrap both instances together.

Sample Input:
string = "testthis is a testtest to see if testestest it works"
substring = "test"

Sample Output:
"_test_this is a _testtest_ to see if _testestest_ it works"
// The instances "test" at indices 0 and 14 are completely contained within the underscores.
// The instance "test" at index 17 overlaps with "test" at index 14, so they are wrapped together.
// The instance "test" at indices 24 and 28 overlap, so they are wrapped together.

Test Cases:
1. string = "testthis is a testtest to see if testestest it works"
   substring = "test"
   Expected Output: "_test_this is a _testtest_ to see if _testestest_ it works"

2. string = "this is a test"
   substring = "test"
   Expected Output: "this is a _test_"

3. string = "test test test test"
   substring = "test"
   Expected Output: "_test test test test_"

4. string = "tttttttttttttt"
   substring = "tt"
   Expected Output: "_tttttttttttttt_"

5. string = "ababababababababa"
   substring = "aba"
   Expected Output: "_ababababababababa_"

Solution Approaches:
1. Two-Pass Solution (Optimal): O(n + m) time | O(n) space
   where n is the length of the main string and m is the length of the substring
   - First pass: Find all substring locations
   - Second pass: Collapse overlapping locations
   - Final pass: Build result string with underscores

2. Single-Pass with Complex Logic: O(n + m) time | O(n) space
   - Process string left to right
   - Track overlapping substrings in real-time
   - More complex to implement correctly
*/

function underscorifySubstring(string, substring) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        string: "testthis is a testtest to see if testestest it works",
        substring: "test",
        expected: "_test_this is a _testtest_ to see if _testestest_ it works"
    },
    {
        string: "this is a test",
        substring: "test",
        expected: "this is a _test_"
    },
    {
        string: "test test test test",
        substring: "test",
        expected: "_test test test test_"
    },
    {
        string: "tttttttttttttt",
        substring: "tt",
        expected: "_tttttttttttttt_"
    },
    {
        string: "ababababababababa",
        substring: "aba",
        expected: "_ababababababababa_"
    },
    {
        string: "tzttz",
        substring: "tz",
        expected: "_tz_t_tz_"
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = underscorifySubstring(testCase.string, testCase.substring);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input String: "${testCase.string}"`);
        console.log(`Substring: "${testCase.substring}"`);
        console.log(`Your Output: "${result}"`);
        console.log(`Expected Output: "${testCase.expected}"`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
