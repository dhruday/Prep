/*
Rearrange Linked List

Problem Statement:
Write a function that takes in the head of a Singly Linked List and an integer k,
rearranges the list in place (i.e., doesn't create a brand new list) around nodes with
value k, and returns its new head.

Rearranging a Linked List around nodes with value k means moving all nodes with a
value less than k before all nodes with value k and moving all nodes with a value
greater than k after all nodes with value k.

All moved nodes should maintain their original relative ordering if possible.

Note that the linked list should be rearranged even if it doesn't have any nodes with
value k.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list or to None / null if it's the tail of the list.

Sample Input:
head = 3 -> 0 -> 5 -> 2 -> 1 -> 4 // the head node with value 3
k = 3

Sample Output:
0 -> 2 -> 1 -> 3 -> 5 -> 4 // the new head node with value 0
// Note that the nodes with values 0, 2, and 1 have
// maintained their original relative ordering, and
// so have the nodes with values 5 and 4.

Test Cases:
1. Sample case above
2. List with no k values
3. List with all k values
4. List with values only less than k
5. List with values only greater than k
6. Single node list
7. Empty list
8. Long list with multiple k values
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function rearrangeLinkedList(head, k) {
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

    // Helper function to validate rearrangement
    function validateRearrangement(input, result, k) {
        // Check if all elements are present
        if (input.length !== result.length) return false;
        
        // Check if relative ordering is maintained for elements less than k
        const lessThanK = input.filter(x => x < k);
        const resultLessThanK = result.filter(x => x < k);
        if (JSON.stringify(lessThanK) !== JSON.stringify(resultLessThanK)) return false;
        
        // Check if relative ordering is maintained for elements equal to k
        const equalToK = input.filter(x => x === k);
        const resultEqualToK = result.filter(x => x === k);
        if (JSON.stringify(equalToK) !== JSON.stringify(resultEqualToK)) return false;
        
        // Check if relative ordering is maintained for elements greater than k
        const greaterThanK = input.filter(x => x > k);
        const resultGreaterThanK = result.filter(x => x > k);
        if (JSON.stringify(greaterThanK) !== JSON.stringify(resultGreaterThanK)) return false;
        
        // Check if all elements less than k come before k
        let foundK = false;
        let foundGreater = false;
        for (const value of result) {
            if (value === k) foundK = true;
            else if (value > k) foundGreater = true;
            else if (value < k && (foundK || foundGreater)) return false;
        }
        
        return true;
    }

    const testCases = [
        {
            input: [3, 0, 5, 2, 1, 4],
            k: 3,
            description: "Sample case from example"
        },
        {
            input: [1, 4, 5, 2, 6],
            k: 3,
            description: "List with no k values"
        },
        {
            input: [3, 3, 3, 3, 3],
            k: 3,
            description: "List with all k values"
        },
        {
            input: [1, 0, 2, 1, 0],
            k: 3,
            description: "List with values only less than k"
        },
        {
            input: [4, 5, 6, 7, 8],
            k: 3,
            description: "List with values only greater than k"
        },
        {
            input: [1],
            k: 2,
            description: "Single node list"
        },
        {
            input: [],
            k: 5,
            description: "Empty list"
        },
        {
            input: [5, 3, 7, 2, 3, 8, 1, 3, 4, 6],
            k: 3,
            description: "Long list with multiple k values"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list
        const linkedList = createLinkedList(testCase.input);
        
        // Rearrange the list
        const result = rearrangeLinkedList(linkedList, testCase.k);
        
        // Convert result to array
        const resultArray = linkedListToArray(result);
        
        // Validate rearrangement
        const isValid = validateRearrangement(testCase.input, resultArray, testCase.k);
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`k: ${testCase.k}`);
        console.log(`Result: ${JSON.stringify(resultArray)}`);
        console.log(`Valid Rearrangement: ${isValid ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Status: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!isValid) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
