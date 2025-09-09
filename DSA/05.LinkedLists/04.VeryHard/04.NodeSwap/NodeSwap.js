/*
Node Swap

Problem Statement:
Write a function that takes in the head of a Singly Linked List, swaps every pair of
adjacent nodes in place (i.e., doesn't create a brand new list), and returns its new head.

If the linked list has an odd number of nodes, its final node should remain in place.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list or to None / null if it's the tail of the list.

Sample Input:
head = 0 -> 1 -> 2 -> 3 -> 4 -> 5 // the head node with value 0

Sample Output:
1 -> 0 -> 3 -> 2 -> 5 -> 4 // the new head node with value 1

Test Cases:
1. Sample case above
2. Empty list
3. Single node list
4. Two node list
5. Odd length list
6. Even length list
7. Long list
8. List with duplicate values
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function nodeSwap(head) {
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

    // Helper function to calculate expected swapped array
    function getSwappedArray(array) {
        const result = [...array];
        for (let i = 0; i < array.length - 1; i += 2) {
            [result[i], result[i + 1]] = [result[i + 1], result[i]];
        }
        return result;
    }

    const testCases = [
        {
            input: [0, 1, 2, 3, 4, 5],
            description: "Sample case from example"
        },
        {
            input: [],
            description: "Empty list"
        },
        {
            input: [1],
            description: "Single node list"
        },
        {
            input: [1, 2],
            description: "Two node list"
        },
        {
            input: [1, 2, 3, 4, 5],
            description: "Odd length list"
        },
        {
            input: [1, 2, 3, 4],
            description: "Even length list"
        },
        {
            input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            description: "Long list"
        },
        {
            input: [1, 1, 2, 2, 3, 3],
            description: "List with duplicate values"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list
        const linkedList = createLinkedList(testCase.input);
        
        // Swap nodes
        const result = nodeSwap(linkedList);
        
        // Convert result to array
        const resultArray = linkedListToArray(result);
        
        // Calculate expected swapped array
        const expected = getSwappedArray(testCase.input);
        
        // Compare with expected
        const passed = JSON.stringify(resultArray) === JSON.stringify(expected);
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected: ${JSON.stringify(expected)}`);
        console.log(`Actual: ${JSON.stringify(resultArray)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
