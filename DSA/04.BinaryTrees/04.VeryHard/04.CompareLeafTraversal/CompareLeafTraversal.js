/*
Compare Leaf Traversal

Problem Statement:
Write a function that takes in two Binary Trees and returns a boolean representing
whether their leaf traversals are the same.

The leaf traversal of a Binary Tree traverses only its leaf nodes from left to right.
A leaf node is any node that has no left or right children.

For example, given the following Binary Trees:
tree1 =     1
          /   \
         2     3
       /   \     \
      4     5     6
        \
         7
tree2 =     1
          /   \
         2     3
       /   \    \
      4     7    5

Both trees' leaf traversals are [7, 5, 6] for tree1 and [4, 7, 5] for tree2,
so the function should return false.

Sample Input:
tree1 =     1
          /   \
         2     3
       /   \     \
      4     5     6
        \
         7
tree2 =     1
          /   \
         2     3
       /   \    \
      4     7    5

Sample Output:
false
// tree1's leaf traversal: [7, 5, 6]
// tree2's leaf traversal: [4, 7, 5]

Test Cases:
1. Sample trees above
2. Empty trees
3. Single node trees
4. Trees with same values but different structures
5. Trees with different values but same leaf traversal
6. Perfect binary trees
7. Skewed trees
8. Trees with duplicate leaf values
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function compareLeafTraversal(tree1, tree2) {
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

    // Helper function to get leaf traversal
    function getLeafTraversal(root, leaves = []) {
        if (!root) return leaves;
        if (!root.left && !root.right) {
            leaves.push(root.value);
            return leaves;
        }
        if (root.left) getLeafTraversal(root.left, leaves);
        if (root.right) getLeafTraversal(root.right, leaves);
        return leaves;
    }

    const testCases = [
        {
            tree1: [1, 2, 3, 4, 5, null, 6, null, 7],
            tree2: [1, 2, 3, 4, 7, null, 5],
            expected: false,
            description: "Sample trees from example"
        },
        {
            tree1: [],
            tree2: [],
            expected: true,
            description: "Empty trees"
        },
        {
            tree1: [1],
            tree2: [1],
            expected: true,
            description: "Single node trees"
        },
        {
            tree1: [1, 2, 3, 4, 5],
            tree2: [1, 3, 2, 5, 4],
            expected: false,
            description: "Different structures, same values"
        },
        {
            tree1: [1, 2, 3, 4, 5, 6, 7],
            tree2: [8, 9, 10, 4, 5, 6, 7],
            expected: true,
            description: "Different values, same leaf traversal"
        },
        {
            tree1: [1, 2, 3, 4, 5, 6, 7],
            tree2: [1, 2, 3, 4, 5, 6, 7],
            expected: true,
            description: "Perfect binary trees"
        },
        {
            tree1: [1, 2, null, 3, null, null, null, 4],
            tree2: [1, null, 2, null, null, null, 3, null, null, null, null, null, null, null, 4],
            expected: true,
            description: "Skewed trees with same leaf traversal"
        },
        {
            tree1: [1, 2, 3, 4, 5, 6, 7],
            tree2: [1, 2, 3, 5, 4, 7, 6],
            expected: false,
            description: "Similar trees with different leaf order"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input trees
        const tree1 = createTree(testCase.tree1);
        const tree2 = createTree(testCase.tree2);
        
        // Get leaf traversals for display
        const leaves1 = getLeafTraversal(tree1);
        const leaves2 = getLeafTraversal(tree2);
        
        // Compare leaf traversals
        const result = compareLeafTraversal(tree1, tree2);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Tree 1: ${JSON.stringify(testCase.tree1)}`);
        console.log(`Tree 2: ${JSON.stringify(testCase.tree2)}`);
        console.log(`Tree 1 Leaves: ${JSON.stringify(leaves1)}`);
        console.log(`Tree 2 Leaves: ${JSON.stringify(leaves2)}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
