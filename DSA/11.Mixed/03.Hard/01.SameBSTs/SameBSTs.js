/*
Same BSTs

An array of integers is said to represent the Binary Search Tree (BST) obtained
by inserting each integer in the array (from left to right) into an initially
empty BST.

Write a function that takes in two arrays of integers and determines whether
these arrays represent the same BST. Note that you're not allowed to construct
any BSTs in your code.

A BST is a Binary Tree that consists only of BST nodes. A node is a BST node if
and only if it satisfies the BST property: its value is strictly greater than
the values of every node to its left; its value is less than or equal to the
values of every node to its right; and its children nodes are either BST nodes
themselves or None/null.

Sample Input:
arrayOne = [10, 15, 8, 12, 94, 81, 5, 2, 11]
arrayTwo = [10, 8, 5, 15, 2, 12, 11, 94, 81]

Sample Output:
true
// both arrays represent the following BST:
//          10
//        /    \\
//       8      15
//      /      /  \\
//     5     12    94
//    /     /     /
//   2     11    81
*/

function sameBsts(arrayOne, arrayTwo) {
    // Base cases
    if (arrayOne.length !== arrayTwo.length) return false;
    if (arrayOne.length === 0 && arrayTwo.length === 0) return true;
    if (arrayOne[0] !== arrayTwo[0]) return false;
    
    // Get smaller and larger numbers for both arrays
    const [smallerOne, largerOne] = getSmallerAndLarger(arrayOne);
    const [smallerTwo, largerTwo] = getSmallerAndLarger(arrayTwo);
    
    // Recursively check if smaller and larger subtrees are the same
    return sameBsts(smallerOne, smallerTwo) && sameBsts(largerOne, largerTwo);
}

function getSmallerAndLarger(array) {
    const smaller = [];
    const larger = [];
    const root = array[0];
    
    // Start from index 1 since we don't include the root
    for (let i = 1; i < array.length; i++) {
        if (array[i] < root) {
            smaller.push(array[i]);
        } else {
            larger.push(array[i]);
        }
    }
    
    return [smaller, larger];
}

// Test Cases
function runTests() {
    const testCases = [
        {
            arrayOne: [10, 15, 8, 12, 94, 81, 5, 2, 11],
            arrayTwo: [10, 8, 5, 15, 2, 12, 11, 94, 81],
            expected: true,
            description: "Sample test case"
        },
        {
            arrayOne: [1, 2, 3, 4, 5],
            arrayTwo: [1, 2, 3, 4, 5],
            expected: true,
            description: "Identical arrays"
        },
        {
            arrayOne: [5, 2, 7],
            arrayTwo: [5, 7, 2],
            expected: false,
            description: "Different order changes BST structure"
        },
        {
            arrayOne: [],
            arrayTwo: [],
            expected: true,
            description: "Empty arrays"
        },
        {
            arrayOne: [1],
            arrayTwo: [1],
            expected: true,
            description: "Single element"
        },
        {
            arrayOne: [10, 8, 5, 15, 2, 12, 11, 94, 81],
            arrayTwo: [10, 8, 5, 15, 2, 12, 11, 94, 82],
            expected: false,
            description: "Different last element"
        },
        {
            arrayOne: [10, 15, 8, 12, 94, 81, 5, 2],
            arrayTwo: [10, 8, 5, 15, 2, 12, 94, 81],
            expected: true,
            description: "Different order but same BST"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log("Array One:", testCase.arrayOne);
        console.log("Array Two:", testCase.arrayTwo);
        
        const result = sameBsts(testCase.arrayOne, testCase.arrayTwo);
        console.log("Expected:", testCase.expected);
        console.log("Got:", result);
        
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
