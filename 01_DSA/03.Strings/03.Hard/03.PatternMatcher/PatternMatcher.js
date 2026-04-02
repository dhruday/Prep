/*
Pattern Matcher

Problem Statement:
You're given two non-empty strings. The first string is a pattern consisting of only "x"s
and/or "y"s. The second string is a normal string of alphanumeric characters. Write a
function that determines whether or not the normal string matches the pattern.

A string S0 is said to match a pattern if replacing all "x"s in the pattern with some
non-empty substring S1 of S0 and replacing all "y"s in the pattern with some non-empty
substring S2 of S0 yields the same string S0.

If the input string doesn't match the input pattern, return an empty array; otherwise,
return an array of the strings [S1, S2], where S1 and S2 are the substrings representing
"x" and "y" in the normal string.

If the pattern doesn't contain any "y"s, the array that you return should be of the form
[S1, ""], where S1 represents "x".

Sample Input:
pattern = "xxyxxy"
string = "gogopowerrangergogopowerranger"

Sample Output:
["go", "powerranger"]
// Explanation: "go" represents "x" and "powerranger" represents "y"

Test Cases:
1. pattern = "xxyxxy"
   string = "gogopowerrangergogopowerranger"
   Expected Output: ["go", "powerranger"]

2. pattern = "xyxy"
   string = "abab"
   Expected Output: ["a", "b"]

3. pattern = "yxyx"
   string = "abab"
   Expected Output: ["b", "a"]

4. pattern = "xxx"
   string = "aabaabaa"
   Expected Output: []

5. pattern = "x"
   string = "hello"
   Expected Output: ["hello", ""]

Solution Approaches:
1. Length-Based Solution (Optimal): O(n² + m) time | O(n) space
   where n is the length of the string and m is the length of the pattern
   - Count pattern occurrences
   - Try different lengths for x and y
   - Verify pattern match

2. Brute Force: O(n⁴) time | O(n) space
   - Try all possible substrings for x and y
   - Check if substitution matches
*/

function patternMatcher(pattern, string) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        pattern: "xxyxxy",
        string: "gogopowerrangergogopowerranger",
        expected: ["go", "powerranger"]
    },
    {
        pattern: "xyxy",
        string: "abab",
        expected: ["a", "b"]
    },
    {
        pattern: "yxyx",
        string: "abab",
        expected: ["b", "a"]
    },
    {
        pattern: "xxx",
        string: "aabaabaa",
        expected: []
    },
    {
        pattern: "x",
        string: "hello",
        expected: ["hello", ""]
    },
    {
        pattern: "xxy",
        string: "gogogo",
        expected: []
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = patternMatcher(testCase.pattern, testCase.string);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Pattern: "${testCase.pattern}"`);
        console.log(`String: "${testCase.string}"`);
        console.log(`Your Output: ${JSON.stringify(result)}`);
        console.log(`Expected Output: ${JSON.stringify(testCase.expected)}`);
        const passed = isValidResult(result, testCase.expected, testCase.pattern, testCase.string);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to verify if result is valid
function isValidResult(result, expected, pattern, string) {
    if (result.length !== expected.length) return false;
    if (result.length === 0 && expected.length === 0) return true;
    
    // Reconstruct string using result and pattern
    let reconstructed = '';
    for (let char of pattern) {
        reconstructed += char === 'x' ? result[0] : result[1];
    }
    
    return reconstructed === string;
}

// Run the tests
runTests();
