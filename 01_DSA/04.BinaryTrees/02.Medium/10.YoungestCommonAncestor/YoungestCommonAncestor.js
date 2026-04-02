/*
Youngest Common Ancestor

Problem Statement:
You're given three inputs, all of which are instances of an AncestralTree class that
have an ancestor property pointing to their youngest ancestor. The first input is the
top ancestor in an ancestral tree (i.e., the only instance that has no ancestor), and
the other two inputs are descendants in the ancestral tree.

Write a function that returns the youngest common ancestor to the two descendants.

Note that a descendant is considered its own ancestor. So in the simple ancestral tree
below, the youngest common ancestor to nodes A and B is node A.

Sample Input:
// The ancestral tree below is represented as:
// nodes: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
// edges: [
//   ["B", "A"], ["C", "A"], ["D", "B"], ["E", "B"], ["F", "C"],
//   ["G", "C"], ["H", "D"], ["I", "D"], ["J", "E"], ["K", "E"],
//   ["L", "F"], ["M", "F"], ["N", "G"], ["O", "G"], ["P", "H"],
//   ["Q", "H"], ["R", "I"], ["S", "I"], ["T", "J"], ["U", "J"],
//   ["V", "K"], ["W", "K"], ["X", "L"], ["Y", "L"], ["Z", "M"]
// ]
topAncestor = node A
descendantOne = node E
descendantTwo = node I

Sample Output:
node B
// This is the youngest common ancestor to nodes E and I

Test Cases:
1. Sample tree above with various node combinations
2. Nodes that are their own ancestors
3. Direct ancestor-descendant relationship
4. Nodes with same parent
5. Nodes in different subtrees
6. One node is the ancestor of the other
7. Root node is one of the descendants
*/

class AncestralTree {
    constructor(name) {
        this.name = name;
        this.ancestor = null;
    }

    addAsAncestor(descendants) {
        for (const descendant of descendants) {
            descendant.ancestor = this;
        }
    }
}

function getYoungestCommonAncestor(topAncestor, descendantOne, descendantTwo) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Helper function to create ancestral tree from edges
    function createAncestralTree(nodes, edges) {
        const treeNodes = {};
        
        // Create all nodes
        for (const name of nodes) {
            treeNodes[name] = new AncestralTree(name);
        }
        
        // Add ancestor relationships
        for (const [descendant, ancestor] of edges) {
            treeNodes[descendant].ancestor = treeNodes[ancestor];
        }
        
        return treeNodes;
    }

    const testCases = [
        {
            nodes: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            edges: [
                ["B", "A"], ["C", "A"], ["D", "B"], ["E", "B"], ["F", "C"],
                ["G", "C"], ["H", "D"], ["I", "D"], ["J", "E"], ["K", "E"],
                ["L", "F"], ["M", "F"], ["N", "G"], ["O", "G"], ["P", "H"],
                ["Q", "H"], ["R", "I"], ["S", "I"], ["T", "J"], ["U", "J"],
                ["V", "K"], ["W", "K"], ["X", "L"], ["Y", "L"], ["Z", "M"]
            ],
            pairs: [
                { one: "E", two: "I", expected: "B", description: "Sample case from example" },
                { one: "A", two: "B", expected: "A", description: "One node is ancestor of other" },
                { one: "T", two: "Z", expected: "A", description: "Nodes in different subtrees" },
                { one: "T", two: "U", expected: "J", description: "Nodes with same parent" },
                { one: "D", two: "Z", expected: "A", description: "Distant nodes" },
                { one: "B", two: "G", expected: "A", description: "Direct children of root" },
                { one: "H", two: "W", expected: "B", description: "Complex relationship" }
            ]
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, caseIndex) => {
        console.log(`\nTest Case Set ${caseIndex + 1}:`);
        
        // Create the ancestral tree
        const treeNodes = createAncestralTree(testCase.nodes, testCase.edges);
        
        // Run each pair of nodes
        testCase.pairs.forEach((pair, pairIndex) => {
            console.log(`\nSubtest ${pairIndex + 1} (${pair.description}):`);
            
            const result = getYoungestCommonAncestor(
                treeNodes["A"],
                treeNodes[pair.one],
                treeNodes[pair.two]
            );
            
            const passed = result.name === pair.expected;
            console.log(`Descendant One: ${pair.one}`);
            console.log(`Descendant Two: ${pair.two}`);
            console.log(`Expected Ancestor: ${pair.expected}`);
            console.log(`Actual Ancestor: ${result.name}`);
            console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
            
            if (!passed) allTestsPassed = false;
        });
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
