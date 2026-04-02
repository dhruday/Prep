/*
Find Nodes Distance K

Problem Statement:
You're given the root node of a Binary Tree, a target value of a node that's contained in the
tree, and a positive integer k. Write a function that returns the values of all the nodes
that are exactly distance k from the node with target value.

The distance between two nodes is defined as the number of edges that must be traversed
to go from one node to the other.

Sample Input:
tree =     1
        /     \
       2       3
     /   \     /   \
    4     5   6     7
              /
             8
target = 3
k = 2

Sample Output:
[2, 7, 8]
// 2 is two edges away from 3 (going through 1)
// 7 is two edges away from 3 (going through its right child)
// 8 is two edges away from 3 (going through its left child 6)
// 4 and 5 are THREE edges away from 3 (going through 2 and 1)
// 1 and 6 are ONE edge away from 3

Test Cases:
1. Sample tree above
2. Target is root node
3. Target is leaf node
4. K is 0 (return target node)
5. K is greater than max possible distance
6. Target not found in tree
7. Empty tree
8. Single node tree
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function findNodesDistanceK(tree, target, k) {
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

    const testCases = [
        {
            tree: [1, 2, 3, 4, 5, 6, 7, null, null, null, null, 8],
            target: 3,
            k: 2,
            expected: [2, 7, 8],
            description: "Sample tree from example"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            target: 1,
            k: 2,
            expected: [4, 5, 6, 7],
            description: "Target is root node"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            target: 7,
            k: 3,
            expected: [2, 4, 5],
            description: "Target is leaf node"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            target: 3,
            k: 0,
            expected: [3],
            description: "K is 0"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            target: 3,
            k: 10,
            expected: [],
            description: "K is greater than max possible distance"
        },
        {
            tree: [1, 2, 3, 4, 5, 6, 7],
            target: 9,
            k: 1,
            expected: [],
            description: "Target not found in tree"
        },
        {
            tree: [],
            target: 1,
            k: 1,
            expected: [],
            description: "Empty tree"
        },
        {
            tree: [1],
            target: 1,
            k: 1,
            expected: [],
            description: "Single node tree"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input tree
        const tree = createTree(testCase.tree);
        
        // Find nodes at distance K
        const result = findNodesDistanceK(tree, testCase.target, testCase.k);
        
        // Sort arrays for comparison (order doesn't matter)
        const sortedResult = result.sort((a, b) => a - b);
        const sortedExpected = testCase.expected.sort((a, b) => a - b);
        
        // Compare with expected
        const passed = JSON.stringify(sortedResult) === JSON.stringify(sortedExpected);
        console.log(`Input Tree: ${JSON.stringify(testCase.tree)}`);
        console.log(`Target: ${testCase.target}`);
        console.log(`K: ${testCase.k}`);
        console.log(`Expected Nodes: ${JSON.stringify(sortedExpected)}`);
        console.log(`Actual Nodes: ${JSON.stringify(sortedResult)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
