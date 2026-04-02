/*
Shifted Binary Search

Problem Statement:
Write a function that takes in a sorted (but shifted) array of integers and a target integer.
The array is shifted by some number of positions, meaning that it was rotated left or right
a certain number of times. For example, [3, 4, 5, 1, 2] is a shifted version of [1, 2, 3, 4, 5].

The function should use a variation of the Binary Search algorithm to find if the target number
is contained in the array and should return its index if it is, otherwise -1.

Sample Input:
array = [45, 61, 71, 72, 73, 0, 1, 21, 33, 45]
target = 33

Sample Output:
8

Test Cases:
1. array = [45, 61, 71, 72, 73, 0, 1, 21, 33, 45], target = 33
   Expected Output: 8

2. array = [5, 23, 111, 1], target = 111
   Expected Output: 2

3. array = [111, 1, 5, 23], target = 5
   Expected Output: 2

4. array = [23, 111, 1, 5], target = 35
   Expected Output: -1

5. array = [61, 71, 72, 73, 0, 1, 21, 33, 45, 45], target = 45
   Expected Output: 8 // Note: could also be 9 since 45 appears twice

Solution Approaches:
1. Modified Binary Search: O(log(n)) time | O(1) space
   - Find pivot point where array was shifted
   - Perform binary search on correct portion of array
*/

function shiftedBinarySearch(array, target) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [45, 61, 71, 72, 73, 0, 1, 21, 33, 45],
        target: 33,
        expected: 8
    },
    {
        array: [5, 23, 111, 1],
        target: 111,
        expected: 2
    },
    {
        array: [111, 1, 5, 23],
        target: 5,
        expected: 2
    },
    {
        array: [23, 111, 1, 5],
        target: 35,
        expected: -1
    },
    {
        array: [61, 71, 72, 73, 0, 1, 21, 33, 45, 45],
        target: 45,
        expected: 8 // Note: could also be 9 since 45 appears twice
    },
    {
        array: [3, 4, 5, 6, 7, 8, 9, 1, 2],
        target: 9,
        expected: 6
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = shiftedBinarySearch([...testCase.array], testCase.target);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`Target: ${testCase.target}`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        // Special handling for the case where target appears multiple times
        const passed = result === testCase.expected || 
                      (testCase.array[result] === testCase.target && 
                       testCase.array[testCase.expected] === testCase.target);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
