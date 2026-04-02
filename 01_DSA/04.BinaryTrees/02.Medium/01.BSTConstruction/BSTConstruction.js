/*
BST Construction

Problem Statement:
Write a BST class for a Binary Search Tree. The class should support:
- Inserting values with the insert method.
- Removing values with the remove method.
- Searching for values with the contains method.

Note that you can't remove values from a single-node tree. In other words, calling the remove
method on a single-node tree should simply not do anything.

The class should have a "value" property set to be inserted value, and "left" and "right" properties,
both of which should point to either null or to another BST.

Sample Usage:
const root = new BST(10);
root.left = new BST(5);
root.right = new BST(15);
root.left.left = new BST(2);
root.left.right = new BST(5);
root.right.left = new BST(13);
root.right.right = new BST(22);
root.left.left.left = new BST(1);
root.right.left.right = new BST(14);

Test Cases:
1. Insertion Test
   Starting with empty tree:
   - Insert 10 (root)
   - Insert 5 (left child)
   - Insert 15 (right child)
   Expected: Valid BST with these values

2. Search Test
   In the sample tree above:
   - Search for 10 (exists)
   - Search for 5 (exists)
   - Search for 100 (doesn't exist)

3. Removal Test
   In the sample tree above:
   - Remove leaf node (1)
   - Remove node with one child (13)
   - Remove node with two children (10)

4. Edge Cases
   - Single node removal
   - Empty tree operations
   - Duplicate values

Solution Approaches:
1. Iterative Solution (Optimal): 
   Average: O(log n) time | O(1) space
   Worst: O(n) time | O(1) space
   - Use while loops for traversal
   - Track parent nodes for removal
   - Handle all edge cases carefully

2. Recursive Solution:
   Average: O(log n) time | O(log n) space
   Worst: O(n) time | O(n) space
   - More elegant but uses stack space
   - Same basic logic as iterative
*/

class BST {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }

    insert(value) {
        // Write your code here
    }

    contains(value) {
        // Write your code here
    }

    remove(value) {
        // Write your code here
    }
}

// Test runner
function runTests() {
    console.log("Running BST Tests...");
    console.log("-".repeat(50));

    // Test 1: Insertion and Structure
    console.log("Test 1: Insertion and Tree Structure");
    const bst = new BST(10);
    const valuesToInsert = [5, 15, 2, 5, 13, 22, 1, 14];
    
    valuesToInsert.forEach(value => bst.insert(value));
    
    console.log("Testing if tree structure is correct...");
    const isValidBST = validateBST(bst);
    console.log(`BST is valid: ${isValidBST ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log("-".repeat(50));

    // Test 2: Search Operations
    console.log("Test 2: Search Operations");
    const searchTests = [
        { value: 10, expected: true },
        { value: 5, expected: true },
        { value: 100, expected: false },
        { value: 14, expected: true },
        { value: 0, expected: false }
    ];

    searchTests.forEach((test, index) => {
        const result = bst.contains(test.value);
        console.log(`Searching for ${test.value}:`);
        console.log(`Expected: ${test.expected}, Got: ${result}`);
        console.log(`Status: ${result === test.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
    });
    console.log("-".repeat(50));

    // Test 3: Removal Operations
    console.log("Test 3: Removal Operations");
    const removalTests = [
        { value: 1, description: "Leaf node" },
        { value: 13, description: "Node with one child" },
        { value: 10, description: "Root node with two children" }
    ];

    removalTests.forEach((test, index) => {
        console.log(`Removing ${test.value} (${test.description}):`);
        bst.remove(test.value);
        const stillContains = bst.contains(test.value);
        const isStillValid = validateBST(bst);
        console.log(`Value removed: ${!stillContains ? 'Yes' : 'No'}`);
        console.log(`BST still valid: ${isStillValid ? 'Yes' : 'No'}`);
        console.log(`Status: ${!stillContains && isStillValid ? 'PASSED ✅' : 'FAILED ❌'}`);
    });
    console.log("-".repeat(50));

    // Test 4: Edge Cases
    console.log("Test 4: Edge Cases");
    
    // Single node removal
    const singleNode = new BST(1);
    singleNode.remove(1);
    console.log("Single node removal:");
    console.log(`Status: ${singleNode.value === 1 ? 'PASSED ✅' : 'FAILED ❌'}`);

    // Empty tree operations
    const emptyBST = new BST(1);
    emptyBST.remove(1);
    console.log("Empty tree operations:");
    console.log(`Status: ${emptyBST.contains(1) === false ? 'PASSED ✅' : 'FAILED ❌'}`);

    // Duplicate values
    const dupBST = new BST(5);
    dupBST.insert(5);
    console.log("Duplicate values:");
    console.log(`Status: ${validateBST(dupBST) ? 'PASSED ✅' : 'FAILED ❌'}`);
}

// Helper function to validate BST property
function validateBST(node, min = -Infinity, max = Infinity) {
    if (node === null) return true;
    
    if (node.value < min || node.value >= max) return false;
    
    return validateBST(node.left, min, node.value) && 
           validateBST(node.right, node.value, max);
}

// Run all tests
runTests();
