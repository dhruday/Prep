/*
Dijkstra's Algorithm

Problem Statement:
You're given an integer start and a list edges of pairs of integers representing an
weighted, directed graph with n vertices labeled from 0 to n - 1. The given edges
list contains pairs [source, destination, weight] indicating that there's a one-way
edge from source to destination with the given weight.

Write a function that computes and returns the shortest distances from the start
vertex to all other vertices in the graph using Dijkstra's algorithm.

Each index i in the output array should represent the length of the shortest path
from start to vertex i. If no path exists from start to vertex i, then output[i]
should be -1.

Note that the edges list may contain multiple edges between the same vertices.
In this case, you should consider the edge with the smallest weight.

Sample Input:
start = 0
edges = [
  [0, 1, 4],  // from vertex 0 to vertex 1, weight 4
  [0, 2, 2],  // from vertex 0 to vertex 2, weight 2
  [1, 2, 3],  // from vertex 1 to vertex 2, weight 3
  [2, 3, 2],  // from vertex 2 to vertex 3, weight 2
  [3, 4, 4]   // from vertex 3 to vertex 4, weight 4
]

Sample Output:
[0, 4, 2, 4, 8]
// The shortest path from 0 to 0 is just 0 (distance 0)
// The shortest path from 0 to 1 is 0->1 (distance 4)
// The shortest path from 0 to 2 is 0->2 (distance 2)
// The shortest path from 0 to 3 is 0->2->3 (distance 4)
// The shortest path from 0 to 4 is 0->2->3->4 (distance 8)

Constraints:
- 1 ≤ edges.length ≤ 10000
- 0 ≤ edges[i][0], edges[i][1] < n
- 1 ≤ edges[i][2] ≤ 10000
- 0 ≤ start < n
- n is determined by the highest vertex number in edges
*/

function dijkstrasAlgorithm(start, edges) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            start: 0,
            edges: [
                [0, 1, 4],
                [0, 2, 2],
                [1, 2, 3],
                [2, 3, 2],
                [3, 4, 4]
            ],
            expected: [0, 4, 2, 4, 8],
            description: "Sample test case"
        },
        {
            start: 0,
            edges: [
                [0, 1, 1]
            ],
            expected: [0, 1],
            description: "Single edge"
        },
        {
            start: 0,
            edges: [
                [0, 1, 2],
                [1, 2, 2],
                [0, 2, 5]
            ],
            expected: [0, 2, 4],
            description: "Multiple paths to same destination"
        },
        {
            start: 0,
            edges: [
                [0, 1, 1],
                [1, 2, 1],
                [2, 3, 1],
                [0, 3, 10]
            ],
            expected: [0, 1, 2, 3],
            description: "Direct vs indirect path"
        },
        {
            start: 0,
            edges: [
                [0, 1, 4],
                [1, 2, 3],
                [2, 3, 1],
                [3, 1, 1],
                [1, 0, 2]
            ],
            expected: [0, 4, 7, 8],
            description: "Cycle in graph"
        },
        {
            start: 0,
            edges: [
                [0, 1, 1],
                [1, 2, 1],
                [3, 4, 1]
            ],
            expected: [0, 1, 2, -1, -1],
            description: "Disconnected components"
        },
        {
            start: 2,
            edges: [
                [0, 1, 1],
                [1, 2, 1],
                [2, 3, 1]
            ],
            expected: [-1, -1, 0, 1],
            description: "Different start vertex"
        },
        {
            start: 0,
            edges: [
                [0, 1, 2],
                [0, 1, 1]  // Duplicate edge with different weight
            ],
            expected: [0, 1],
            description: "Duplicate edges"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate shortest paths
        const result = dijkstrasAlgorithm(testCase.start, testCase.edges);
        
        // Compare with expected
        const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
        
        console.log("Input:");
        console.log(`  Start: ${testCase.start}`);
        console.log("  Edges:");
        testCase.edges.forEach(edge => console.log(`    ${edge[0]} -> ${edge[1]} (weight: ${edge[2]})`));
        console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
