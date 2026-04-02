/*
Reverse Linked List

Problem Statement:
Write a function that takes in the head of a Singly Linked List, reverses the list
in place (i.e., doesn't create a brand new list), and returns its new head.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list or to None / null if it's the tail of the list.

You can assume that the input Linked List will always have at least one node; in other
words, the head will never be None / null.

Sample Input:
head = 0 -> 1 -> 2 -> 3 -> 4 -> 5 // the head node with value 0

Sample Output:
5 -> 4 -> 3 -> 2 -> 1 -> 0 // the new head node with value 5

Test Cases:
1. Sample case above
2. Single node list
3. Two node list
4. List with duplicate values
5. Long list
6. List with all same values
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function reverseLinkedList(head) {
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
            input: [0, 1, 2, 3, 4, 5],
            expected: [5, 4, 3, 2, 1, 0],
            description: "Sample case from example"
        },
        {
            input: [1],
            expected: [1],
            description: "Single node list"
        },
        {
            input: [1, 2],
            expected: [2, 1],
            description: "Two node list"
        },
        {
            input: [1, 2, 2, 3, 3, 3, 4],
            expected: [4, 3, 3, 3, 2, 2, 1],
            description: "List with duplicate values"
        },
        {
            input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            expected: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
            description: "Long list"
        },
        {
            input: [5, 5, 5, 5, 5],
            expected: [5, 5, 5, 5, 5],
            description: "List with all same values"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list
        const linkedList = createLinkedList(testCase.input);
        
        // Reverse the list
        const result = reverseLinkedList(linkedList);
        
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
