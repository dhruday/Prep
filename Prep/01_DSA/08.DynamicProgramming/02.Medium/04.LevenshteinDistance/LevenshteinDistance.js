/*
Levenshtein Distance

Problem Statement:
Write a function that takes in two strings and returns the minimum number of edit operations
that need to be performed on the first string to obtain the second string.

There are three edit operations: insertion of a character, deletion of a character, and
substitution of a character for another.

Sample Input:
str1 = "abc"
str2 = "yabd"

Sample Output:
2
// We can convert "abc" into "yabd" by:
// 1. inserting "y" at index 0
// 2. substituting "c" with "d"

Constraints:
- Both strings can be empty
- Both strings will contain only lowercase letters
- You must perform the edit operations on str1 to obtain str2
*/

function levenshteinDistance(str1, str2) {
    let shorter = str1;
    let longer = str2;
    if (shorter.length > longer.length) [shorter, longer] = [longer, shorter];

    let previous = Array.from({ length: shorter.length + 1 }, (_, index) => index);
    for (let row = 1; row <= longer.length; row++) {
        const current = [row];
        for (let column = 1; column <= shorter.length; column++) {
            current[column] = shorter[column - 1] === longer[row - 1]
                ? previous[column - 1]
                : 1 + Math.min(previous[column - 1], previous[column], current[column - 1]);
        }
        previous = current;
    }
    return previous[shorter.length];
}

// Test Cases
function runTests() {
    const testCases = [
        {
            str1: "abc",
            str2: "yabd",
            expected: 2,
            description: "Sample test case"
        },
        {
            str1: "",
            str2: "",
            expected: 0,
            description: "Empty strings"
        },
        {
            str1: "",
            str2: "abc",
            expected: 3,
            description: "Empty string to non-empty"
        },
        {
            str1: "abc",
            str2: "",
            expected: 3,
            description: "Non-empty string to empty"
        },
        {
            str1: "horse",
            str2: "ros",
            expected: 3,
            description: "Classic example"
        },
        {
            str1: "intention",
            str2: "execution",
            expected: 5,
            description: "Longer strings"
        },
        {
            str1: "sunday",
            str2: "saturday",
            expected: 3,
            description: "Different lengths"
        },
        {
            str1: "abc",
            str2: "abc",
            expected: 0,
            description: "Same strings"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate Levenshtein distance
        const result = levenshteinDistance(testCase.str1, testCase.str2);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input:`);
        console.log(`  String 1: "${testCase.str1}"`);
        console.log(`  String 2: "${testCase.str2}"`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
