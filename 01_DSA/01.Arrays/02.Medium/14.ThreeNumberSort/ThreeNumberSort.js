/*
Three Number Sort

Problem Statement:
You're given an array of integers and another array of three distinct integers. The first array is guaranteed
to only contain integers that are in the second array, and the second array represents a desired order for
the integers in the first array. For example, a second array of [x, y, z] represents a desired order of
[x, x, ..., x, y, y, ..., y, z, z, ..., z] in the first array.

Write a function that sorts the first array according to the desired order in the second array.

The function should perform this in place (i.e., it should mutate the input array), and it shouldn't use
any auxiliary space (i.e., it should run with constant space: O(1) space).

Note: the desired order array will always have length 3, and the first array will always be valid (containing
only integers from the desired order array).

Sample Input:
array = [1, 0, 0, -1, -1, 0, 1, 1]
order = [0, 1, -1]

Sample Output:
[0, 0, 0, 1, 1, 1, -1, -1] // The numbers are sorted according to the desired order

Test Cases:
1. array = [1, 0, 0, -1, -1, 0, 1, 1], order = [0, 1, -1]
   Expected Output: [0, 0, 0, 1, 1, 1, -1, -1]

2. array = [7, 8, 9, 7, 8, 9, 9, 9, 9, 8, 8], order = [8, 7, 9]
   Expected Output: [8, 8, 8, 8, 7, 7, 9, 9, 9, 9, 9]

3. array = [1, 2, 3, 3, 2, 1], order = [1, 2, 3]
   Expected Output: [1, 1, 2, 2, 3, 3]

4. array = [0, 1, 2], order = [2, 1, 0]
   Expected Output: [2, 1, 0]

5. array = [4, 4, 4], order = [4, 5, 6]
   Expected Output: [4, 4, 4]

Solution Approaches:
1. Two Passes: O(n) time | O(1) space
   - First pass: swap first number to front
   - Second pass: swap last number to back
   - Middle number falls into place

2. Three Pointers: O(n) time | O(1) space
   - One pointer for each number
   - Swap elements into position
*/

function threeNumberSort(array, order) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [1, 0, 0, -1, -1, 0, 1, 1],
        order: [0, 1, -1],
        expected: [0, 0, 0, 1, 1, 1, -1, -1]
    },
    {
        array: [7, 8, 9, 7, 8, 9, 9, 9, 9, 8, 8],
        order: [8, 7, 9],
        expected: [8, 8, 8, 8, 7, 7, 9, 9, 9, 9, 9]
    },
    {
        array: [1, 2, 3, 3, 2, 1],
        order: [1, 2, 3],
        expected: [1, 1, 2, 2, 3, 3]
    },
    {
        array: [0, 1, 2],
        order: [2, 1, 0],
        expected: [2, 1, 0]
    },
    {
        array: [4, 4, 4],
        order: [4, 5, 6],
        expected: [4, 4, 4]
    },
    {
        array: [0, 1, 0],
        order: [0, 1, 2],
        expected: [0, 0, 1]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const arrayToSort = [...testCase.array];
        threeNumberSort(arrayToSort, testCase.order);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Original Array: [${testCase.array}]`);
        console.log(`Order: [${testCase.order}]`);
        console.log(`Your Output: [${arrayToSort}]`);
        console.log(`Expected Output: [${testCase.expected}]`);
        const passed = arraysEqual(arrayToSort, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare arrays
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

// Run the tests
runTests();
