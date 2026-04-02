/*
Powerset (LeetCode 78: Subsets)

Problem Statement:
Write a function that takes in an array of unique integers and returns its powerset.
The powerset P(X) of a set X is the set of all subsets of X. For example, the powerset
of [1,2] is [[], [1], [2], [1,2]].

Note: The sets in the powerset do not need to be in any particular order.

Sample Input:
array = [1, 2, 3]

Sample Output:
[[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]

Constraints:
- Input array will have unique integers
- 0 ≤ array.length ≤ 12 (to keep computation reasonable)
- The order of the subsets in the output array doesn't matter
- The order of elements in each subset should maintain relative ordering from input array
*/

function powerset(array) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [1, 2, 3],
            expected: [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]],
            description: "Sample test case"
        },
        {
            input: [],
            expected: [[]],
            description: "Empty array"
        },
        {
            input: [1],
            expected: [[], [1]],
            description: "Single element"
        },
        {
            input: [1, 2],
            expected: [[], [1], [2], [1, 2]],
            description: "Two elements"
        },
        {
            input: [1, 2, 3, 4],
            expected: null, // We'll check length and content instead of exact match
            description: "Four elements"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Get powerset
        const result = powerset(testCase.input);
        
        // For the 4-element case, we'll validate differently
        let passed;
        if (testCase.input.length === 4) {
            // Check if we have the correct number of subsets (2^4 = 16)
            const correctLength = result.length === 16;
            
            // Check if all subsets are unique
            const uniqueSubsets = new Set(result.map(arr => arr.join(',')));
            const allUnique = uniqueSubsets.size === 16;
            
            // Check if empty set is included
            const hasEmptySet = result.some(subset => subset.length === 0);
            
            // Check if full set is included
            const hasFullSet = result.some(subset => 
                subset.length === 4 && 
                testCase.input.every(num => subset.includes(num))
            );
            
            passed = correctLength && allUnique && hasEmptySet && hasFullSet;
        } else {
            // For other cases, compare with expected (order independent)
            const resultStr = result.map(arr => arr.join(',')).sort().join('|');
            const expectedStr = testCase.expected.map(arr => arr.join(',')).sort().join('|');
            passed = resultStr === expectedStr;
        }
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        if (testCase.input.length !== 4) {
            console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        } else {
            console.log(`Expected: 16 unique subsets including empty set and full set`);
        }
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
