/*
Merge Linked Lists

Problem Statement:
Write a function that takes in the heads of two Singly Linked Lists that are in sorted
order, respectively. The function should merge the lists in place (i.e., it shouldn't
create a brand new list) and return the head of the merged list; the merged list
should be in sorted order.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list or to None / null if it's the tail of the list.

You can assume that the input linked lists will always have at least one node; in
other words, the heads will never be None / null.

Sample Input:
headOne = 2 -> 6 -> 7 -> 8 // the head node with value 2
headTwo = 1 -> 3 -> 4 -> 5 -> 9 -> 10 // the head node with value 1

Sample Output:
1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 // the new head node with value 1

Test Cases:
1. Sample case above
2. One list is empty
3. Lists of same length
4. Lists with duplicate values
5. One list is subset of other
6. All values in one list less than other
7. All values in one list greater than other
8. Lists with same values
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function mergeLinkedLists(headOne, headTwo) {
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

    // Helper function to validate sorted order
    function isSorted(array) {
        for (let i = 1; i < array.length; i++) {
            if (array[i] < array[i - 1]) return false;
        }
        return true;
    }

    const testCases = [
        {
            list1: [2, 6, 7, 8],
            list2: [1, 3, 4, 5, 9, 10],
            description: "Sample case from example"
        },
        {
            list1: [],
            list2: [1, 2, 3, 4, 5],
            description: "First list empty"
        },
        {
            list1: [1, 3, 5, 7],
            list2: [2, 4, 6, 8],
            description: "Lists of same length"
        },
        {
            list1: [1, 2, 2, 3, 3],
            list2: [2, 3, 4, 4, 5],
            description: "Lists with duplicate values"
        },
        {
            list1: [1, 2, 3, 4, 5],
            list2: [2, 3, 4],
            description: "One list is subset of other"
        },
        {
            list1: [1, 2, 3],
            list2: [4, 5, 6],
            description: "All values in first list less than second"
        },
        {
            list1: [4, 5, 6],
            list2: [1, 2, 3],
            description: "All values in first list greater than second"
        },
        {
            list1: [1, 1, 1],
            list2: [1, 1, 1],
            description: "Lists with same values"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked lists
        const list1 = createLinkedList(testCase.list1);
        const list2 = createLinkedList(testCase.list2);
        
        // Merge lists
        const result = mergeLinkedLists(list1, list2);
        
        // Convert result to array
        const resultArray = linkedListToArray(result);
        
        // Calculate expected result
        const expected = [...testCase.list1, ...testCase.list2].sort((a, b) => a - b);
        
        // Validate result
        const isCorrectLength = resultArray.length === expected.length;
        const isSortedCorrectly = isSorted(resultArray);
        const hasAllElements = JSON.stringify([...resultArray].sort((a, b) => a - b)) === 
                             JSON.stringify(expected);
        
        const passed = isCorrectLength && isSortedCorrectly && hasAllElements;
        
        console.log(`List 1: ${JSON.stringify(testCase.list1)}`);
        console.log(`List 2: ${JSON.stringify(testCase.list2)}`);
        console.log(`Expected: ${JSON.stringify(expected)}`);
        console.log(`Actual: ${JSON.stringify(resultArray)}`);
        console.log(`Correct Length: ${isCorrectLength ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Sorted Correctly: ${isSortedCorrectly ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Contains All Elements: ${hasAllElements ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
