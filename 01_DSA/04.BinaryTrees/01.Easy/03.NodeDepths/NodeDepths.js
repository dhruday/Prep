/*
Node Depths

Problem Statement:
Write a function that takes in a Binary Tree and returns the sum of all of its nodes'
depths.

Each Binary Tree node has an integer value, a left child node, and a right child node.
Children nodes can either be Binary Tree nodes themselves or None/null.

The depth of a node is defined as the number of edges between it and the tree's root node.
The root node has a depth of 0.

Sample Input:
tree =    1
        /   \
       2     3
     /   \  /  \
    4     5 6    7
  /   \
 8     9

Sample Output:
16
// The depth of the node with value 2 is 1
// The depth of the node with value 3 is 1
// The depth of the node with value 4 is 2
// The depth of the node with value 5 is 2
// Etc...
// Summing all of these depths yields 16

Test Cases:
1. Sample tree above
   Expected Output: 16

2. Single node tree
   Expected Output: 0

3. Empty tree
   Expected Output: 0

4. Left-heavy tree
   Expected Output: 6

5. Right-heavy tree
   Expected Output: 6

Solution Approaches:
1. Recursive DFS (Optimal): O(n) time | O(h) space
   where h is the height of the tree
   - Pass depth as parameter
   - Add current depth to sum
   - Recursively process children with depth + 1

2. Iterative BFS: O(n) time | O(w) space
   where w is the max width of the tree
   - Use queue to track nodes and their depths
   - Process level by level
*/

// Binary Tree node class
class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function nodeDepths(root) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Test Case 1: Tree from the example
    const tree1 = new BinaryTree(1);
    tree1.left = new BinaryTree(2);
    tree1.right = new BinaryTree(3);
    tree1.left.left = new BinaryTree(4);
    tree1.left.right = new BinaryTree(5);
    tree1.right.left = new BinaryTree(6);
    tree1.right.right = new BinaryTree(7);
    tree1.left.left.left = new BinaryTree(8);
    tree1.left.left.right = new BinaryTree(9);

    // Test Case 2: Single node tree
    const tree2 = new BinaryTree(1);

    // Test Case 3: Empty tree
    const tree3 = null;

    // Test Case 4: Left-heavy tree
    const tree4 = new BinaryTree(1);
    tree4.left = new BinaryTree(2);
    tree4.left.left = new BinaryTree(3);
    tree4.left.left.left = new BinaryTree(4);

    // Test Case 5: Right-heavy tree
    const tree5 = new BinaryTree(1);
    tree5.right = new BinaryTree(2);
    tree5.right.right = new BinaryTree(3);
    tree5.right.right.right = new BinaryTree(4);

    const testCases = [
        {
            tree: tree1,
            expected: 16,
            description: "Full tree from example"
        },
        {
            tree: tree2,
            expected: 0,
            description: "Single node tree"
        },
        {
            tree: tree3,
            expected: 0,
            description: "Empty tree"
        },
        {
            tree: tree4,
            expected: 6,
            description: "Left-heavy tree"
        },
        {
            tree: tree5,
            expected: 6,
            description: "Right-heavy tree"
        }
    ];

    testCases.forEach((testCase, index) => {
        const result = nodeDepths(testCase.tree);
        console.log(`Test Case ${index + 1} (${testCase.description}):`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
