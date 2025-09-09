/*
Permutations (LeetCode 46: Permutations)

Problem Statement:
Write a function that takes in an array of unique integers and returns an array of all permutations of those integers
in no particular order.

If the input array is empty, your function should return an empty array.

Sample Input:
array = [1, 2, 3]

Sample Output: // The array below represents one possible ordering of the permutations
[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]

Note: Each array in the returned array of permutations should be a new array, not a reference.

Constraints:
- Input array will have unique integers
- 0 ≤ array.length ≤ 8 (to keep computation reasonable)
- The order of the permutations in the output array doesn't matter
*/

function getPermutations(array) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [1, 2, 3],
            expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]],
            description: "Sample test case"
        },
        {
            input: [],
            expected: [],
            description: "Empty array"
        },
        {
            input: [1],
            expected: [[1]],
            description: "Single element"
        },
        {
            input: [1, 2],
            expected: [[1, 2], [2, 1]],
            description: "Two elements"
        },
        {
            input: [1, 2, 3, 4],
            expected: null, // We'll check length and uniqueness instead of exact match
            description: "Four elements"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Get permutations
        const result = getPermutations(testCase.input);
        
        // For the 4-element case, we'll validate differently
        let passed;
        if (testCase.input.length === 4) {
            // Check if we have the correct number of permutations (4! = 24)
            const correctLength = result.length === 24;
            
            // Check if all permutations are unique
            const uniquePermutations = new Set(result.map(arr => arr.join(',')));
            const allUnique = uniquePermutations.size === 24;
            
            // Check if all permutations contain all original numbers
            const allContainAllNumbers = result.every(perm => 
                perm.length === 4 && 
                testCase.input.every(num => perm.includes(num))
            );
            
            passed = correctLength && allUnique && allContainAllNumbers;
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
            console.log(`Expected: 24 unique permutations`);
        }
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
