/*
Zip Linked List

Problem Statement:
Write a function that takes in the head of a Singly Linked List and returns a modified
version of the Linked List that is "zipped". A Linked List is zipped if its nodes are
in the following pattern:

1st node -> last node -> 2nd node -> 2nd to last node -> 3rd node -> 3rd to last node, etc.

The pattern continues until the middle of the list. If the list has an odd number of
nodes, the middle node should remain in place.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list or to None / null if it's the tail of the list.

Sample Input:
linkedList = 1 -> 2 -> 3 -> 4 -> 5 -> 6 // the head node with value 1

Sample Output:
1 -> 6 -> 2 -> 5 -> 3 -> 4 // the head node with value 1

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

function zipLinkedList(head) {
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

    // Helper function to calculate expected zipped array
    function getZippedArray(array) {
        if (array.length <= 2) return array;
        
        const result = [];
        let left = 0;
        let right = array.length - 1;
        
        while (left < right) {
            result.push(array[left]);
            result.push(array[right]);
            left++;
            right--;
        }
        
        if (left === right) {
            result.push(array[left]);
        }
        
        return result;
    }

    const testCases = [
        {
            input: [1, 2, 3, 4, 5, 6],
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
            input: [1, 1, 1, 2, 2, 2],
            description: "List with duplicate values"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list
        const linkedList = createLinkedList(testCase.input);
        
        // Zip the list
        const result = zipLinkedList(linkedList);
        
        // Convert result to array
        const resultArray = linkedListToArray(result);
        
        // Calculate expected zipped array
        const expected = getZippedArray(testCase.input);
        
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
