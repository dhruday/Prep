/*
Find Kth Largest Value In BST

Problem Statement:
Write a function that takes in a Binary Search Tree (BST) and a positive integer k and
returns the kth largest integer contained in the BST.

You can assume that there will only be integer values in the BST and that k is less than
or equal to the number of nodes in the tree.

Also, for the purpose of this problem, duplicate integers will be treated as distinct values.
For example, the second largest value in a BST containing values {5, 7, 7} will be 7—not 5.

Sample Input:
tree =   15
       /     \
      5      20
    /   \   /   \
   2     5 17   22
 /   \
1     3
k = 3

Sample Output:
17
// The values in reverse sorted order are: [22, 20, 17, 15, 5, 5, 3, 2, 1]
// The 3rd largest value is 17

Test Cases:
1. Sample tree above with k = 3
   Expected Output: 17

2. Single node tree with k = 1
   Expected Output: that node's value

3. Tree with duplicate values
   Expected Output: handle duplicates correctly

4. Tree with minimum k (k = 1)
   Expected Output: largest value

5. Tree with maximum k (k = number of nodes)
   Expected Output: smallest value

Solution Approaches:
1. Reverse Inorder Traversal (Optimal): O(h + k) time | O(h) space
   where h is the height of the tree
   - Do reverse inorder traversal (right -> root -> left)
   - Keep count of nodes visited
   - Return when count equals k

2. Array-Based Solution: O(n) time | O(n) space
   - Store all values in array
   - Sort in descending order
   - Return kth element
*/

class BST {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function findKthLargestValueInBst(tree, k) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Test Case 1: Sample tree from example
    const tree1 = new BST(15);
    tree1.left = new BST(5);
    tree1.right = new BST(20);
    tree1.left.left = new BST(2);
    tree1.left.right = new BST(5);
    tree1.right.left = new BST(17);
    tree1.right.right = new BST(22);
    tree1.left.left.left = new BST(1);
    tree1.left.left.right = new BST(3);

    // Test Case 2: Single node tree
    const tree2 = new BST(1);

    // Test Case 3: Tree with duplicates
    const tree3 = new BST(10);
    tree3.left = new BST(10);
    tree3.right = new BST(10);

    // Test Case 4: Larger tree
    const tree4 = new BST(100);
    tree4.left = new BST(50);
    tree4.right = new BST(150);
    tree4.left.left = new BST(25);
    tree4.left.right = new BST(75);
    tree4.right.left = new BST(125);
    tree4.right.right = new BST(175);

    const testCases = [
        {
            tree: tree1,
            k: 3,
            expected: 17,
            description: "Sample tree, k = 3"
        },
        {
            tree: tree2,
            k: 1,
            expected: 1,
            description: "Single node tree"
        },
        {
            tree: tree3,
            k: 2,
            expected: 10,
            description: "Tree with duplicates"
        },
        {
            tree: tree4,
            k: 1,
            expected: 175,
            description: "Largest value (k = 1)"
        },
        {
            tree: tree4,
            k: 7,
            expected: 25,
            description: "Smallest value (k = n)"
        }
    ];

    testCases.forEach((testCase, index) => {
        const result = findKthLargestValueInBst(testCase.tree, testCase.k);
        console.log(`Test Case ${index + 1} (${testCase.description}):`);
        console.log(`k = ${testCase.k}`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
