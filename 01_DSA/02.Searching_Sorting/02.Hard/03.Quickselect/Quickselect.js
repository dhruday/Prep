/*
Quickselect

Problem Statement:
Write a function that takes in an array of distinct integers as well as an integer k and returns
the kth smallest number in that array. The function should do this in linear time on average.

For example, if k equals 3 and the input array is [8, 5, 2, 9, 7, 6, 3], the 3rd smallest number
is 5, so the function should return 5.

Note: The algorithm should work even if the input array is not sorted.

Sample Input:
array = [8, 5, 2, 9, 7, 6, 3]
k = 3

Sample Output:
5  // 3rd smallest number in the array

Explanation:
If we sort the array: [2, 3, 5, 6, 7, 8, 9]
k = 3 corresponds to index 2 (0-based), which contains 5

Test Cases:
1. array = [8, 5, 2, 9, 7, 6, 3], k = 3
   Expected Output: 5

2. array = [1, 2, 3, 4, 5], k = 1
   Expected Output: 1 // smallest element

3. array = [43, 24, 37, 12, 4, 92, 49], k = 5
   Expected Output: 43

4. array = [20, 10, 30, 40, 50], k = 5
   Expected Output: 50 // largest element

5. array = [15], k = 1
   Expected Output: 15 // only element

Solution Approaches:
1. Quickselect Algorithm (Optimal): O(n) average time | O(1) space
   - Similar to QuickSort but only explores one partition
   - Uses pivot selection and partitioning
   - Only recurses on the relevant partition

2. Sorting Approach (Not Optimal): O(n log(n)) time | O(1) space
   - Sort the array
   - Return the kth element
*/

function quickselect(array, k) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [8, 5, 2, 9, 7, 6, 3],
        k: 3,
        expected: 5
    },
    {
        array: [1, 2, 3, 4, 5],
        k: 1,
        expected: 1
    },
    {
        array: [43, 24, 37, 12, 4, 92, 49],
        k: 5,
        expected: 43
    },
    {
        array: [20, 10, 30, 40, 50],
        k: 5,
        expected: 50
    },
    {
        array: [15],
        k: 1,
        expected: 15
    },
    {
        array: [100, 23, 45, 67, 89, 34, 12],
        k: 4,
        expected: 45
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = quickselect([...testCase.array], testCase.k);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`k: ${testCase.k}`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
