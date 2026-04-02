/*
Height Balanced Binary Tree

Problem Statement:
Write a function that takes in a Binary Tree and returns a boolean representing whether
or not it's height-balanced.

A binary tree is height-balanced if for each node in the tree, the difference between
the height of its left subtree and the height of its right subtree is at most 1.

Each BinaryTree node has an integer value, a left child node, and a right child node.
Children nodes can either be BinaryTree nodes themselves or None / null.

Sample Input:
tree =          1
              /   \
             2     3
           /   \     \
          4     5     6
              /   \
             7     8

Sample Output:
true
// This tree is height balanced because for each node:
// Node 1: |height(2) - height(3)| = |3 - 2| = 1
// Node 2: |height(4) - height(5)| = |1 - 2| = 1
// Node 3: |height(null) - height(6)| = |0 - 1| = 1
// Node 4: |height(null) - height(null)| = |0 - 0| = 0
// Node 5: |height(7) - height(8)| = |1 - 1| = 0
// Node 6: |height(null) - height(null)| = |0 - 0| = 0
// Node 7: |height(null) - height(null)| = |0 - 0| = 0
// Node 8: |height(null) - height(null)| = |0 - 0| = 0

Test Cases:
1. Sample tree above
2. Empty tree (null)
3. Single node tree
4. Unbalanced tree
5. Perfect binary tree
6. Left-heavy tree
7. Right-heavy tree
8. Tree with multiple levels of imbalance
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function heightBalancedBinaryTree(tree) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Helper function to create tree from array representation
    function createTree(values, index = 0) {
        if (index >= values.length || values[index] === null) return null;
        
        const node = new BinaryTree(values[index]);
        node.left = createTree(values, 2 * index + 1);
        node.right = createTree(values, 2 * index + 2);
        return node;
    }

    const testCases = [
        {
            tree: [1, 2, 3, 4, 5, null, 6, null, null, 7, 8],
            expected: true,
            description: "Sample balanced tree from example"
        },
        {
            tree: [],
            expected: true,
            description: "Empty tree"
        },
        {
            tree: [1],
            expected: true,
            description: "Single node tree"
        },
        {
            tree: [1, 2, null, 3, null, null, null, 4],
            expected: false,
            description: "Unbalanced tree (left heavy)"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            expected: true,
            description: "Perfect binary tree"
        },
        {
            tree: [1, 2, 3, 4, 5, null, null, 6],
            expected: false,
            description: "Left-heavy imbalanced tree"
        },
        {
            tree: [1, null, 2, null, null, null, 3, null, null, null, null, null, null, null, 4],
            expected: false,
            description: "Right-heavy imbalanced tree"
        },
        {
            tree: [1, 2, 3, 4, null, null, 5, 6, null, null, null, null, null, null, 7],
            expected: false,
            description: "Multiple levels of imbalance"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input tree
        const tree = createTree(testCase.tree);
        
        // Check if height balanced
        const result = heightBalancedBinaryTree(tree);
        
        // Compare with expected
        const passed = result === testCase.expected;
        console.log(`Input Tree: ${JSON.stringify(testCase.tree)}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
