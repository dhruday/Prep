/*
Linked List Palindrome

Problem Statement:
Write a function that takes in the head of a Singly Linked List and returns a boolean
representing whether the linked list's nodes form a palindrome. Your function shouldn't
make use of any auxiliary data structure.

A palindrome is usually defined as a string that's written the same forward and
backward. For a linked list's nodes to form a palindrome, their values must be the
same when read from left to right and from right to left. Note that single-character
strings are palindromes, which means that single-node linked lists form palindromes.

Each LinkedList node has an integer value as well as a next node pointing to the next
node in the list or to None / null if it's the tail of the list.

Sample Input:
head = 0 -> 1 -> 2 -> 2 -> 1 -> 0 // the head node with value 0

Sample Output:
true // it's read the same forward and backward

Test Cases:
1. Sample case above
2. Single node list
3. Two node palindrome
4. Two node non-palindrome
5. Empty list
6. Odd length palindrome
7. Even length palindrome
8. Non-palindrome
9. Long palindrome
*/

class LinkedList {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function linkedListPalindrome(head) {
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

    // Helper function to check if array is palindrome
    function isPalindrome(array) {
        for (let i = 0; i < Math.floor(array.length / 2); i++) {
            if (array[i] !== array[array.length - 1 - i]) return false;
        }
        return true;
    }

    const testCases = [
        {
            input: [0, 1, 2, 2, 1, 0],
            expected: true,
            description: "Sample case from example"
        },
        {
            input: [1],
            expected: true,
            description: "Single node list"
        },
        {
            input: [1, 1],
            expected: true,
            description: "Two node palindrome"
        },
        {
            input: [1, 2],
            expected: false,
            description: "Two node non-palindrome"
        },
        {
            input: [],
            expected: true,
            description: "Empty list"
        },
        {
            input: [1, 2, 3, 2, 1],
            expected: true,
            description: "Odd length palindrome"
        },
        {
            input: [1, 2, 3, 3, 2, 1],
            expected: true,
            description: "Even length palindrome"
        },
        {
            input: [1, 2, 3, 4, 5],
            expected: false,
            description: "Non-palindrome"
        },
        {
            input: [1, 2, 3, 4, 5, 5, 4, 3, 2, 1],
            expected: true,
            description: "Long palindrome"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Create input linked list
        const linkedList = createLinkedList(testCase.input);
        
        // Check if it's a palindrome
        const result = linkedListPalindrome(linkedList);
        
        // Get the final list state for verification
        const finalArray = linkedListToArray(linkedList);
        
        // Verify the list hasn't been modified
        const listUnmodified = JSON.stringify(finalArray) === JSON.stringify(testCase.input);
        
        // Compare with expected
        const correctResult = result === testCase.expected;
        const passed = correctResult && listUnmodified;
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`List Unmodified: ${listUnmodified ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Correct Result: ${correctResult ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
