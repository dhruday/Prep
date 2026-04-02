/*
Remove Duplicates From Linked List

Problem Statement:
You're given the head of a Singly Linked List whose nodes are in sorted order
with respect to their values. Write a function that returns a modified version
of the Linked List that doesn't contain any nodes with duplicate values. The
Linked List should be modified in place (i.e., you shouldn't create a brand
new list), and the modified Linked List should still have its nodes sorted
with respect to their values.

Each LinkedList node has an integer value as well as a next node pointing to the
next node in the list or to None / null if it's the tail of the list.

Sample Input:
linkedList = 1 -> 1 -> 3 -> 4 -> 4 -> 4 -> 5 -> 6 -> 6
// The head node with value 1

Sample Output:
1 -> 3 -> 4 -> 5 -> 6
// The head node with value 1

Test Cases:
1. Sample list above
2. Empty list
3. Single node list
4. List with all duplicates
5. List with no duplicates
6. List with duplicates at start
7. List with duplicates at end
8. List with duplicates in middle
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function removeDuplicatesFromLinkedList(linkedList) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Helper function to create linked list from array
    function createLinkedList(values) {
        if (values.length === 0) return null;
        
        const head = new LinkedList(values[0]);
        let current = head;
        
        for (let i = 1; i < values.length; i++) {
            current.next = new LinkedList(values[i]);
            current = current.next;
        }
        
        return head;
    }

    // Helper function to convert linked list to array
    function linkedListToArray(head) {
        const result = [];
        let current = head;
        
        while (current !== null) {
            result.push(current.value);
            current = current.next;
        }
        
        return result;
    }

    const testCases = [
        {
            input: [1, 1, 3, 4, 4, 4, 5, 6, 6],
            expected: [1, 3, 4, 5, 6],
            description: "Sample list from example"
        },
        {
            input: [],
            expected: [],
            description: "Empty list"
        },
        {
            input: [1],
            expected: [1],
            description: "Single node list"
        },
        {
            input: [1, 1, 1, 1, 1],
            expected: [1],
            description: "List with all duplicates"
        },
        {
            input: [1, 2, 3, 4, 5],
            expected: [1, 2, 3, 4, 5],
            description: "List with no duplicates"
        },
        {
            input: [1, 1, 1, 2, 3, 4],
            expected: [1, 2, 3, 4],
            description: "List with duplicates at start"
        },
        {
            input: [1, 2, 3, 4, 4, 4],
            expected: [1, 2, 3, 4],
            description: "List with duplicates at end"
        },
        {
            input: [1, 2, 2, 2, 3, 4],
            expected: [1, 2, 3, 4],
            description: "List with duplicates in middle"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list
        const linkedList = createLinkedList(testCase.input);
        
        // Remove duplicates
        const result = removeDuplicatesFromLinkedList(linkedList);
        
        // Convert result to array for comparison
        const resultArray = linkedListToArray(result);
        
        // Compare with expected
        const passed = JSON.stringify(resultArray) === JSON.stringify(testCase.expected);
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(resultArray)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
