/*
Breadth First Search

Problem Statement:
You're given a Node class that has a name and an array of optional children nodes.
When put together, nodes form an acyclic tree-like structure. Implement the
breadthFirstSearch method on the Node class, which takes in an empty array, traverses
the tree using the Breadth-first Search approach (specifically navigating the tree
from left to right), stores all of the nodes' names in the input array, and returns it.

Sample Input:
graph =    A
         / | \
        B  C  D
       / \   / \
      E   F G   H
         / \
        I   J

Sample Output:
["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

Constraints:
- The input graph will be a valid acyclic tree-like structure
- Node names will be unique strings
*/

class Node {
    constructor(name) {
        this.name = name;
        this.children = [];
    }

    addChild(name) {
        this.children.push(new Node(name));
        return this;
    }

    breadthFirstSearch(array) {
        // Write your code here
    }
}

// Test Cases
function runTests() {
    const testCases = [
        {
            description: "Sample test case",
            build: (root) => {
                root.addChild("B").addChild("C").addChild("D");
                root.children[0].addChild("E").addChild("F");
                root.children[2].addChild("G").addChild("H");
                root.children[0].children[1].addChild("I").addChild("J");
            },
            expected: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
        },
        {
            description: "Single node",
            build: (root) => {},
            expected: ["A"]
        },
        {
            description: "Linear tree",
            build: (root) => {
                root.addChild("B").children[0].addChild("C").children[0].addChild("D");
            },
            expected: ["A", "B", "C", "D"]
        },
        {
            description: "Wide tree",
            build: (root) => {
                root.addChild("B").addChild("C").addChild("D").addChild("E");
            },
            expected: ["A", "B", "C", "D", "E"]
        },
        {
            description: "Deep and wide tree",
            build: (root) => {
                root.addChild("B").addChild("C");
                root.children[0].addChild("D").addChild("E");
                root.children[1].addChild("F").addChild("G");
            },
            expected: ["A", "B", "C", "D", "E", "F", "G"]
        },
        {
            description: "Unbalanced tree",
            build: (root) => {
                root.addChild("B").addChild("C");
                root.children[0].addChild("D").addChild("E");
                root.children[0].children[0].addChild("F");
            },
            expected: ["A", "B", "C", "D", "E", "F"]
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Build the tree
        const root = new Node("A");
        testCase.build(root);
        
        // Perform BFS
        const result = root.breadthFirstSearch([]);
        
        // Compare with expected
        const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
        
        console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
