/*
Find Closest Value in BST

Problem Statement:
Write a function that takes in a Binary Search Tree (BST) and a target integer value and
returns the closest value to that target value contained in the BST.

You can assume that there will only be one closest value.

Each BST node has an integer value, a left child node, and a right child node. A node is
said to be a valid BST node if and only if it satisfies the BST property:
- Its value is strictly greater than the values of every node to its left
- Its value is less than or equal to the values of every node to its right
- Its children nodes are either valid BST nodes themselves or None/null

Sample Input:
tree =     10
         /     \
        5      15
      /   \   /   \
     2     5 13   22
    /         \
   1          14
target = 12

Sample Output:
13 // 13 is the closest value to 12

Test Cases:
1. Target = 12 in the above tree
   Expected Output: 13

2. Target = 100 in the above tree
   Expected Output: 22

3. Target = 3 in the above tree
   Expected Output: 2

4. Target = 5 in the above tree
   Expected Output: 5

5. Target = 23 in the above tree
   Expected Output: 22

Solution Approaches:
1. Recursive Solution: O(log n) average time | O(log n) space
   - Compare current node's value with target
   - Recursively traverse left or right based on comparison
   - Keep track of closest value found so far

2. Iterative Solution (Optimal): O(log n) average time | O(1) space
   - Same logic as recursive but using a loop
   - Better space complexity
   - More difficult to implement
*/

// BST Node class implementation
class BST {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function findClosestValueInBst(tree, target) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Test Case 1: Basic tree from the example
    const root1 = new BST(10);
    root1.left = new BST(5);
    root1.right = new BST(15);
    root1.left.left = new BST(2);
    root1.left.right = new BST(5);
    root1.right.left = new BST(13);
    root1.right.right = new BST(22);
    root1.left.left.left = new BST(1);
    root1.right.left.right = new BST(14);

    const testCases = [
        {
            tree: root1,
            target: 12,
            expected: 13,
            description: "Target closer to right subtree"
        },
        {
            tree: root1,
            target: 100,
            expected: 22,
            description: "Target much larger than any value"
        },
        {
            tree: root1,
            target: 3,
            expected: 2,
            description: "Target between two values in left subtree"
        },
        {
            tree: root1,
            target: 5,
            expected: 5,
            description: "Target equals existing value"
        },
        {
            tree: root1,
            target: 23,
            expected: 22,
            description: "Target just above maximum value"
        },
        {
            tree: new BST(10),
            target: 5,
            expected: 10,
            description: "Single node tree"
        }
    ];

    testCases.forEach((testCase, index) => {
        const result = findClosestValueInBst(testCase.tree, testCase.target);
        console.log(`Test Case ${index + 1} (${testCase.description}):`);
        console.log(`Target: ${testCase.target}`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
