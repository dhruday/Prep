/*
Binary Tree Diameter

Problem Statement:
Write a function that takes in a Binary Tree and returns its diameter. The diameter of a
binary tree is defined as the length of its longest path, even if that path doesn't pass
through the root of the tree.

A path is a collection of connected nodes in a tree where no node is connected to more
than two other nodes. The length of a path is the number of edges between the path's
first node and its last node.

Each BinaryTree node has an integer value, a left child node, and a right child node.
Children nodes can either be BinaryTree nodes themselves or None / null.

Sample Input:
tree =          1
              /   \
             3     2
           /   \     
          7     4
        /         \
       8           5
     /               \
    9                 6

Sample Output:
6  // 9 -> 8 -> 7 -> 3 -> 4 -> 5 -> 6
// The path doesn't need to go through the root (1)

Test Cases:
1. Sample tree above
2. Empty tree (null)
3. Single node tree
4. Linear tree (all nodes have only one child)
5. Perfect binary tree
6. Skewed tree (left or right)
7. Path through root
8. Path not through root
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function binaryTreeDiameter(tree) {
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
            tree: [1, 3, 2, 7, 4, null, null, 8, null, null, 5, null, null, 9, null, null, null, null, null, null, 6],
            expected: 6,
            description: "Sample tree from example"
        },
        {
            tree: [],
            expected: 0,
            description: "Empty tree"
        },
        {
            tree: [1],
            expected: 0,
            description: "Single node tree"
        },
        {
            tree: [1, 2, null, 3, null, null, null, 4],
            expected: 3,
            description: "Linear tree"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            expected: 4,
            description: "Perfect binary tree"
        },
        {
            tree: [1, 2, null, 3, null, null, null, 4],
            expected: 3,
            description: "Left-skewed tree"
        },
        {
            tree: [1, null, 2, null, null, null, 3, null, null, null, null, null, null, null, 4],
            expected: 3,
            description: "Right-skewed tree"
        },
        {
            tree: [1, 2, 3, 4, null, null, 5],
            expected: 4,
            description: "Path through root"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input tree
        const tree = createTree(testCase.tree);
        
        // Calculate diameter
        const result = binaryTreeDiameter(tree);
        
        // Compare with expected
        const passed = result === testCase.expected;
        console.log(`Input Tree: ${JSON.stringify(testCase.tree)}`);
        console.log(`Expected Diameter: ${testCase.expected}`);
        console.log(`Actual Diameter: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
