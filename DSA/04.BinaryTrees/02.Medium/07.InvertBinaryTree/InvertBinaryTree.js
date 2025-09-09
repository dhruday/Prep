/*
Invert Binary Tree

Problem Statement:
Write a function that takes in a Binary Tree and inverts it. In other words,
the function should swap every left node in the tree for its corresponding
right node. The function should return the inverted tree.

Each BinaryTree node has an integer value, a left child node, and a right child node.
Children nodes can either be BinaryTree nodes themselves or None / null.

Sample Input:
tree =     1
         /   \
        2     3
      /   \  /  \
     4     5 6    7
   /   \
  8     9

Sample Output:
           1
         /   \
        3     2
      /   \  /  \
     7     6 5    4
                /   \
               9     8

Test Cases:
1. Sample tree above
2. Empty tree (null)
3. Single node tree
4. Left-skewed tree
5. Right-skewed tree
6. Complete binary tree
7. Perfect binary tree

Note: The inversion should be done in place, meaning we should not 
create a new tree but modify the existing one.
*/

class BinaryTree {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function invertBinaryTree(tree) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Helper function to create tree from array
    function createTree(array, index = 0) {
        if (index >= array.length || array[index] === null) return null;
        
        const node = new BinaryTree(array[index]);
        node.left = createTree(array, 2 * index + 1);
        node.right = createTree(array, 2 * index + 2);
        return node;
    }

    // Helper function to convert tree to array (level order)
    function treeToArray(root) {
        if (!root) return [];
        const result = [];
        const queue = [root];
        
        while (queue.length > 0) {
            const node = queue.shift();
            result.push(node ? node.value : null);
            
            if (node) {
                queue.push(node.left);
                queue.push(node.right);
            }
        }
        
        // Remove trailing nulls
        while (result[result.length - 1] === null) {
            result.pop();
        }
        return result;
    }

    const testCases = [
        {
            input: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            expected: [1, 3, 2, 7, 6, 5, 4, null, null, null, null, null, null, 9, 8],
            description: "Complete tree from example"
        },
        {
            input: [],
            expected: [],
            description: "Empty tree"
        },
        {
            input: [1],
            expected: [1],
            description: "Single node tree"
        },
        {
            input: [1, 2, null, 3, null, 4],
            expected: [1, null, 2, null, 3, null, 4],
            description: "Left-skewed tree"
        },
        {
            input: [1, null, 2, null, null, null, 3],
            expected: [1, 2, null, 3],
            description: "Right-skewed tree"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create the input tree
        const inputTree = createTree(testCase.input);
        console.log("Input Tree:", testCase.input);
        
        // Invert the tree
        const result = invertBinaryTree(inputTree);
        
        // Convert result to array for comparison
        const resultArray = treeToArray(result);
        console.log("Result:", resultArray);
        console.log("Expected:", testCase.expected);
        
        // Compare result with expected
        const passed = JSON.stringify(resultArray) === JSON.stringify(testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log("\nOverall Result:", allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌');
}

// Run the tests
runTests();
