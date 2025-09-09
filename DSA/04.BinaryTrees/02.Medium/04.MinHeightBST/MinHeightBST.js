/*
Min Height BST

Problem Statement:
Write a function that takes in a non-empty sorted array of distinct integers, constructs a
BST from the integers, and returns the root of the BST.

The function should minimize the height of the BST. In other words, you should construct
a BST such that any two leaf nodes don't have heights that differ by more than one.

You can assume that there will be no duplicate values in the array.

Sample Input:
array = [1, 2, 5, 7, 10, 13, 14, 15, 22]

Sample Output:
         10
       /     \
      2      14
    /  \    /  \
   1    5  13   15
         \        \
          7        22
// This is one example of a BST with min height
// that you could create from the input array.
// You could create other BSTs with min height
// from the same array; for example:
//          10
//        /     \
//       5      15
//     /  \    /  \
//    2    7  13   22
//   /
//  1
// The min height of the BST is 4

Test Cases:
1. array = [1, 2, 5, 7, 10, 13, 14, 15, 22]
   Expected: Min height BST with height 4

2. array = [1]
   Expected: Single node BST

3. array = [1, 2]
   Expected: Two-node BST

4. array = [1, 2, 3, 4, 5, 6, 7]
   Expected: Balanced BST with height 3

5. array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
   Expected: Balanced BST with height 4

Solution Approaches:
1. Binary Search Approach (Optimal): O(n) time | O(n) space
   - Use the middle element as root
   - Recursively build left and right subtrees
   - Maintain sorted property of array

2. Sequential Insertion: O(n log(n)) time | O(n) space
   - Insert elements one by one
   - Not optimal as it doesn't guarantee minimum height
*/

class BST {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }

    insert(value) {
        if (value < this.value) {
            if (this.left === null) {
                this.left = new BST(value);
            } else {
                this.left.insert(value);
            }
        } else {
            if (this.right === null) {
                this.right = new BST(value);
            } else {
                this.right.insert(value);
            }
        }
    }
}

function minHeightBst(array) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            array: [1, 2, 5, 7, 10, 13, 14, 15, 22],
            description: "Sample array from example"
        },
        {
            array: [1],
            description: "Single element array"
        },
        {
            array: [1, 2],
            description: "Two element array"
        },
        {
            array: [1, 2, 3, 4, 5, 6, 7],
            description: "Seven element array"
        },
        {
            array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            description: "Ten element array"
        }
    ];

    testCases.forEach((testCase, index) => {
        console.log(`Test Case ${index + 1} (${testCase.description}):`);
        const bst = minHeightBst(testCase.array);
        
        // Validate BST property
        console.log("Checking if tree is a valid BST...");
        const isValidBst = validateBst(bst);
        console.log(`Valid BST: ${isValidBst ? 'Yes ✅' : 'No ❌'}`);

        // Check height
        const height = getTreeHeight(bst);
        const minPossibleHeight = Math.floor(Math.log2(testCase.array.length));
        const maxPossibleHeight = minPossibleHeight + 1;
        console.log(`Tree Height: ${height}`);
        console.log(`Expected Height Range: ${minPossibleHeight}-${maxPossibleHeight}`);
        
        const isHeightValid = height <= maxPossibleHeight;
        console.log(`Height is Minimal: ${isHeightValid ? 'Yes ✅' : 'No ❌'}`);

        // Check if all values are present
        const treeValues = [];
        inOrderTraverse(bst, treeValues);
        const hasAllValues = arraysEqual(treeValues.sort((a, b) => a - b), testCase.array);
        console.log(`Contains All Values: ${hasAllValues ? 'Yes ✅' : 'No ❌'}`);

        console.log(`Overall Status: ${isValidBst && isHeightValid && hasAllValues ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to validate BST property
function validateBst(tree, min = -Infinity, max = Infinity) {
    if (tree === null) return true;
    if (tree.value < min || tree.value >= max) return false;
    return validateBst(tree.left, min, tree.value) && 
           validateBst(tree.right, tree.value, max);
}

// Helper function to get tree height
function getTreeHeight(tree) {
    if (tree === null) return 0;
    return 1 + Math.max(getTreeHeight(tree.left), getTreeHeight(tree.right));
}

// Helper function to do inorder traversal
function inOrderTraverse(tree, array) {
    if (tree === null) return;
    inOrderTraverse(tree.left, array);
    array.push(tree.value);
    inOrderTraverse(tree.right, array);
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
