/*
Linked List Construction

Problem Statement:
Write a DoublyLinkedList class that implements a doubly linked list. The class should
support:
1. Setting the head and tail of the linked list.
2. Inserting nodes before and after other nodes as well as at given positions.
3. Removing given nodes and removing nodes with given values.
4. Searching for nodes with given values.

Note that the setHead, setTail, insertBefore, insertAfter, insertAtPosition, and remove
methods all take in actual Node instances as input parameters—not just values. This
means that you'll need to create new nodes out of the values that you receive as input
before calling these methods.

Each node will have an integer value as well as a prev node and a next node, both of
which can point to either another node or None/null.

Sample Usage:
// Assume the following linked list has already been created:
1 <-> 2 <-> 3 <-> 4 <-> 5
setHead(4): 4 <-> 1 <-> 2 <-> 3 <-> 5
setTail(6): 4 <-> 1 <-> 2 <-> 3 <-> 5 <-> 6
insertBefore(6, 3): 4 <-> 1 <-> 2 <-> 3 <-> 5 <-> 6
insertAfter(6, 3): 4 <-> 1 <-> 2 <-> 6 <-> 3 <-> 5
insertAtPosition(1, 3): 3 <-> 4 <-> 1 <-> 2 <-> 6 <-> 5
removeNodesWithValue(3): 4 <-> 1 <-> 2 <-> 6 <-> 5
remove(2): 4 <-> 1 <-> 6 <-> 5
containsNodeWithValue(5): true
*/

class Node {
    constructor(value) {
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

class DoublyLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
    }

    setHead(node) {
        // Write your code here
    }

    setTail(node) {
        // Write your code here
    }

    insertBefore(node, nodeToInsert) {
        // Write your code here
    }

    insertAfter(node, nodeToInsert) {
        // Write your code here
    }

    insertAtPosition(position, nodeToInsert) {
        // Write your code here
    }

    removeNodesWithValue(value) {
        // Write your code here
    }

    remove(node) {
        // Write your code here
    }

    containsNodeWithValue(value) {
        // Write your code here
    }
}

// Test Cases
function runTests() {
    // Helper function to convert linked list to array
    function linkedListToArray(list) {
        const array = [];
        let current = list.head;
        while (current !== null) {
            array.push(current.value);
            current = current.next;
        }
        return array;
    }

    // Helper function to verify doubly linked list connections
    function verifyListConnections(list) {
        if (!list.head || !list.tail) return true;
        
        // Forward traversal
        let current = list.head;
        while (current.next) {
            if (current.next.prev !== current) return false;
            current = current.next;
        }
        if (current !== list.tail) return false;
        
        // Backward traversal
        current = list.tail;
        while (current.prev) {
            if (current.prev.next !== current) return false;
            current = current.prev;
        }
        return current === list.head;
    }

    const testCases = [
        {
            description: "Basic operations test",
            operations: [
                {
                    type: "construction",
                    values: [1, 2, 3, 4, 5],
                    expected: [1, 2, 3, 4, 5]
                },
                {
                    type: "setHead",
                    value: 4,
                    expected: [4, 1, 2, 3, 5]
                },
                {
                    type: "setTail",
                    value: 6,
                    expected: [4, 1, 2, 3, 5, 6]
                },
                {
                    type: "insertBefore",
                    nodeValue: 6,
                    toInsertValue: 3,
                    expected: [4, 1, 2, 3, 5, 6]
                },
                {
                    type: "insertAfter",
                    nodeValue: 6,
                    toInsertValue: 3,
                    expected: [4, 1, 2, 6, 3, 5]
                },
                {
                    type: "removeValue",
                    value: 3,
                    expected: [4, 1, 2, 6, 5]
                }
            ]
        },
        {
            description: "Empty list operations",
            operations: [
                {
                    type: "construction",
                    values: [],
                    expected: []
                },
                {
                    type: "setHead",
                    value: 1,
                    expected: [1]
                },
                {
                    type: "setTail",
                    value: 2,
                    expected: [1, 2]
                }
            ]
        },
        {
            description: "Single node operations",
            operations: [
                {
                    type: "construction",
                    values: [1],
                    expected: [1]
                },
                {
                    type: "remove",
                    value: 1,
                    expected: []
                },
                {
                    type: "setHead",
                    value: 2,
                    expected: [2]
                }
            ]
        },
        {
            description: "Complex operations",
            operations: [
                {
                    type: "construction",
                    values: [1, 2, 3, 4, 5],
                    expected: [1, 2, 3, 4, 5]
                },
                {
                    type: "insertAtPosition",
                    position: 3,
                    value: 6,
                    expected: [1, 2, 6, 3, 4, 5]
                },
                {
                    type: "removeValue",
                    value: 3,
                    expected: [1, 2, 6, 4, 5]
                },
                {
                    type: "containsValue",
                    value: 5,
                    expected: true
                },
                {
                    type: "containsValue",
                    value: 3,
                    expected: false
                }
            ]
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        const list = new DoublyLinkedList();
        
        testCase.operations.forEach((operation, opIndex) => {
            console.log(`\nOperation ${opIndex + 1}: ${operation.type}`);
            
            let result;
            switch (operation.type) {
                case "construction":
                    operation.values.forEach(value => {
                        const node = new Node(value);
                        if (!list.head) list.setHead(node);
                        else list.setTail(node);
                    });
                    break;
                    
                case "setHead":
                    list.setHead(new Node(operation.value));
                    break;
                    
                case "setTail":
                    list.setTail(new Node(operation.value));
                    break;
                    
                case "insertBefore":
                    let node = new Node(operation.nodeValue);
                    let nodeToInsert = new Node(operation.toInsertValue);
                    list.insertBefore(node, nodeToInsert);
                    break;
                    
                case "insertAfter":
                    node = new Node(operation.nodeValue);
                    nodeToInsert = new Node(operation.toInsertValue);
                    list.insertAfter(node, nodeToInsert);
                    break;
                    
                case "insertAtPosition":
                    list.insertAtPosition(operation.position, new Node(operation.value));
                    break;
                    
                case "removeValue":
                    list.removeNodesWithValue(operation.value);
                    break;
                    
                case "remove":
                    const nodeToRemove = new Node(operation.value);
                    list.remove(nodeToRemove);
                    break;
                    
                case "containsValue":
                    result = list.containsNodeWithValue(operation.value);
                    break;
            }
            
            const currentArray = linkedListToArray(list);
            const connectionsValid = verifyListConnections(list);
            
            if (operation.type === "containsValue") {
                const passed = result === operation.expected && connectionsValid;
                console.log(`Expected contains value ${operation.value}: ${operation.expected}`);
                console.log(`Actual contains value ${operation.value}: ${result}`);
                console.log(`Connections valid: ${connectionsValid ? 'Yes ✅' : 'No ❌'}`);
                console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
                if (!passed) allTestsPassed = false;
            } else {
                const passed = JSON.stringify(currentArray) === JSON.stringify(operation.expected) && connectionsValid;
                console.log(`Expected: ${JSON.stringify(operation.expected)}`);
                console.log(`Actual: ${JSON.stringify(currentArray)}`);
                console.log(`Connections valid: ${connectionsValid ? 'Yes ✅' : 'No ❌'}`);
                console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
                if (!passed) allTestsPassed = false;
            }
        });
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
