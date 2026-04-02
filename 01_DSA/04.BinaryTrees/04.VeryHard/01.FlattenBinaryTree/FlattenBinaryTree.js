/*
Flatten Binary Tree

Problem Statement:
Write a function that takes in a Binary Tree, flattens it, and returns its leftmost
node. A flattened Binary Tree is a structure that's nearly identical to a Doubly
Linked List (DLL), where nodes follow the original tree's left-to-right order.

A Binary Tree is considered flattened when every node in the tree has its left pointer
pointing to null and its right pointer pointing to its next node in the left-to-right
order. For the flattening to work properly, every node's "right" pointer should point
to its next node, and its "left" pointer should point to its previous node.

Note that the nodes should follow the in-order traversal order.

Sample Input:
tree =     1
        /     \
       2       3
     /   \   /   \
    4     5 6     7
   /       \     /
  8         9   10

Sample Output:
8 <-> 4 <-> 2 <-> 5 <-> 9 <-> 1 <-> 6 <-> 3 <-> 10 <-> 7
// The leftmost node is 8

Test Cases:
1. Sample tree above
2. Empty tree (null)
3. Single node tree
4. Left-skewed tree
5. Right-skewed tree
6. Perfect binary tree
7. Tree with single child nodes
8. Complex unbalanced tree
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function flattenBinaryTree(root) {
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

    // Helper function to validate flattened tree
    function validateFlattenedTree(head) {
        if (!head) return true;
        
        let current = head;
        const values = [];
        let prev = null;
        
        // Traverse forward
        while (current) {
            if (current.left !== prev) return false;
            values.push(current.value);
            prev = current;
            current = current.right;
        }
        
        // Traverse backward
        current = prev;
        while (current) {
            if (current.right !== null && current.right.left !== current) return false;
            current = current.left;
        }
        
        return values;
    }

    // Helper function to get expected in-order traversal
    function getInOrderTraversal(node, result = []) {
        if (!node) return result;
        getInOrderTraversal(node.left, result);
        result.push(node.value);
        getInOrderTraversal(node.right, result);
        return result;
    }

    const testCases = [
        {
            tree: [1, 2, 3, 4, 5, 6, 7, 8, null, null, 9, null, null, 10],
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
            tree: [1, 2, null, 3, null, null, null, 4],
            description: "Left-skewed tree"
        },
        {
            tree: [1, null, 2, null, null, null, 3],
            description: "Right-skewed tree"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            description: "Perfect binary tree"
        },
        {
            tree: [1, 2, null, 3, null, null, null, null, 4],
            description: "Tree with single child nodes"
        },
        {
            tree: [5, 3, 7, 2, 4, 6, 8, 1, null, null, null, null, null, null, 9],
            description: "Complex unbalanced tree"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input tree
        const tree = createTree(testCase.tree);
        
        // Get expected in-order traversal
        const expected = getInOrderTraversal(tree);
        
        // Flatten the tree
        const flattenedHead = flattenBinaryTree(tree);
        
        // Validate the flattened structure
        const result = validateFlattenedTree(flattenedHead);
        
        // Check if result matches expected in-order traversal
        const passed = JSON.stringify(result) === JSON.stringify(expected);
        
        console.log(`Input Tree: ${JSON.stringify(testCase.tree)}`);
        console.log(`Expected In-order: ${JSON.stringify(expected)}`);
        console.log(`Actual Flattened: ${JSON.stringify(result)}`);
        console.log(`Doubly Linked List Properties Valid: ${result !== false ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Values Match Expected: ${passed ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Status: ${passed && result !== false ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed || result === false) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
