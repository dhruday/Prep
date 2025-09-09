/*
Longest Increasing Subsequence

Problem Statement:
Write a function that takes in a non-empty array of integers and returns the longest
strictly increasing subsequence in the array. A subsequence of an array is a set of
numbers that aren't necessarily adjacent in the array but that are in the same order
as they appear in the array. For instance, the numbers [1, 3, 4] form a subsequence
of the array [1, 2, 3, 4], and so do the numbers [2, 4]. Note that a single number
in an array and the array itself are both valid subsequences of the array.

You can assume that there will only be one longest increasing subsequence.

Sample Input:
array = [5, 7, -24, 12, 10, 2, 3, 12, 5, 6, 35]

Sample Output:
[-24, 2, 3, 5, 6, 35]
// This is one of the longest increasing subsequences possible.
// Note that there could be several subsequences of the same length.

Constraints:
- 1 ≤ array.length ≤ 1000
- -10000 ≤ array[i] ≤ 10000
*/

function longestIncreasingSubsequence(array) {
    // Write your code here
}

// Helper function to verify if a sequence is strictly increasing
function isStrictlyIncreasing(sequence) {
    for (let i = 1; i < sequence.length; i++) {
        if (sequence[i] <= sequence[i - 1]) return false;
    }
    return true;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [5, 7, -24, 12, 10, 2, 3, 12, 5, 6, 35],
            expected: [-24, 2, 3, 5, 6, 35],
            description: "Sample test case"
        },
        {
            input: [1],
            expected: [1],
            description: "Single element"
        },
        {
            input: [1, 2, 3, 4, 5],
            expected: [1, 2, 3, 4, 5],
            description: "Already sorted array"
        },
        {
            input: [5, 4, 3, 2, 1],
            expected: [5], // or any single number
            description: "Decreasing array"
        },
        {
            input: [3, 10, 2, 1, 20],
            expected: [3, 10, 20],
            description: "Non-consecutive increasing"
        },
        {
            input: [1, 2, 3, 4, 0, 10],
            expected: [1, 2, 3, 4, 10],
            description: "Almost sorted with disruption"
        },
        {
            input: [10, 9, 2, 5, 3, 7, 101, 18],
            expected: [2, 5, 7, 101],
            description: "Complex sequence"
        },
        {
            input: [0, 8, 4, 12, 2, 10, 6, 14, 1, 9],
            expected: [0, 4, 10, 14],
            description: "Multiple possible sequences"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Find longest increasing subsequence
        const result = longestIncreasingSubsequence(testCase.input);
        
        // Verify the result
        const isValid = isStrictlyIncreasing(result);
        const correctLength = result.length === testCase.expected.length;
        
        // For this problem, we'll consider a solution correct if:
        // 1. It's strictly increasing
        // 2. It has the same length as the expected solution
        // 3. All numbers in the sequence appear in the original array
        // 4. The sequence follows the original order
        const isValidSequence = isValid && correctLength && 
            result.every(num => testCase.input.includes(num)) &&
            result.every((num, idx) => {
                if (idx === 0) return true;
                return testCase.input.indexOf(result[idx]) > testCase.input.indexOf(result[idx - 1]);
            });
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected Length: ${testCase.expected.length}`);
        console.log(`Expected (one possible solution): ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${isValidSequence ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!isValidSequence) {
            if (!isValid) console.log("  Failed: Sequence is not strictly increasing");
            if (!correctLength) console.log("  Failed: Length doesn't match expected");
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
