/*
Binary Search

Problem Statement:
Write a function that takes in a sorted array of integers and a target integer. The function should
use the Binary Search algorithm to find if the target number is contained in the array and should
return its index if it is, otherwise -1.

Sample Input:
array = [0, 1, 21, 33, 45, 45, 61, 71, 72, 73]
target = 33

Sample Output:
3

Test Cases:
1. array = [0, 1, 21, 33, 45, 45, 61, 71, 72, 73], target = 33
   Expected Output: 3

2. array = [1, 5, 23, 111], target = 111
   Expected Output: 3

3. array = [1, 5, 23, 111], target = 5
   Expected Output: 1

4. array = [1, 5, 23, 111], target = 35
   Expected Output: -1

5. array = [0, 1, 21, 33, 45, 45, 61, 71, 72, 73], target = 45
   Expected Output: 4 // Note: could also be 5 since 45 appears twice

Solution Approaches:
1. Binary Search: O(log(n)) time | O(1) space
   - Initialize left and right pointers
   - Find middle element and compare with target
   - Adjust pointers based on comparison
*/

function binarySearch(array, target) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [0, 1, 21, 33, 45, 45, 61, 71, 72, 73],
        target: 33,
        expected: 3
    },
    {
        array: [1, 5, 23, 111],
        target: 111,
        expected: 3
    },
    {
        array: [1, 5, 23, 111],
        target: 5,
        expected: 1
    },
    {
        array: [1, 5, 23, 111],
        target: 35,
        expected: -1
    },
    {
        array: [0, 1, 21, 33, 45, 45, 61, 71, 72, 73],
        target: 45,
        expected: 4 // Note: could also be 5 since 45 appears twice
    },
    {
        array: [1],
        target: 1,
        expected: 0
    },
    {
        array: [],
        target: 1,
        expected: -1
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = binarySearch([...testCase.array], testCase.target);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`Target: ${testCase.target}`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        // Special handling for the case where target appears multiple times
        const passed = result === testCase.expected || 
                      (testCase.target === 45 && (result === 4 || result === 5));
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
