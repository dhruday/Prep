/*
Sum of Linked Lists

Problem Statement:
Write a function that takes in two Linked Lists of potentially different lengths. Each
Linked List represents a non-negative integer, where each node in the Linked List is a
digit of that integer, and the first node in each Linked List always represents the
least significant digit of the integer. Return the head of a new Linked List that
represents the sum of the integers represented by the two input Linked Lists.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list or to None / null if it's the tail of the list. The value of each
LinkedList node is always in the range of 0 - 9.

Note: your function must create and return a new Linked List, not modify the input
Linked Lists.

Sample Input:
linkedListOne = 2 -> 4 -> 7 -> 1
linkedListTwo = 9 -> 4 -> 5
// linkedListOne represents 1,742
// linkedListTwo represents 549

Sample Output:
1 -> 9 -> 2 -> 2
// 1,742 + 549 = 2,291

Test Cases:
1. Sample case above
2. Lists with same length
3. Lists with different lengths
4. List with single digit
5. List with carry over
6. Empty lists
7. One empty list
8. Lists with leading zeros
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function sumOfLinkedLists(linkedListOne, linkedListTwo) {
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

    // Helper function to calculate expected sum
    function calculateExpectedSum(list1, list2) {
        let num1 = 0;
        let num2 = 0;
        let multiplier = 1;
        
        for (const digit of list1) {
            num1 += digit * multiplier;
            multiplier *= 10;
        }
        
        multiplier = 1;
        for (const digit of list2) {
            num2 += digit * multiplier;
            multiplier *= 10;
        }
        
        const sum = num1 + num2;
        if (sum === 0) return [0];
        
        const result = [];
        let temp = sum;
        while (temp > 0) {
            result.push(temp % 10);
            temp = Math.floor(temp / 10);
        }
        return result;
    }

    const testCases = [
        {
            list1: [2, 4, 7, 1],
            list2: [9, 4, 5],
            description: "Sample case from example"
        },
        {
            list1: [1, 2, 3],
            list2: [4, 5, 6],
            description: "Lists with same length"
        },
        {
            list1: [1],
            list2: [9, 9, 9],
            description: "Lists with different lengths"
        },
        {
            list1: [5],
            list2: [5],
            description: "Single digit sum with carry"
        },
        {
            list1: [9, 9, 9],
            list2: [9, 9, 9],
            description: "Multiple carries"
        },
        {
            list1: [],
            list2: [],
            description: "Empty lists"
        },
        {
            list1: [1, 2, 3],
            list2: [],
            description: "One empty list"
        },
        {
            list1: [0, 0, 1],
            list2: [0, 0, 2],
            description: "Lists with leading zeros"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked lists
        const list1 = createLinkedList(testCase.list1);
        const list2 = createLinkedList(testCase.list2);
        
        // Calculate sum
        const result = sumOfLinkedLists(list1, list2);
        
        // Convert result to array
        const resultArray = linkedListToArray(result);
        
        // Calculate expected result
        const expected = calculateExpectedSum(testCase.list1, testCase.list2);
        
        // Compare with expected
        const passed = JSON.stringify(resultArray) === JSON.stringify(expected);
        
        console.log(`List 1: ${JSON.stringify(testCase.list1)}`);
        console.log(`List 2: ${JSON.stringify(testCase.list2)}`);
        console.log(`Expected: ${JSON.stringify(expected)}`);
        console.log(`Actual: ${JSON.stringify(resultArray)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
