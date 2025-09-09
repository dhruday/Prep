/*
Shift Linked List

Problem Statement:
Write a function that takes in the head of a Singly Linked List and an integer k, shifts
the list in place (i.e., doesn't create a brand new list) by k positions, and returns
its new head.

Shifting a Linked List means moving its nodes forward or backward and wrapping them
around to the other end of the list where necessary. For example, shifting a Linked
List forward by one position would make its tail become the new head of the linked list.

Whether nodes are moved forward or backward is determined by whether k is positive or
negative.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list or to None / null if it's the tail of the list.

Sample Input:
head = 0 -> 1 -> 2 -> 3 -> 4 -> 5 // the head node with value 0
k = 2

Sample Output:
4 -> 5 -> 0 -> 1 -> 2 -> 3 // the new head node with value 4

Test Cases:
1. Sample case above
2. Negative k value
3. k value larger than list length
4. k value equal to list length
5. k value of zero
6. Single node list
7. Two node list
8. Long list with various k values
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function shiftLinkedList(head, k) {
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

    // Helper function to calculate expected result
    function getExpectedArray(input, k) {
        if (input.length === 0) return [];
        
        // Normalize k to be within array length
        k = k % input.length;
        if (k < 0) k += input.length;
        
        // Perform the shift
        return [...input.slice(-k), ...input.slice(0, -k)];
    }

    const testCases = [
        {
            input: [0, 1, 2, 3, 4, 5],
            k: 2,
            description: "Sample case from example"
        },
        {
            input: [0, 1, 2, 3, 4, 5],
            k: -2,
            description: "Negative k value"
        },
        {
            input: [0, 1, 2, 3],
            k: 6,
            description: "k larger than list length"
        },
        {
            input: [0, 1, 2, 3],
            k: 4,
            description: "k equal to list length"
        },
        {
            input: [0, 1, 2, 3],
            k: 0,
            description: "k equal to zero"
        },
        {
            input: [1],
            k: 3,
            description: "Single node list"
        },
        {
            input: [1, 2],
            k: 1,
            description: "Two node list"
        },
        {
            input: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            k: 4,
            description: "Long list"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list
        const linkedList = createLinkedList(testCase.input);
        
        // Shift the list
        const result = shiftLinkedList(linkedList, testCase.k);
        
        // Convert result to array
        const resultArray = linkedListToArray(result);
        
        // Calculate expected result
        const expected = getExpectedArray(testCase.input, testCase.k);
        
        // Compare with expected
        const passed = JSON.stringify(resultArray) === JSON.stringify(expected);
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`k: ${testCase.k}`);
        console.log(`Expected: ${JSON.stringify(expected)}`);
        console.log(`Actual: ${JSON.stringify(resultArray)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
