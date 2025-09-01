class Node {
    value = null;
    next = null;
    constructor(value, next) {
        this.value = value;
        this.next = next;
    }
}
class LinkedList {
    constructor() {
    }
    insert(num) {
        const tempNode = new Node(num);
        if(this.head == null) {
            this.head = tempNode;
            return;
        }
        let item = this.head;
        while (item.next != null) {
            item = item.next;
        }
        item.next = tempNode
    }
    print() {
        let temp = this.head;
        console.log(this.head.value);
        while (temp.next != undefined) {
            temp = temp.next;
            console.log(temp.value);
        }
    }
    remove() {

    }
}
const ll = new LinkedList();
ll.insert(1);
ll.insert(3);
ll.insert(5);
ll.insert(7);
ll.print();