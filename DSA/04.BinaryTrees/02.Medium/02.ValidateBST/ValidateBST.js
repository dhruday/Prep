/*
Validate BST

Problem Statement:
Write a function that takes in a potentially invalid Binary Search Tree (BST) and returns a
boolean representing whether the BST is valid.

A BST is valid if and only if:
- All nodes to the left of a node contain values strictly less than the node's value
- All nodes to the right of a node contain values strictly greater than or equal to the node's value
- The tree doesn't contain duplicate values (optional requirement, depends on implementation)

Each BST node has an integer value, a left child node, and a right child node. Children
nodes can either be BST nodes themselves or None/null.

Sample Input:
tree =   10
       /     \
      5      15
    /   \   /   \
   2     5 13   22
 /           \
1            14

Sample Output:
true // The tree is a valid BST

Test Cases:
1. Valid BST (sample above)
   Expected Output: true

2. Invalid BST (left child > parent)
   tree =   10
          /    \
         20     30
   Expected Output: false

3. Invalid BST (right child < parent)
   tree =   10
          /    \
         5      5
   Expected Output: false

4. Single node
   tree = 1
   Expected Output: true

5. Empty tree
   tree = null
   Expected Output: true

Solution Approaches:
1. Recursive with Range Check (Optimal): O(n) time | O(d) space
   where n is the number of nodes and d is the depth of the tree
   - Pass valid range for each subtree
   - Update range based on parent value
   - Check if current node's value is within range

2. Inorder Traversal: O(n) time | O(n) space
   - Do inorder traversal
   - Check if values are strictly increasing
   - More space complexity but simpler to understand
*/

class BST {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function validateBst(tree) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Test Case 1: Valid BST from example
    const tree1 = new BST(10);
    tree1.left = new BST(5);
    tree1.right = new BST(15);
    tree1.left.left = new BST(2);
    tree1.left.right = new BST(5);
    tree1.right.left = new BST(13);
    tree1.right.right = new BST(22);
    tree1.left.left.left = new BST(1);
    tree1.right.left.right = new BST(14);

    // Test Case 2: Invalid BST (left child > parent)
    const tree2 = new BST(10);
    tree2.left = new BST(20);
    tree2.right = new BST(30);

    // Test Case 3: Invalid BST (right child < parent)
    const tree3 = new BST(10);
    tree3.left = new BST(5);
    tree3.right = new BST(5);

    // Test Case 4: Single node
    const tree4 = new BST(1);

    // Test Case 5: Empty tree
    const tree5 = null;

    // Test Case 6: Complex invalid BST
    const tree6 = new BST(10);
    tree6.left = new BST(5);
    tree6.right = new BST(15);
    tree6.left.right = new BST(11); // Invalid: 11 > 10

    const testCases = [
        {
            tree: tree1,
            expected: true,
            description: "Valid BST from example"
        },
        {
            tree: tree2,
            expected: false,
            description: "Invalid BST (left child > parent)"
        },
        {
            tree: tree3,
            expected: false,
            description: "Invalid BST (right child < parent)"
        },
        {
            tree: tree4,
            expected: true,
            description: "Single node"
        },
        {
            tree: tree5,
            expected: true,
            description: "Empty tree"
        },
        {
            tree: tree6,
            expected: false,
            description: "Complex invalid BST"
        }
    ];

    testCases.forEach((testCase, index) => {
        const result = validateBst(testCase.tree);
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
