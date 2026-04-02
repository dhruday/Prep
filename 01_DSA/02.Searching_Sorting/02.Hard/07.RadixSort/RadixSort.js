/*
Radix Sort

Problem Statement:
Write a function that takes in an array of non-negative integers and returns a sorted
version of that array. Use the Radix Sort algorithm to sort the array.

Radix Sort is a non-comparative integer sorting algorithm that sorts data with integer
keys by grouping the keys by individual digits that share the same significant position
and value (place value).

Note: 
- The array will only contain non-negative integers
- Radix sort works by sorting each digit position, starting from least significant digit

Sample Input:
array = [8507, 5249, 2873, 9832, 5273, 6389, 3107]

Sample Output:
[2873, 3107, 5249, 5273, 6389, 8507, 9832]

Test Cases:
1. array = [8507, 5249, 2873, 9832, 5273, 6389, 3107]
   Expected Output: [2873, 3107, 5249, 5273, 6389, 8507, 9832]

2. array = [1]
   Expected Output: [1]

3. array = [123, 321, 432, 234, 343, 345]
   Expected Output: [123, 234, 321, 343, 345, 432]

4. array = [10000, 1000, 100, 10, 1]
   Expected Output: [1, 10, 100, 1000, 10000]

5. array = [98, 3, 44, 6, 2, 1, 5, 63, 87, 283, 4, 0]
   Expected Output: [0, 1, 2, 3, 4, 5, 6, 44, 63, 87, 98, 283]

Solution Approaches:
1. Radix Sort: O(d * n) time | O(n + k) space
   where d is the max number of digits
   and k is the range of values for each digit (10 for decimal)
   
   - Find the maximum element to know number of digits
   - For each digit position (starting from rightmost):
     * Create buckets for each possible digit (0-9)
     * Place numbers in corresponding buckets
     * Collect numbers from buckets in order
*/

function radixSort(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [8507, 5249, 2873, 9832, 5273, 6389, 3107],
        expected: [2873, 3107, 5249, 5273, 6389, 8507, 9832]
    },
    {
        array: [1],
        expected: [1]
    },
    {
        array: [123, 321, 432, 234, 343, 345],
        expected: [123, 234, 321, 343, 345, 432]
    },
    {
        array: [10000, 1000, 100, 10, 1],
        expected: [1, 10, 100, 1000, 10000]
    },
    {
        array: [98, 3, 44, 6, 2, 1, 5, 63, 87, 283, 4, 0],
        expected: [0, 1, 2, 3, 4, 5, 6, 44, 63, 87, 98, 283]
    },
    {
        array: [1000, 4, 25, 319, 88, 51, 3430, 8471, 701, 1, 2989, 657, 713],
        expected: [1, 4, 25, 51, 88, 319, 657, 701, 713, 1000, 2989, 3430, 8471]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = radixSort([...testCase.array]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Array: [${testCase.array}]`);
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
