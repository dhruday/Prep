/*
Two Number Sum

Problem Statement:
Write a function that takes in a non-empty array of distinct integers and an integer representing a target sum.
If any two numbers in the input array sum up to the target sum, the function should return them in an array, in any order.
If no two numbers sum up to the target sum, the function should return an empty array.

Note: 
- You can't add a number to itself to get the target sum
- There will be at most one pair of numbers summing up to the target sum

Sample Input:
array = [3, 5, -4, 8, 11, 1, -1, 6]
targetSum = 10

Sample Output:
[-1, 11] // or [11, -1]
The numbers could be in reverse order - both are valid answers

Test Cases:
1. array = [3, 5, -4, 8, 11, 1, -1, 6], targetSum = 10
   Expected Output: [-1, 11]
2. array = [4, 6], targetSum = 10
   Expected Output: [4, 6]
3. array = [4, 6, 1], targetSum = 5
   Expected Output: [4, 1]
4. array = [1, 2, 3, 4, 5, 6, 7, 8, 9], targetSum = 17
   Expected Output: [8, 9]
5. array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 15], targetSum = 18
   Expected Output: [3, 15]

Solution Approaches:
1. Brute Force: O(n²) time | O(1) space
   - Use nested loops to check every pair of numbers
   
2. Hash Table: O(n) time | O(n) space
   - Store visited numbers in a hash table
   - For each number, check if its complement exists in the hash table

3. Two Pointer: O(nlog(n)) time | O(1) space
   - Sort the array
   - Use left and right pointers to find the pair
*/

function twoNumberSum(array, targetSum) {
    const complementMap = new Map();
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        const complement = targetSum - element;
        if (complementMap.has(complement)) {
            return [complementMap.get(complement), element];
        }
        complementMap.set(element, element);
    }
    return [];
}

// Test Cases
const testCases = [
    {
        array: [3, 5, -4, 8, 11, 1, -1, 6],
        targetSum: 10,
        expected: [-1, 11]
    },
    {
        array: [4, 6],
        targetSum: 10,
        expected: [4, 6]
    },
    {
        array: [4, 6, 1],
        targetSum: 5,
        expected: [4, 1]
    },
    {
        array: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        targetSum: 17,
        expected: [8, 9]
    },
    {
        array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 15],
        targetSum: 18,
        expected: [3, 15]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = twoNumberSum(testCase.array, testCase.targetSum);
        const sortedResult = result.sort((a, b) => a - b);
        const sortedExpected = testCase.expected.sort((a, b) => a - b);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Array: [${testCase.array}]`);
        console.log(`Target Sum: ${testCase.targetSum}`);
        console.log(`Your Output: [${result}]`);
        console.log(`Expected Output: [${testCase.expected}]`);
        console.log(`Status: ${JSON.stringify(sortedResult) === JSON.stringify(sortedExpected) ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
