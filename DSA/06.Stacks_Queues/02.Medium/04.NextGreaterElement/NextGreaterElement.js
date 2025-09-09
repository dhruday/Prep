/*
Next Greater Element

Problem Statement:
Write a function that takes in an array of integers and returns a new array containing,
at each index, the next element in the input array that's greater than the element at
that index in the input array.

In other words, your function should return a new array where outputArray[i] is the
next element in the input array that's greater than inputArray[i]. If there's no such
next greater element for a particular index, the value at that index in the output
array should be -1. For example, given array = [1, 2], your function should return
[2, -1].

Additionally, your function should treat the input array as a circular array. A
circular array wraps around itself as if it were connected end-to-end. So the next
greater element after the last element in a circular array can be the first element
in the array if it's greater.

Sample Input:
array = [2, 5, -3, -4, 6, 7, 2]

Sample Output:
[5, 6, 6, 6, 7, -1, 5]

Test Cases:
1. Sample case above
2. Empty array
3. Single element array
4. Array with all same values
5. Strictly increasing array
6. Strictly decreasing array
7. Array with negative numbers
8. Array where circular property is needed
*/

function nextGreaterElement(array) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [2, 5, -3, -4, 6, 7, 2],
            expected: [5, 6, 6, 6, 7, -1, 5],
            description: "Sample case from example"
        },
        {
            input: [],
            expected: [],
            description: "Empty array"
        },
        {
            input: [5],
            expected: [-1],
            description: "Single element array"
        },
        {
            input: [3, 3, 3, 3],
            expected: [-1, -1, -1, -1],
            description: "Array with all same values"
        },
        {
            input: [1, 2, 3, 4, 5],
            expected: [2, 3, 4, 5, -1],
            description: "Strictly increasing array"
        },
        {
            input: [5, 4, 3, 2, 1],
            expected: [-1, 5, 5, 5, 5],
            description: "Strictly decreasing array"
        },
        {
            input: [-5, -4, -3, -2, -1],
            expected: [-4, -3, -2, -1, -5],
            description: "Array with negative numbers"
        },
        {
            input: [5, 3, 1, 2, 4],
            expected: [-1, 4, 2, 4, 5],
            description: "Array where circular property is needed"
        },
        {
            input: [1, 2, 1],
            expected: [2, -1, 2],
            description: "Simple circular case"
        },
        {
            input: [7, 6, 5, 4, 3, 2, 1],
            expected: [-1, 7, 7, 7, 7, 7, 7],
            description: "Decreasing with circular property"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Find next greater elements
        const result = nextGreaterElement(testCase.input);
        
        // Compare with expected
        const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
