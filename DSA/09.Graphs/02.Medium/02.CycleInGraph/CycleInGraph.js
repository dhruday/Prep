/*
Cycle in Graph

Problem Statement:
You're given a list of edges representing an unweighted, directed graph with at least
one node. Write a function that returns a boolean representing whether the given graph
contains a cycle.

For the purpose of this question, a cycle is defined as any number of vertices,
including just one vertex, that are connected in a closed chain. A cycle can also be
defined as a chain of at least one vertex in which the first vertex is the same as
the last vertex.

The given list is what's called an adjacency list, and it represents a graph. The
number of vertices in the graph is equal to the length of edges, where each index i
in edges contains an array of integers representing the indices of vertices that
vertex i is connected to. For example, given edges = [[1, 3], [2, 3, 4], [], [0], [2, 5], []], the following graph is represented:
       3 ← 0 → 1 → 2
       ↑     ↑     ↑
       └─────┘     │
         4 ────────┘
         │
         → 5

Sample Input:
edges = [
  [1, 3],
  [2, 3, 4],
  [],
  [0],
  [2, 5],
  []
]

Sample Output:
true
// There are multiple cycles in this graph:
// 1) 0 -> 1 -> 3 -> 0
// 2) 0 -> 1 -> 4 -> 2 -> 3 -> 0
// 3) 1 -> 4 -> 2 -> 3 -> 0 -> 1

Constraints:
- The input edges will be a square matrix (list of lists)
- Each vertex will be a number from 0 to n-1, where n is the number of vertices
- The length of edges will be at least 1
*/

function cycleInGraph(edges) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            edges: [
                [1, 3],
                [2, 3, 4],
                [],
                [0],
                [2, 5],
                []
            ],
            expected: true,
            description: "Sample test case (contains multiple cycles)"
        },
        {
            edges: [
                [1],
                [2],
                [3],
                []
            ],
            expected: false,
            description: "Linear graph (no cycles)"
        },
        {
            edges: [
                [1],
                [2],
                [3],
                [1]
            ],
            expected: true,
            description: "Single cycle"
        },
        {
            edges: [
                [1],
                [2],
                [3],
                [0]
            ],
            expected: true,
            description: "Cycle through all vertices"
        },
        {
            edges: [
                [],
                [],
                [],
                []
            ],
            expected: false,
            description: "No edges"
        },
        {
            edges: [
                [0]
            ],
            expected: true,
            description: "Self loop"
        },
        {
            edges: [
                [1, 2],
                [2],
                []
            ],
            expected: false,
            description: "Tree-like structure"
        },
        {
            edges: [
                [1, 2],
                [2],
                [1]
            ],
            expected: true,
            description: "Complex cycle with multiple paths"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Check for cycle
        const result = cycleInGraph(testCase.edges);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input:`);
        console.log(testCase.edges.map((edge, i) => `  ${i}: ${JSON.stringify(edge)}`).join('\n'));
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
