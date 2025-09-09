/*
BST Traversal

Problem Statement:
Write three functions that take in a Binary Search Tree (BST) and an empty array, traverse
the BST, add its nodes' values to the input array, and return that array. The three
functions should traverse the BST using the in-order, pre-order, and post-order
tree-traversal techniques, respectively.

Each BST node has an integer value, a left child node, and a right child node. Children
nodes can either be BST nodes themselves or None/null.

Sample Input:
tree =   10
       /     \
      5      15
    /   \       \
   2     5      22
 /
1

Sample Output:
inOrderTraverse: [1, 2, 5, 5, 10, 15, 22]   // Left -> Root -> Right
preOrderTraverse: [10, 5, 2, 1, 5, 15, 22]  // Root -> Left -> Right
postOrderTraverse: [1, 2, 5, 5, 22, 15, 10] // Left -> Right -> Root

Test Cases:
1. Sample tree above
   Expected Outputs:
   - InOrder: [1, 2, 5, 5, 10, 15, 22]
   - PreOrder: [10, 5, 2, 1, 5, 15, 22]
   - PostOrder: [1, 2, 5, 5, 22, 15, 10]

2. Single node tree
   Expected Outputs:
   - InOrder: [1]
   - PreOrder: [1]
   - PostOrder: [1]

3. Empty tree
   Expected Outputs:
   - InOrder: []
   - PreOrder: []
   - PostOrder: []

4. Linear tree (only right children)
   Expected Outputs:
   - InOrder: [1, 2, 3, 4]
   - PreOrder: [1, 2, 3, 4]
   - PostOrder: [4, 3, 2, 1]

Solution Approaches:
1. Recursive Solution (Optimal): O(n) time | O(n) space
   - Follow traversal order rules
   - Use recursive calls for subtrees
   - Add values at appropriate times

2. Iterative Solution: O(n) time | O(n) space
   - Use stack to simulate recursion
   - More complex implementation
   - Same time and space complexity
*/

class BST {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function inOrderTraverse(tree, array) {
    // Write your code here
}

function preOrderTraverse(tree, array) {
    // Write your code here
}

function postOrderTraverse(tree, array) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Test Case 1: Sample tree from example
    const tree1 = new BST(10);
    tree1.left = new BST(5);
    tree1.right = new BST(15);
    tree1.left.left = new BST(2);
    tree1.left.right = new BST(5);
    tree1.right.right = new BST(22);
    tree1.left.left.left = new BST(1);

    // Test Case 2: Single node tree
    const tree2 = new BST(1);

    // Test Case 3: Empty tree
    const tree3 = null;

    // Test Case 4: Linear tree (right children only)
    const tree4 = new BST(1);
    tree4.right = new BST(2);
    tree4.right.right = new BST(3);
    tree4.right.right.right = new BST(4);

    const testCases = [
        {
            tree: tree1,
            expected: {
                inOrder: [1, 2, 5, 5, 10, 15, 22],
                preOrder: [10, 5, 2, 1, 5, 15, 22],
                postOrder: [1, 2, 5, 5, 22, 15, 10]
            },
            description: "Sample tree from example"
        },
        {
            tree: tree2,
            expected: {
                inOrder: [1],
                preOrder: [1],
                postOrder: [1]
            },
            description: "Single node tree"
        },
        {
            tree: tree3,
            expected: {
                inOrder: [],
                preOrder: [],
                postOrder: []
            },
            description: "Empty tree"
        },
        {
            tree: tree4,
            expected: {
                inOrder: [1, 2, 3, 4],
                preOrder: [1, 2, 3, 4],
                postOrder: [4, 3, 2, 1]
            },
            description: "Linear tree (right children only)"
        }
    ];

    testCases.forEach((testCase, index) => {
        console.log(`Test Case ${index + 1} (${testCase.description}):`);

        // Test InOrder traversal
        const inOrderResult = [];
        inOrderTraverse(testCase.tree, inOrderResult);
        console.log("InOrder Traversal:");
        console.log(`Your Output: [${inOrderResult}]`);
        console.log(`Expected: [${testCase.expected.inOrder}]`);
        console.log(`Status: ${arraysEqual(inOrderResult, testCase.expected.inOrder) ? 'PASSED ✅' : 'FAILED ❌'}`);

        // Test PreOrder traversal
        const preOrderResult = [];
        preOrderTraverse(testCase.tree, preOrderResult);
        console.log("PreOrder Traversal:");
        console.log(`Your Output: [${preOrderResult}]`);
        console.log(`Expected: [${testCase.expected.preOrder}]`);
        console.log(`Status: ${arraysEqual(preOrderResult, testCase.expected.preOrder) ? 'PASSED ✅' : 'FAILED ❌'}`);

        // Test PostOrder traversal
        const postOrderResult = [];
        postOrderTraverse(testCase.tree, postOrderResult);
        console.log("PostOrder Traversal:");
        console.log(`Your Output: [${postOrderResult}]`);
        console.log(`Expected: [${testCase.expected.postOrder}]`);
        console.log(`Status: ${arraysEqual(postOrderResult, testCase.expected.postOrder) ? 'PASSED ✅' : 'FAILED ❌'}`);

        console.log('-'.repeat(50));
    });
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
