/*
Depth First Search

Problem Statement:
You're given a Node class that has a name and an array of optional children nodes. When put
together, nodes form an acyclic tree-like structure.

Implement the depthFirstSearch method on the Node class, which takes in an empty array,
traverses the tree using the Depth-first Search approach (specifically navigating the tree
from left to right), stores all of the nodes' names in the input array, and returns it.

Sample Input:
graph =     A
         /  |  \
        B   C   D
       / \     / \
      E   F   G   H
         / \   \
        I   J   K

Sample Output:
["A", "B", "E", "F", "I", "J", "C", "D", "G", "K", "H"]
// The output array should be the nodes visited in DFS order

Test Cases:
1. Sample graph above
   Expected Output: ["A", "B", "E", "F", "I", "J", "C", "D", "G", "K", "H"]

2. Single node graph
   Expected Output: ["A"]

3. Linear graph (each node has one child)
   Expected Output: ["A", "B", "C", "D"]

4. Wide graph (root has many children)
   Expected Output: ["A", "B", "C", "D", "E", "F"]

5. Deep graph (many levels)
   Expected Output: ["A", "B", "C", "D", "E"]

Solution Approaches:
1. Recursive DFS (Optimal): O(v + e) time | O(v) space
   where v is the number of vertices and e is the number of edges
   - Add current node name to array
   - Recursively process children
   - Return final array

2. Iterative DFS: O(v + e) time | O(v) space
   - Use stack to track nodes to visit
   - Process nodes in LIFO order
   - More complex but avoids recursion overhead
*/

// Node class for N-ary tree
class Node {
    constructor(name) {
        this.name = name;
        this.children = [];
    }

    addChild(name) {
        this.children.push(new Node(name));
        return this;
    }

    depthFirstSearch(array) {
        // Write your code here
    }
}

// Test Cases
function runTests() {
    // Test Case 1: Graph from the example
    const graph1 = new Node("A");
    graph1.addChild("B").addChild("C").addChild("D");
    graph1.children[0].addChild("E").addChild("F");
    graph1.children[0].children[1].addChild("I").addChild("J");
    graph1.children[2].addChild("G").addChild("H");
    graph1.children[2].children[0].addChild("K");

    // Test Case 2: Single node graph
    const graph2 = new Node("A");

    // Test Case 3: Linear graph
    const graph3 = new Node("A");
    graph3.addChild("B");
    graph3.children[0].addChild("C");
    graph3.children[0].children[0].addChild("D");

    // Test Case 4: Wide graph
    const graph4 = new Node("A");
    graph4.addChild("B").addChild("C").addChild("D").addChild("E").addChild("F");

    // Test Case 5: Deep graph
    const graph5 = new Node("A");
    let current = graph5;
    ["B", "C", "D", "E"].forEach(name => {
        current.addChild(name);
        current = current.children[0];
    });

    const testCases = [
        {
            graph: graph1,
            expected: ["A", "B", "E", "F", "I", "J", "C", "D", "G", "K", "H"],
            description: "Complex graph from example"
        },
        {
            graph: graph2,
            expected: ["A"],
            description: "Single node graph"
        },
        {
            graph: graph3,
            expected: ["A", "B", "C", "D"],
            description: "Linear graph"
        },
        {
            graph: graph4,
            expected: ["A", "B", "C", "D", "E", "F"],
            description: "Wide graph"
        },
        {
            graph: graph5,
            expected: ["A", "B", "C", "D", "E"],
            description: "Deep graph"
        }
    ];

    testCases.forEach((testCase, index) => {
        const result = [];
        testCase.graph.depthFirstSearch(result);
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
