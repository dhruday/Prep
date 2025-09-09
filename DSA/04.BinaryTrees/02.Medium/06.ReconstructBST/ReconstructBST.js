/*
Reconstruct BST

Problem Statement:
Given a preorder traversal of a Binary Search Tree (BST), write a function that reconstructs
the tree. A preorder traversal is when the root node is processed before any of its subtrees.

The input array represents a valid preorder traversal of a BST. You can assume that there
will be no duplicate values in the input array.

Sample Input:
preOrderTraversalValues = [10, 4, 2, 1, 5, 17, 19, 18]

Sample Output:
        10
       /  \
      4    17
    /  \     \
   2    5     19
 /            /
1            18

Test Cases:
1. Sample array above
   Expected Output: BST as shown above

2. Single value array
   Expected Output: Single node BST

3. Empty array
   Expected Output: null

4. Sorted array (ascending)
   Expected Output: Right-skewed BST

5. Reverse sorted array (descending)
   Expected Output: Left-skewed BST

Solution Approaches:
1. Recursive with Upper Bound (Optimal): O(n) time | O(n) space
   - Process root first
   - Find right subtree starting point using upper bound
   - Recursively process left and right portions

2. Iterative Solution: O(n) time | O(n) space
   - Use stack to track nodes
   - Keep track of valid ranges
   - More complex implementation
*/

class BST {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function reconstructBst(preOrderTraversalValues) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Test Case 1: Sample from example
    const test1 = [10, 4, 2, 1, 5, 17, 19, 18];

    // Test Case 2: Single value
    const test2 = [5];

    // Test Case 3: Empty array
    const test3 = [];

    // Test Case 4: Sorted array (ascending)
    const test4 = [1, 2, 3, 4, 5];

    // Test Case 5: Reverse sorted array (descending)
    const test5 = [5, 4, 3, 2, 1];

    const testCases = [
        {
            values: test1,
            description: "Sample from example"
        },
        {
            values: test2,
            description: "Single value array"
        },
        {
            values: test3,
            description: "Empty array"
        },
        {
            values: test4,
            description: "Sorted array (ascending)"
        },
        {
            values: test5,
            description: "Reverse sorted array (descending)"
        }
    ];

    testCases.forEach((testCase, index) => {
        console.log(`Test Case ${index + 1} (${testCase.description}):`);
        const reconstructedTree = reconstructBst(testCase.values);
        
        // Validate reconstructed tree
        const isValid = validateBst(reconstructedTree);
        console.log("BST Property Valid:", isValid ? 'Yes ✅' : 'No ❌');

        // Check if preorder traversal matches input
        const preorderResult = [];
        getPreorderTraversal(reconstructedTree, preorderResult);
        const traversalMatches = arraysEqual(preorderResult, testCase.values);
        console.log("Preorder Traversal Matches:", traversalMatches ? 'Yes ✅' : 'No ❌');

        console.log("Input Array:", testCase.values);
        console.log("Reconstructed Preorder:", preorderResult);
        console.log(`Overall Status: ${isValid && traversalMatches ? 'PASSED ✅' : 'FAILED ❌'}`);
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

// Helper function to get preorder traversal
function getPreorderTraversal(tree, array) {
    if (tree === null) return;
    array.push(tree.value);
    getPreorderTraversal(tree.left, array);
    getPreorderTraversal(tree.right, array);
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
