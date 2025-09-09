/*
Sort Stack

Problem Statement:
Write a function that takes in an array of integers representing a stack, recursively
sorts the stack in place (i.e., doesn't create a brand new array), and returns it.

The array must be treated as a stack, with the end of the array as the top of the
stack. Therefore, you're only allowed to:
1. Pop elements from the top of the stack by removing elements from the end of the array
2. Push elements to the top of the stack by appending elements to the end of the array
3. Peek at the element on top of the stack by accessing the last element in the array

You're not allowed to perform any other operations on the input array, including
accessing elements (except for the last element), moving elements, etc. You're also
not allowed to use any other data structures, and your solution must be recursive.

Sample Input:
stack = [-5, 2, -2, 4, 3, 1]

Sample Output:
[-5, -2, 1, 2, 3, 4] // sorted in ascending order

Test Cases:
1. Sample case above
2. Empty stack
3. Single element stack
4. Two element stack
5. Stack with duplicate values
6. Already sorted stack
7. Reverse sorted stack
8. Stack with negative numbers
*/

function sortStack(stack) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [-5, 2, -2, 4, 3, 1],
            expected: [-5, -2, 1, 2, 3, 4],
            description: "Sample case from example"
        },
        {
            input: [],
            expected: [],
            description: "Empty stack"
        },
        {
            input: [5],
            expected: [5],
            description: "Single element stack"
        },
        {
            input: [2, 1],
            expected: [1, 2],
            description: "Two element stack"
        },
        {
            input: [3, 3, 3, 3],
            expected: [3, 3, 3, 3],
            description: "Stack with duplicate values"
        },
        {
            input: [1, 2, 3, 4, 5],
            expected: [1, 2, 3, 4, 5],
            description: "Already sorted stack"
        },
        {
            input: [5, 4, 3, 2, 1],
            expected: [1, 2, 3, 4, 5],
            description: "Reverse sorted stack"
        },
        {
            input: [-1, -5, 2, 0, -3, 4],
            expected: [-5, -3, -1, 0, 2, 4],
            description: "Stack with negative numbers"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Clone input array to avoid modifying the original test case
        const stack = [...testCase.input];
        
        // Sort the stack
        sortStack(stack);
        
        // Compare with expected
        const passed = JSON.stringify(stack) === JSON.stringify(testCase.expected);
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(stack)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Helper Functions for Testing (do not modify)
function peek(stack) {
    return stack[stack.length - 1];
}

function pop(stack) {
    return stack.pop();
}

function push(stack, value) {
    stack.push(value);
}

// Run the tests
runTests();
