/*
Remove Kth Node From End

Problem Statement:
Write a function that takes in the head of a Singly Linked List and an integer k
(assume that the list has at least k nodes). The function should remove the kth node
from the end of the list.

Note that every node in the Singly Linked List has a "value" property storing its value
as well as a "next" property pointing to the next node in the list or None/null if it's
the tail of the list.

Sample Input:
head = 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
k = 4

Sample Output:
0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 7 -> 8 -> 9
// Remove the 4th node from the end (node with value 6)

Note:
- The head node should remain the head node of the list
- If k = 1, remove the last node
- You are not given access to the length of the linked list
- Use only one pass through the linked list
- The input head will never be null
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function removeKthNodeFromEnd(head, k) {
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
            list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            k: 4,
            expected: [0, 1, 2, 3, 4, 5, 7, 8, 9],
            description: "Sample case from example"
        },
        {
            list: [1],
            k: 1,
            expected: [],
            description: "Single node, k=1"
        },
        {
            list: [1, 2],
            k: 1,
            expected: [1],
            description: "Remove last node"
        },
        {
            list: [1, 2],
            k: 2,
            expected: [2],
            description: "Remove first node"
        },
        {
            list: [1, 2, 3, 4, 5],
            k: 3,
            expected: [1, 2, 4, 5],
            description: "Remove from middle"
        },
        {
            list: [1, 2, 3, 4, 5, 6, 7],
            k: 7,
            expected: [2, 3, 4, 5, 6, 7],
            description: "Remove head node"
        },
        {
            list: [1, 1, 1, 1, 1],
            k: 3,
            expected: [1, 1, 1, 1],
            description: "List with duplicate values"
        },
        {
            list: [1, 2, 3, 4, 5],
            k: 1,
            expected: [1, 2, 3, 4],
            description: "Remove tail"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list
        const linkedList = createLinkedList(testCase.list);
        
        // Remove kth node from end
        removeKthNodeFromEnd(linkedList, testCase.k);
        
        // Convert result to array for comparison
        const resultArray = linkedListToArray(linkedList);
        
        // Compare with expected
        const passed = JSON.stringify(resultArray) === JSON.stringify(testCase.expected);
        
        console.log(`Input List: ${JSON.stringify(testCase.list)}`);
        console.log(`k: ${testCase.k}`);
        console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(resultArray)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
