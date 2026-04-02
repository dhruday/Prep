/*
Max Path Sum in Binary Tree

Problem Statement:
Write a function that takes in a Binary Tree and returns its max path sum.

A path is a collection of connected nodes in a tree where no node is connected to more
than two other nodes; a path sum is the sum of the values of the nodes in a particular
path.

Each BinaryTree node has an integer value, a left child node, and a right child node.
Children nodes can either be BinaryTree nodes themselves or None / null.

Sample Input:
tree =     1
        /     \
       2       3
     /   \   /   \
    4     5 6     7

Sample Output:
18
// 5 + 2 + 1 + 3 + 7

Note:
- The path doesn't need to start at the root
- The path doesn't need to end at a leaf
- The path can start at any node and end at any node
- The path must go downwards (parent to child)

Test Cases:
1. Sample tree above
2. Empty tree (null)
3. Single node tree
4. Tree with negative values
5. Tree with all negative values
6. Tree where max path doesn't pass through root
7. Linear tree (each node has only one child)
8. Tree with duplicate values
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function maxPathSum(tree) {
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
            tree: [1, 2, 3, 4, 5, 6, 7],
            expected: 18,
            description: "Sample tree from example"
        },
        {
            tree: [],
            expected: -Infinity,
            description: "Empty tree"
        },
        {
            tree: [5],
            expected: 5,
            description: "Single node tree"
        },
        {
            tree: [5, -3, 6, 2, -2, -1, 7],
            expected: 17,
            description: "Tree with negative values"
        },
        {
            tree: [-5, -3, -6, -2, -2, -1, -7],
            expected: -1,
            description: "Tree with all negative values"
        },
        {
            tree: [1, 2, 3, -4, 5, -6, 7, null, null, 8, 9],
            expected: 24,
            description: "Max path doesn't pass through root"
        },
        {
            tree: [1, 2, null, 3, null, null, null, 4],
            expected: 10,
            description: "Linear tree"
        },
        {
            tree: [5, 5, 5, 5, 5, 5, 5],
            expected: 25,
            description: "Tree with duplicate values"
        },
        {
            tree: [-1, -2, 10, -6, -3, -6, 5],
            expected: 15,
            description: "Complex tree with mixed values"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input tree
        const tree = createTree(testCase.tree);
        
        // Calculate max path sum
        const result = maxPathSum(tree);
        
        // Compare with expected
        const passed = result === testCase.expected;
        console.log(`Input Tree: ${JSON.stringify(testCase.tree)}`);
        console.log(`Expected Max Path Sum: ${testCase.expected}`);
        console.log(`Actual Max Path Sum: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
