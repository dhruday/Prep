/*
Subarray Sort

Problem Statement:
Write a function that takes in an array of integers of length at least 2. The function should return an array of
the starting and ending indices of the smallest subarray in the input array that needs to be sorted in place in
order for the entire input array to be sorted in ascending order.

If the input array is already sorted, the function should return [-1, -1].

Sample Input:
array = [1, 2, 4, 7, 10, 11, 7, 12, 6, 7, 16, 18, 19]

Sample Output:
[3, 9]
// The subarray from index 3 to index 9 needs to be sorted: [7, 10, 11, 7, 12, 6, 7]
// After sorting this subarray, the whole array will be sorted

Test Cases:
1. array = [1, 2, 4, 7, 10, 11, 7, 12, 6, 7, 16, 18, 19]
   Expected Output: [3, 9]

2. array = [1, 2, 4, 7, 10, 11, 7, 12, 7, 7, 16, 18, 19]
   Expected Output: [4, 9]

3. array = [1, 2, 3, 4, 5]
   Expected Output: [-1, -1]

4. array = [2, 1]
   Expected Output: [0, 1]

5. array = [1, 2, 3, 4, 5, 6, 8, 7, 9, 10, 11]
   Expected Output: [6, 7]

Solution Approaches:
1. Find Unsorted Numbers: O(n) time | O(1) space
   - Find min and max numbers that are out of order
   - Find their correct positions in array
   - Return indices of these positions
*/

function subarraySort(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [1, 2, 4, 7, 10, 11, 7, 12, 6, 7, 16, 18, 19],
        expected: [3, 9]
    },
    {
        array: [1, 2, 4, 7, 10, 11, 7, 12, 7, 7, 16, 18, 19],
        expected: [4, 9]
    },
    {
        array: [1, 2, 3, 4, 5],
        expected: [-1, -1]
    },
    {
        array: [2, 1],
        expected: [0, 1]
    },
    {
        array: [1, 2, 3, 4, 5, 6, 8, 7, 9, 10, 11],
        expected: [6, 7]
    },
    {
        array: [2, 1, 3, 4, 5, 6, 7],
        expected: [0, 1]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = subarraySort([...testCase.array]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`Your Output: [${result}]`);
        console.log(`Expected Output: [${testCase.expected}]`);
        const passed = arraysEqual(result, testCase.expected);
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
