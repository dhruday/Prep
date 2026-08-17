/*
Validate Subsequence

Problem Statement:
Given two non-empty arrays of integers, write a function that determines whether the second array is a subsequence of the first one.

A subsequence of an array is a set of numbers that aren't necessarily adjacent in the array but that are in the same order as they appear in the array.
For instance, the numbers [1, 3, 4] form a subsequence of the array [1, 2, 3, 4], and so do the numbers [2, 4].
Note that a single number in an array and the array itself are both valid subsequences of the array.

Sample Input:
array = [5, 1, 22, 25, 6, -1, 8, 10]
sequence = [1, 6, -1, 10]

Sample Output:
true

Test Cases:
1. array = [5, 1, 22, 25, 6, -1, 8, 10], sequence = [1, 6, -1, 10]
   Expected Output: true
   
2. array = [5, 1, 22, 25, 6, -1, 8, 10], sequence = [5, 1, 22, 25, 6, -1, 8, 10]
   Expected Output: true
   
3. array = [5, 1, 22, 25, 6, -1, 8, 10], sequence = [5, 1, 22, 6, -1, 8, 10]
   Expected Output: true
   
4. array = [5, 1, 22, 25, 6, -1, 8, 10], sequence = [22, 25, 6]
   Expected Output: true
   
5. array = [5, 1, 22, 25, 6, -1, 8, 10], sequence = [1, 6, 10]
   Expected Output: true
   
6. array = [5, 1, 22, 25, 6, -1, 8, 10], sequence = [5, 1, 22, 25, 6, -1, 8, 10, 12]
   Expected Output: false

Solution Approaches:
1. Two Pointers: O(n) time | O(1) space
   - Use two pointers to traverse both arrays
   - Increment array pointer always, sequence pointer only on match
   - If sequence pointer reaches end, we found a valid subsequence
*/

function isValidSubsequence(array, sequence) {
    if (array.length < sequence.length) {
        return false;
    }
    let seqIndex = 0;
    let arrIndex = 0;
    while (arrIndex < array.length) {
        if (array[arrIndex] === sequence[seqIndex]) {
            seqIndex++;
        }
        arrIndex++;
    }
    if (seqIndex === sequence.length) {
        return true;
    } else {
        return false;
    }
}

// Test Cases
const testCases = [
    {
        array: [5, 1, 22, 25, 6, -1, 8, 10],
        sequence: [1, 6, -1, 10],
        expected: true
    },
    {
        array: [5, 1, 22, 25, 6, -1, 8, 10],
        sequence: [5, 1, 22, 25, 6, -1, 8, 10],
        expected: true
    },
    {
        array: [5, 1, 22, 25, 6, -1, 8, 10],
        sequence: [5, 1, 22, 6, -1, 8, 10],
        expected: true
    },
    {
        array: [5, 1, 22, 25, 6, -1, 8, 10],
        sequence: [22, 25, 6],
        expected: true
    },
    {
        array: [5, 1, 22, 25, 6, -1, 8, 10],
        sequence: [1, 6, 10],
        expected: true
    },
    {
        array: [5, 1, 22, 25, 6, -1, 8, 10],
        sequence: [5, 1, 22, 25, 6, -1, 8, 10, 12],
        expected: false
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = isValidSubsequence(testCase.array, testCase.sequence);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`Sequence: [${testCase.sequence}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
