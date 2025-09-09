/*
Find Loop

Problem Statement:
Write a function that takes in the head of a Singly Linked List that contains a loop
(in other words, the list's tail node points to some node in the list instead of None/null).
The function should return the node (the actual node--not just its value) from which
the loop originates in constant space.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list.

Sample Input:
head = 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 // the head node with value 0
                           ^         v
                           9 <- 8 <- 7

Sample Output:
4 -> 5 -> 6 -> 7 -> 8 -> 9 // the node with value 4
^                        v
9 <- 8 <- 7 <- 6 <- 5 <- 4

Test Cases:
1. Sample case above
2. Small loop (2 nodes)
3. Loop at head
4. Loop at tail
5. Long list with loop in middle
6. Single node loop
7. Two node loop
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function findLoop(head) {
    // Write your code here
}

// Test Cases
function runTests() {
    // Helper function to create linked list with a loop
    function createLoopedList(values, loopStartIndex) {
        if (values.length === 0) return null;
        
        // Create nodes
        const nodes = values.map(value => new LinkedList(value));
        
        // Connect nodes
        for (let i = 0; i < nodes.length - 1; i++) {
            nodes[i].next = nodes[i + 1];
        }
        
        // Create loop
        nodes[nodes.length - 1].next = nodes[loopStartIndex];
        
        return nodes[0];
    }

    // Helper function to validate result
    function validateLoop(head, result) {
        if (!head || !result) return false;
        
        // Use Floyd's algorithm to find meeting point
        let slow = head;
        let fast = head;
        
        while (fast !== null && fast.next !== null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow === fast) break;
        }
        
        if (fast === null || fast.next === null) return false;
        
        // Find loop start
        slow = head;
        while (slow !== fast) {
            slow = slow.next;
            fast = fast.next;
        }
        
        return slow === result;
    }

    const testCases = [
        {
            values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            loopStartIndex: 4,
            description: "Sample case from example"
        },
        {
            values: [1, 2],
            loopStartIndex: 0,
            description: "Two node loop at head"
        },
        {
            values: [1, 2, 3, 4, 5],
            loopStartIndex: 0,
            description: "Loop at head"
        },
        {
            values: [1, 2, 3, 4, 5],
            loopStartIndex: 4,
            description: "Loop at tail"
        },
        {
            values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            loopStartIndex: 5,
            description: "Long list with loop in middle"
        },
        {
            values: [1],
            loopStartIndex: 0,
            description: "Single node loop"
        },
        {
            values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            loopStartIndex: 9,
            description: "Loop at second to last node"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list with loop
        const linkedList = createLoopedList(testCase.values, testCase.loopStartIndex);
        
        // Find loop
        const result = findLoop(linkedList);
        
        // Validate result
        const passed = validateLoop(linkedList, result) && result.value === testCase.values[testCase.loopStartIndex];
        
        console.log(`Input Values: ${JSON.stringify(testCase.values)}`);
        console.log(`Loop Starts At Index: ${testCase.loopStartIndex}`);
        console.log(`Expected Loop Start Value: ${testCase.values[testCase.loopStartIndex]}`);
        console.log(`Actual Loop Start Value: ${result ? result.value : null}`);
        console.log(`Loop Valid: ${validateLoop(linkedList, result) ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
