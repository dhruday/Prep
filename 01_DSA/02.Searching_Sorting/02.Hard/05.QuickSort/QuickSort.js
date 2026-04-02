/*
Quick Sort

Problem Statement:
Write a function that takes in an array of integers and returns a sorted version of that array.
Use the Quick Sort algorithm to sort the array.

Quick Sort works by:
1. Selecting a 'pivot' element from the array
2. Partitioning the other elements into two sub-arrays:
   - Elements less than the pivot
   - Elements greater than the pivot
3. Recursively applying the above steps to the sub-arrays

Sample Input:
array = [8, 5, 2, 9, 5, 6, 3]

Sample Output:
[2, 3, 5, 5, 6, 8, 9]

Test Cases:
1. array = [8, 5, 2, 9, 5, 6, 3]
   Expected Output: [2, 3, 5, 5, 6, 8, 9]

2. array = [1]
   Expected Output: [1]

3. array = [1, 2, 3, 4, 5]
   Expected Output: [1, 2, 3, 4, 5]

4. array = [5, 4, 3, 2, 1]
   Expected Output: [1, 2, 3, 4, 5]

5. array = [-4, 5, 10, 8, -10, -6, -4, -2, -5, 3, 5, -4, -5, -1, 1, 6, -7, -6, -7, 8]
   Expected Output: [-10, -7, -7, -6, -6, -5, -5, -4, -4, -4, -2, -1, 1, 3, 5, 5, 6, 8, 8, 10]

Solution Approaches:
1. In-place Quick Sort (Best): O(n log(n)) average time | O(log(n)) space
   - Choose pivot (usually rightmost element)
   - Partition array around pivot
   - Recursively sort sub-arrays
   - Best case: Balanced partitions
   - Worst case: Already sorted array with last element as pivot

2. Alternative Quick Sort: O(n log(n)) average time | O(n) space
   - Create separate arrays for elements less than and greater than pivot
   - Combine arrays after sorting
   - Uses more space but can be easier to implement
*/

function quickSort(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [8, 5, 2, 9, 5, 6, 3],
        expected: [2, 3, 5, 5, 6, 8, 9]
    },
    {
        array: [1],
        expected: [1]
    },
    {
        array: [1, 2, 3, 4, 5],
        expected: [1, 2, 3, 4, 5]
    },
    {
        array: [5, 4, 3, 2, 1],
        expected: [1, 2, 3, 4, 5]
    },
    {
        array: [-4, 5, 10, 8, -10, -6, -4, -2, -5, 3, 5, -4, -5, -1, 1, 6, -7, -6, -7, 8],
        expected: [-10, -7, -7, -6, -6, -5, -5, -4, -4, -4, -2, -1, 1, 3, 5, 5, 6, 8, 8, 10]
    },
    {
        array: [5, 2, 8, 1, 9, 3, 7, 6, 4],
        expected: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = quickSort([...testCase.array]);
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
