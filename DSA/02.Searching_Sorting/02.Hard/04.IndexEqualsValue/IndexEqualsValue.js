/*
Index Equals Value

Problem Statement:
Write a function that takes in a sorted array of distinct integers and returns the first index
in the array that equals its value (in other words, the first index i for which array[i] = i).
If there is no such index, return -1.

Note: The array will be sorted in ascending order and will contain distinct integers
(no duplicates).

Sample Input:
array = [-5, -3, 0, 3, 4, 5, 9]

Sample Output:
3  // array[3] = 3

Test Cases:
1. array = [-5, -3, 0, 3, 4, 5, 9]
   Expected Output: 3

2. array = [-8, -5, -2, 0, 3, 6]
   Expected Output: -1

3. array = [0, 1, 2, 3, 4, 5]
   Expected Output: 0

4. array = [-1, 0, 2, 3, 4]
   Expected Output: 2

5. array = [-1, 1, 3, 5, 7]
   Expected Output: -1

Solution Approaches:
1. Binary Search (Optimal): O(log(n)) time | O(1) space
   - Use binary search since array is sorted
   - For each middle index, compare array[mid] with mid
   - If array[mid] = mid, look for earlier occurrence in left half
   - If array[mid] < mid, search right half
   - If array[mid] > mid, search left half

2. Linear Search (Not Optimal): O(n) time | O(1) space
   - Iterate through array
   - Return first index where array[i] = i
*/

function indexEqualsValue(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [-5, -3, 0, 3, 4, 5, 9],
        expected: 3
    },
    {
        array: [-8, -5, -2, 0, 3, 6],
        expected: -1
    },
    {
        array: [0, 1, 2, 3, 4, 5],
        expected: 0
    },
    {
        array: [-1, 0, 2, 3, 4],
        expected: 2
    },
    {
        array: [-1, 1, 3, 5, 7],
        expected: -1
    },
    {
        array: [-10, -5, 0, 5, 10],
        expected: 5
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = indexEqualsValue([...testCase.array]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
