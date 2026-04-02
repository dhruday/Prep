/*
Product Sum

Problem Statement:
Write a function that takes in a "special" array and returns its product sum. A "special" array is a non-empty array that contains either integers or other "special" arrays. The product sum of a "special" array is the sum of its elements, where "special" arrays inside it are summed themselves and then multiplied by their level of depth.

For example, the product sum of [x, y] is x + y; the product sum of [x, [y, z]] is x + 2 * (y + z); the product sum of [x, [y, [z]]] is x + 2 * (y + 3z).

Sample Input:
array = [5, 2, [7, -1], 3, [6, [-13, 8], 4]]

Sample Output:
12
// calculated as: 5 + 2 + 2 * (7 - 1) + 3 + 2 * (6 + 3 * (-13 + 8) + 4)
// = 5 + 2 + 12 + 3 + 2 * (6 + (-15) + 4)
// = 5 + 2 + 12 + 3 + 2 * (-5)
// = 5 + 2 + 12 + 3 - 10
// = 12

Constraints:
- Array depth can be arbitrarily large
- Array will always be non-empty
- Array elements will be either integers or other special arrays
*/

function productSum(array, multiplier = 1) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [5, 2, [7, -1], 3, [6, [-13, 8], 4]],
            expected: 12,
            description: "Sample test case"
        },
        {
            input: [1, 2, 3, 4, 5],
            expected: 15,
            description: "Flat array"
        },
        {
            input: [[1, 1], [1, 1]],
            expected: 8,
            description: "Two-level nesting"
        },
        {
            input: [[[[[5]]]]],
            expected: 600,
            description: "Deep nesting (5 levels)"
        },
        {
            input: [9, [2, -3, [4, 1]], 8, [[-2]]],
            expected: 20,
            description: "Mixed nesting with negative numbers"
        },
        {
            input: [1, [1, [1, [1, [1, 1]]]]],
            expected: 13,
            description: "Linear nesting"
        },
        {
            input: [[], [[]]], // empty arrays sum to 0
            expected: 0,
            description: "Empty nested arrays"
        },
        {
            input: [-1, [-1, [-1]]],
            expected: -5,
            description: "Nested negative numbers"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate product sum
        const result = productSum(testCase.input);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
