/*
All Kinds of Node Depths

Problem Statement:
The distance between a node in a Binary Tree and the tree's root is called the node's
depth.

Write a function that takes in a Binary Tree and returns the sum of all of its subtrees'
nodes' depths.

Each BinaryTree node has an integer value, a left child node, and a right child node.
Children nodes can either be BinaryTree nodes themselves or None / null.

Sample Input:
tree =     1
        /     \
       2       3
     /   \   /   \
    4     5 6     7
   /
  8

Sample Output:
26
// The sum of all subtrees' nodes' depths is:
// Depth from root (1):        (1*1)+(2*4)+(3*2) = 1+8+6 = 15
// Depth from node 2:          (1*2)+(2*1) = 2+2 = 4
// Depth from node 3:          (1*2) = 2
// Depth from node 4:          (1*1) = 1
// Depth from node 5:          0
// Depth from node 6:          0
// Depth from node 7:          0
// Depth from node 8:          0
// Total: 15+4+2+1+0+0+0+0 = 26

Test Cases:
1. Sample tree above
2. Empty tree
3. Single node tree
4. Perfect binary tree
5. Left-skewed tree
6. Right-skewed tree
7. Tree with multiple levels
8. Tree with duplicate values
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function allKindsOfNodeDepths(root) {
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

    // Helper function to calculate expected result
    function calculateExpectedDepths(root, depth = 0) {
        if (!root) return 0;
        
        // Calculate depths for current subtree
        let sumOfDepths = (depth * (depth + 1)) / 2; // Sum of depths from 0 to depth
        
        // Add depths from left and right subtrees
        sumOfDepths += calculateExpectedDepths(root.left, depth + 1);
        sumOfDepths += calculateExpectedDepths(root.right, depth + 1);
        
        return sumOfDepths;
    }

    const testCases = [
        {
            tree: [1, 2, 3, 4, 5, 6, 7, 8],
            description: "Sample tree from example"
        },
        {
            tree: [],
            description: "Empty tree"
        },
        {
            tree: [1],
            description: "Single node tree"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            description: "Perfect binary tree"
        },
        {
            tree: [1, 2, null, 3, null, null, null, 4],
            description: "Left-skewed tree"
        },
        {
            tree: [1, null, 2, null, null, null, 3],
            description: "Right-skewed tree"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            description: "Tree with multiple levels"
        },
        {
            tree: [5, 5, 5, 5, 5, 5, 5],
            description: "Tree with duplicate values"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input tree
        const tree = createTree(testCase.tree);
        
        // Calculate expected result
        const expected = calculateExpectedDepths(tree);
        
        // Calculate actual result
        const result = allKindsOfNodeDepths(tree);
        
        // Compare results
        const passed = result === expected;
        
        console.log(`Input Tree: ${JSON.stringify(testCase.tree)}`);
        console.log(`Expected Sum of Depths: ${expected}`);
        console.log(`Actual Sum of Depths: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
