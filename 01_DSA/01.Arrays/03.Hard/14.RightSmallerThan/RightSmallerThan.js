/*
Right Smaller Than

Problem Statement:
Write a function that takes in an array of integers and returns an array of the same length, where each
element in the output array corresponds to the number of integers in the input array that are to the
right of the relevant index and that are strictly smaller than the integer at that index.

In other words, the value at output[i] represents the number of integers in the input array that are
to the right of i and that are strictly smaller than input[i].

Sample Input:
array = [8, 5, 11, -1, 3, 4, 2]

Sample Output:
[5, 4, 4, 0, 1, 1, 0]
// 8 has 5 smaller numbers to the right: [5, -1, 3, 4, 2]
// 5 has 4 smaller numbers to the right: [-1, 3, 4, 2]
// 11 has 4 smaller numbers to the right: [-1, 3, 4, 2]
// -1 has 0 smaller numbers to the right
// 3 has 1 smaller number to the right: [2]
// 4 has 1 smaller number to the right: [2]
// 2 has 0 smaller numbers to the right

Test Cases:
1. array = [8, 5, 11, -1, 3, 4, 2]
   Expected Output: [5, 4, 4, 0, 1, 1, 0]

2. array = [0, 1, 1, 2, 3]
   Expected Output: [0, 0, 0, 0, 0]

3. array = [5, 4, 3, 2, 1]
   Expected Output: [4, 3, 2, 1, 0]

4. array = [1, 2, 3, 4, 5]
   Expected Output: [0, 0, 0, 0, 0]

5. array = [0, 0, 0, 0]
   Expected Output: [0, 0, 0, 0]

Solution Approaches:
1. Brute Force: O(n²) time | O(n) space
   - For each number, count smaller numbers to its right

2. BST Solution: O(nlog(n)) time | O(n) space
   - Use BST to track smaller numbers efficiently
   - Insert numbers from right to left
*/

function rightSmallerThan(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [8, 5, 11, -1, 3, 4, 2],
        expected: [5, 4, 4, 0, 1, 1, 0]
    },
    {
        array: [0, 1, 1, 2, 3],
        expected: [0, 0, 0, 0, 0]
    },
    {
        array: [5, 4, 3, 2, 1],
        expected: [4, 3, 2, 1, 0]
    },
    {
        array: [1, 2, 3, 4, 5],
        expected: [0, 0, 0, 0, 0]
    },
    {
        array: [0, 0, 0, 0],
        expected: [0, 0, 0, 0]
    },
    {
        array: [10, 5, 8, 3, 2, 7, 1, 9, 4, 6],
        expected: [8, 4, 5, 2, 1, 3, 0, 1, 0, 0]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = rightSmallerThan([...testCase.array]);
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
