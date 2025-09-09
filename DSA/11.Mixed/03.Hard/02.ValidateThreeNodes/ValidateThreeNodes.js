/*
Validate Three Nodes

You're given three nodes that are contained in the same Binary Search Tree:
nodeOne, nodeTwo, and nodeThree. Write a function that returns a boolean
representing whether one of nodeOne or nodeThree is an ancestor of nodeTwo and
the other node is a descendant of nodeTwo. For example, if nodeOne is an
ancestor of nodeTwo and nodeThree is a descendant of nodeTwo, your function
should return true.

A node is considered an ancestor of another node if it's above that other node
in the BST. A node is considered a descendant of another node if it's below that
other node in the BST.

In other words, your function should verify that the nodes aren't positioned at
the same level and that the BST path from nodeOne to nodeThree flows through nodeTwo.

Sample Input:
// The numbers represent the nodes' values
tree =        5
            /   \\
           2     7
         /   \\   \\
        1     4    9
             /      \\
            3        8
nodeOne = node with value 7
nodeTwo = node with value 8
nodeThree = node with value 9

Sample Output: false
// nodeOne(7) and nodeThree(9) are both ancestors of nodeTwo(8)
*/

class BST {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

function validateThreeNodes(nodeOne, nodeTwo, nodeThree) {
    // Check if nodeOne is ancestor of nodeTwo and nodeThree is descendant
    if (isAncestor(nodeOne, nodeTwo)) {
        return isDescendant(nodeTwo, nodeThree);
    }
    
    // Check if nodeThree is ancestor of nodeTwo and nodeOne is descendant
    if (isAncestor(nodeThree, nodeTwo)) {
        return isDescendant(nodeTwo, nodeOne);
    }
    
    return false;
}

function isAncestor(ancestor, descendant) {
    let current = ancestor;
    
    while (current !== null && current !== descendant) {
        if (descendant.value < current.value) {
            current = current.left;
        } else {
            current = current.right;
        }
    }
    
    return current === descendant;
}

function isDescendant(ancestor, descendant) {
    return isAncestor(ancestor, descendant);
}

// Test Cases
function runTests() {
    const testCases = [
        {
            description: "Sample test case",
            test: () => {
                const root = new BST(5);
                root.left = new BST(2);
                root.right = new BST(7);
                root.left.left = new BST(1);
                root.left.right = new BST(4);
                root.left.right.left = new BST(3);
                root.right.right = new BST(9);
                root.right.right.left = new BST(8);
                
                const nodeOne = root.right; // 7
                const nodeTwo = root.right.right.left; // 8
                const nodeThree = root.right.right; // 9
                
                return {
                    input: [nodeOne, nodeTwo, nodeThree],
                    expected: false
                };
            }
        },
        {
            description: "Direct ancestor and descendant",
            test: () => {
                const root = new BST(5);
                root.left = new BST(3);
                root.right = new BST(7);
                root.left.left = new BST(1);
                root.left.right = new BST(4);
                
                return {
                    input: [root, root.left, root.left.left], // 5 -> 3 -> 1
                    expected: true
                };
            }
        },
        {
            description: "No relationship",
            test: () => {
                const root = new BST(5);
                root.left = new BST(2);
                root.right = new BST(7);
                
                return {
                    input: [root.left, root, root.right], // 2, 5, 7
                    expected: false
                };
            }
        },
        {
            description: "Same level nodes",
            test: () => {
                const root = new BST(5);
                root.left = new BST(3);
                root.right = new BST(7);
                
                return {
                    input: [root.left, root.right, root], // 3, 7, 5
                    expected: false
                };
            }
        },
        {
            description: "Deep tree relationship",
            test: () => {
                const root = new BST(10);
                root.left = new BST(5);
                root.left.left = new BST(2);
                root.left.right = new BST(7);
                root.left.left.left = new BST(1);
                
                return {
                    input: [root, root.left.left, root.left.left.left], // 10 -> 2 -> 1
                    expected: true
                };
            }
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        const { input, expected } = testCase.test();
        
        console.log("Input nodes values:", input.map(node => node.value));
        const result = validateThreeNodes(...input);
        console.log("Expected:", expected);
        console.log("Got:", result);
        
        const passed = result === expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
