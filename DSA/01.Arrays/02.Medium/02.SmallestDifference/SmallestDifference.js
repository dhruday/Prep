/*
Smallest Difference

Problem Statement:
Write a function that takes in two non-empty arrays of integers and finds the pair of numbers (one from each array)
whose absolute difference is closest to zero. The function should return an array containing these two numbers,
with the number from the first array in the first position.

Note that the absolute difference of two integers is the distance between them on the real number line.
For example, the absolute difference of -5 and 5 is 10, and the absolute difference of -5 and -4 is 1.

You can assume that there will only be one pair of numbers with the smallest difference.

Sample Input:
arrayOne = [-1, 5, 10, 20, 28, 3]
arrayTwo = [26, 134, 135, 15, 17]

Sample Output:
[28, 26] // The smallest difference is 2 (28 - 26 = 2)

Test Cases:
1. arrayOne = [-1, 5, 10, 20, 28, 3]
   arrayTwo = [26, 134, 135, 15, 17]
   Expected Output: [28, 26]

2. arrayOne = [10, 0, 20, 25, 2000]
   arrayTwo = [1005, 1006, 1014, 1032, 1031]
   Expected Output: [2000, 1032]

3. arrayOne = [240, 124, 86, 111, 2, 84, 954, 27, 89]
   arrayTwo = [1, 3, 954, 19, 8]
   Expected Output: [954, 954]

4. arrayOne = [-1, 5, 10, 20, 3]
   arrayTwo = [26, 134, 135, 15, 17]
   Expected Output: [20, 17]

Solution Approaches:
1. Two Pointers: O(nlog(n) + mlog(m)) time | O(1) space
   - Sort both arrays
   - Use two pointers to find smallest difference
   - Move pointers based on which value is smaller
*/

function smallestDifference(arrayOne, arrayTwo) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        arrayOne: [-1, 5, 10, 20, 28, 3],
        arrayTwo: [26, 134, 135, 15, 17],
        expected: [28, 26]
    },
    {
        arrayOne: [10, 0, 20, 25, 2000],
        arrayTwo: [1005, 1006, 1014, 1032, 1031],
        expected: [2000, 1032]
    },
    {
        arrayOne: [240, 124, 86, 111, 2, 84, 954, 27, 89],
        arrayTwo: [1, 3, 954, 19, 8],
        expected: [954, 954]
    },
    {
        arrayOne: [-1, 5, 10, 20, 3],
        arrayTwo: [26, 134, 135, 15, 17],
        expected: [20, 17]
    }
];

// Helper function to check if arrays are equal
function areArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = smallestDifference([...testCase.arrayOne], [...testCase.arrayTwo]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array One: [${testCase.arrayOne}]`);
        console.log(`Array Two: [${testCase.arrayTwo}]`);
        console.log(`Your Output: [${result}]`);
        console.log(`Expected Output: [${testCase.expected}]`);
        console.log(`Status: ${areArraysEqual(result, testCase.expected) ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
