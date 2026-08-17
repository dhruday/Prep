/*
Number Of Binary Tree Topologies

Write a function that takes in a non-negative integer n and returns the number of
possible Binary Tree topologies that can be created using exactly n nodes.

A Binary Tree topology is defined as any Binary Tree configuration, irrespective
of node values. For instance, there exist only two Binary Tree topologies when
n = 2: a root node with a left node, and a root node with a right node.

Note that when n = 0, there's one topology that can be created: the None/null node.

Sample Input:
n = 3

Sample Output:
5
// The 5 possible topologies are:
//   1         1          1         1           1
//  /         /            \          \          \
// 2         2              2          2         2
//  \       /              /          /           \
//   3     3              3        3               3
*/

function numberOfBinaryTreeTopologies(n) {
    // Dynamic programming approach using memoization
    const cache = new Map();
    
    function calculateTopologies(n) {
        if (n <= 1) return 1;
        if (cache.has(n)) return cache.get(n);
        
        let totalTopologies = 0;
        
        // For each possible number of nodes in the left subtree
        for (let leftNodes = 0; leftNodes < n; leftNodes++) {
            const rightNodes = n - 1 - leftNodes;
            
            // Multiply the number of possible left and right subtree topologies
            const leftTopologies = calculateTopologies(leftNodes);
            const rightTopologies = calculateTopologies(rightNodes);
            
            totalTopologies += leftTopologies * rightTopologies;
        }
        
        cache.set(n, totalTopologies);
        return totalTopologies;
    }
    
    return calculateTopologies(n);
}

// Test Cases
function runTests() {
    const testCases = [
        {
            n: 0,
            expected: 1,
            description: "Zero nodes"
        },
        {
            n: 1,
            expected: 1,
            description: "One node"
        },
        {
            n: 2,
            expected: 2,
            description: "Two nodes"
        },
        {
            n: 3,
            expected: 5,
            description: "Three nodes"
        },
        {
            n: 4,
            expected: 14,
            description: "Four nodes"
        },
        {
            n: 5,
            expected: 42,
            description: "Five nodes"
        },
        {
            n: 6,
            expected: 132,
            description: "Six nodes"
        },
        {
            n: 7,
            expected: 429,
            description: "Seven nodes"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log(`Input n = ${testCase.n}`);
        
        const result = numberOfBinaryTreeTopologies(testCase.n);
        console.log("Expected:", testCase.expected);
        console.log("Got:", result);
        
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            console.log(`Failed: Expected ${testCase.expected} but got ${result}`);
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
