/*
Generate Div Tags (Similar to LeetCode 22: Generate Parentheses)

Problem Statement:
Write a function that takes in a positive integer numberOfTags and returns a list of
all the valid strings that you can generate with that number of matched <div></div> tags.

A string is considered valid if and only if it consists of exactly numberOfTags opening
tags and numberOfTags closing tags that are properly matched. Opening and closing tags
must be properly nested.

Sample Input:
numberOfTags = 2

Sample Output:
[
  "<div><div></div></div>",
  "<div></div><div></div>"
]
// The list could be in any order

Note: For better visualization, here are the outputs formatted:
1.
<div>
  <div>
  </div>
</div>

2.
<div>
</div>
<div>
</div>

Constraints:
- 1 ≤ numberOfTags ≤ 12
- The order of the returned array doesn't matter
*/

function generateDivTags(numberOfTags) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: 2,
            expected: [
                "<div><div></div></div>",
                "<div></div><div></div>"
            ],
            description: "Sample test case"
        },
        {
            input: 1,
            expected: [
                "<div></div>"
            ],
            description: "Single tag"
        },
        {
            input: 3,
            expected: [
                "<div><div><div></div></div></div>",
                "<div><div></div><div></div></div>",
                "<div><div></div></div><div></div>",
                "<div></div><div><div></div></div>",
                "<div></div><div></div><div></div>"
            ],
            description: "Three tags"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Generate div tags
        const result = generateDivTags(testCase.input);
        
        // Sort both arrays for comparison
        const sortedResult = result.sort();
        const sortedExpected = testCase.expected.sort();
        
        // Compare results
        const passed = JSON.stringify(sortedResult) === JSON.stringify(sortedExpected);
        
        console.log(`Input: numberOfTags = ${testCase.input}`);
        console.log(`Expected (${testCase.expected.length} combinations):`);
        testCase.expected.forEach(str => console.log(str));
        console.log(`\nActual (${result.length} combinations):`);
        result.forEach(str => console.log(str));
        console.log(`\nStatus: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            console.log("\nDifferences:");
            const expectedSet = new Set(sortedExpected);
            const resultSet = new Set(sortedResult);
            
            console.log("Missing combinations:");
            sortedExpected.forEach(str => {
                if (!resultSet.has(str)) console.log(str);
            });
            
            console.log("Extra combinations:");
            sortedResult.forEach(str => {
                if (!expectedSet.has(str)) console.log(str);
            });
            
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
