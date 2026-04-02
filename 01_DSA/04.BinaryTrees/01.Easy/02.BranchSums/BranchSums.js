/*
Branch Sums

Problem Statement:
Write a function that takes in a Binary Tree and returns a list of its branch sums ordered
from leftmost branch sum to rightmost branch sum.

A branch sum is the sum of all values in a Binary Tree branch. A Binary Tree branch is a
path of nodes in a tree that starts at the root node and ends at any leaf node.

Each BinaryTree node has an integer value, a left child node, and a right child node.
Children nodes can either be BinaryTree nodes themselves or None/null.

Sample Input:
tree =     1
        /     \
       2       3
     /   \    /  \
    4     5  6    7
  /   \  /
 8    9 10

Sample Output:
[15, 16, 18, 10]
// 15 = 1 + 2 + 4 + 8
// 16 = 1 + 2 + 4 + 9
// 18 = 1 + 2 + 5 + 10
// 10 = 1 + 3 + 6

Test Cases:
1. Sample tree above
   Expected Output: [15, 16, 18, 10]

2. Single node tree
   Expected Output: [1]

3. Empty tree
   Expected Output: []

4. Left-heavy tree
   Expected Output: [7, 8, 4]

5. Right-heavy tree
   Expected Output: [4, 5, 6]

Solution Approaches:
1. Recursive DFS (Optimal): O(n) time | O(n) space
   - Traverse tree using DFS
   - Keep track of running sum
   - Add sum to result when leaf is reached

2. Iterative Solution: O(n) time | O(n) space
   - Use a stack to simulate recursion
   - More complex implementation
*/

// Binary Tree node class
class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function branchSums(root) {
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
    tree1.left.right.left = new BinaryTree(10);

    // Test Case 2: Single node tree
    const tree2 = new BinaryTree(1);

    // Test Case 3: Empty tree
    const tree3 = null;

    // Test Case 4: Left-heavy tree
    const tree4 = new BinaryTree(1);
    tree4.left = new BinaryTree(2);
    tree4.left.left = new BinaryTree(4);
    tree4.left.right = new BinaryTree(5);

    // Test Case 5: Right-heavy tree
    const tree5 = new BinaryTree(1);
    tree5.right = new BinaryTree(2);
    tree5.right.right = new BinaryTree(3);

    const testCases = [
        {
            tree: tree1,
            expected: [15, 16, 18, 10],
            description: "Full tree from example"
        },
        {
            tree: tree2,
            expected: [1],
            description: "Single node tree"
        },
        {
            tree: tree3,
            expected: [],
            description: "Empty tree"
        },
        {
            tree: tree4,
            expected: [7, 8],
            description: "Left-heavy tree"
        },
        {
            tree: tree5,
            expected: [6],
            description: "Right-heavy tree"
        }
    ];

    testCases.forEach((testCase, index) => {
        const result = branchSums(testCase.tree);
        console.log(`Test Case ${index + 1} (${testCase.description}):`);
        console.log(`Your Output: [${result}]`);
        console.log(`Expected Output: [${testCase.expected}]`);
        const passed = arraysEqual(result, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
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
