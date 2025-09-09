/*
Move Element To End

Problem Statement:
You're given an array of integers and an integer. Write a function that moves all instances of that integer
in the array to the end of the array and returns the array.

The function should perform this in place (i.e., it should mutate the input array) and doesn't need to
maintain the order of the other integers.

Sample Input:
array = [2, 1, 2, 2, 2, 3, 4, 2]
toMove = 2

Sample Output:
[1, 3, 4, 2, 2, 2, 2, 2] // the numbers 1, 3, and 4 could be ordered differently

Test Cases:
1. array = [2, 1, 2, 2, 2, 3, 4, 2]
   toMove = 2
   Expected Output: [1, 3, 4, 2, 2, 2, 2, 2]

2. array = []
   toMove = 3
   Expected Output: []

3. array = [1, 2, 4, 5, 6]
   toMove = 3
   Expected Output: [1, 2, 4, 5, 6]

4. array = [3, 3, 3, 3, 3]
   toMove = 3
   Expected Output: [3, 3, 3, 3, 3]

5. array = [3, 1, 2, 4, 5]
   toMove = 3
   Expected Output: [1, 2, 4, 5, 3]

Solution Approaches:
1. Two Pointers: O(n) time | O(1) space
   - Use two pointers (left and right)
   - Move elements not equal to toMove to the left
   - All elements equal to toMove end up on the right
*/

function moveElementToEnd(array, toMove) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [2, 1, 2, 2, 2, 3, 4, 2],
        toMove: 2,
        expected: [1, 3, 4, 2, 2, 2, 2, 2]
    },
    {
        array: [],
        toMove: 3,
        expected: []
    },
    {
        array: [1, 2, 4, 5, 6],
        toMove: 3,
        expected: [1, 2, 4, 5, 6]
    },
    {
        array: [3, 3, 3, 3, 3],
        toMove: 3,
        expected: [3, 3, 3, 3, 3]
    },
    {
        array: [3, 1, 2, 4, 5],
        toMove: 3,
        expected: [1, 2, 4, 5, 3]
    }
];

// Helper function to validate result
function isValidResult(original, result, toMove) {
    if (original.length !== result.length) return false;
    
    // Count occurrences of toMove in both arrays
    const originalCount = original.filter(x => x === toMove).length;
    const resultCount = result.filter(x => x === toMove).length;
    if (originalCount !== resultCount) return false;
    
    // Check if all toMove elements are at the end
    let nonMoveFound = false;
    for (let i = result.length - 1; i >= 0; i--) {
        if (result[i] !== toMove) nonMoveFound = true;
        else if (nonMoveFound) return false;
    }
    
    // Check if all non-toMove elements are preserved
    const originalNonMove = original.filter(x => x !== toMove).sort();
    const resultNonMove = result.filter(x => x !== toMove).sort();
    return JSON.stringify(originalNonMove) === JSON.stringify(resultNonMove);
}

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const arrayToModify = [...testCase.array];
        const result = moveElementToEnd(arrayToModify, testCase.toMove);
        const isValid = isValidResult(testCase.array, result, testCase.toMove);
        
        console.log(`Test Case ${index + 1}:`);
        console.log(`Original Array: [${testCase.array}]`);
        console.log(`Element to Move: ${testCase.toMove}`);
        console.log(`Your Output: [${result}]`);
        console.log(`Example Expected Output: [${testCase.expected}]`);
        console.log(`Status: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
