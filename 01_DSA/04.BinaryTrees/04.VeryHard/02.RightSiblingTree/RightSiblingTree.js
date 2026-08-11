/*
Right Sibling Tree

Problem Statement:
Write a function that takes in a Binary Tree, transforms it into a Right Sibling Tree,
and returns its root. A Right Sibling Tree is obtained by making every node in a Binary
Tree have its right pointer point to its right sibling instead of its right child.

A right sibling is a node that appears on the same level and to the right of the current
node in a Binary Tree. Note that a node's right sibling can be a node in a different
subtree altogether.

The transformation should be done in place, meaning that the original data structure
should be mutated (no new structure should be created).

A Binary Tree is represented by a class that has a "value", "left", and "right" properties.
The right sibling of a node should be set to NULL/null if it doesn't exist.

Sample Input:
tree =     1
        /     \
       2       3
     /   \   /   \
    4     5 6     7
   /       \     /
  8         9   10

Sample Output:
//     1
//   /   \
//  2 -> 3 -> null
// /  \    \     \
//4 -> 5 -> 6 -> 7 -> null
//\    \         /
// 8 -> 9   -> 10 -> null

// Note: Every node's right pointer points to its right sibling
// (if one exists) instead of its original right child.

Test Cases:
1. Sample tree above
2. Empty tree
3. Single node tree
4. Perfect binary tree
5. Left-skewed tree
6. Right-skewed tree
7. Tree with missing nodes (gaps between siblings)
8. Tree with multiple levels
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function rightSiblingTree(root) {
    if (root === null) return null;

    let level = [root];
    while (level.length > 0) {
        const nextLevel = [];
        for (const node of level) {
            if (node.left !== null) nextLevel.push(node.left);
            if (node.right !== null) nextLevel.push(node.right);
        }
        for (let index = 0; index < level.length; index++) {
            level[index].right = level[index + 1] || null;
        }
        level = nextLevel;
    }
    return root;
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

    // Snapshot each original level before right pointers are repurposed.
    function getLevels(root) {
        if (!root) return [];

        const levels = [];
        const queue = [root];
        for (let index = 0; index < queue.length;) {
            const levelEnd = queue.length;
            const level = [];
            while (index < levelEnd) {
                const node = queue[index++];
                level.push(node);
                if (node.left) queue.push(node.left);
                if (node.right) queue.push(node.right);
            }
            levels.push(level);
        }
        return levels;
    }

    function validateRightSiblings(levels) {
        return levels.every(level => level.every((node, index) =>
            node.right === (level[index + 1] || null)
        ));
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
            tree: [1, 2, 3, null, 4, null, 5],
            description: "Tree with gaps between siblings"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            description: "Tree with multiple complete levels"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input tree
        const tree = createTree(testCase.tree);
        
        const levels = getLevels(tree);

        // Transform to right sibling tree
        const result = rightSiblingTree(tree);
        
        // Validate the transformation
        const isValid = validateRightSiblings(levels);
        
        console.log(`Input Tree: ${JSON.stringify(testCase.tree)}`);
        console.log(`Right Sibling Properties Valid: ${isValid ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Status: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!isValid) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
