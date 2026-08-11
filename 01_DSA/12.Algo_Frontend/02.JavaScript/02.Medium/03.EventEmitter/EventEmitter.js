/*
Event Emitter

Problem Statement:
Implement on(event, listener), once(event, listener), emit(event, ...args), and
unsubscribe. Listeners must run in registration order without being skipped when a
listener removes itself.

Solution:
Map each event to a Set. Emit over a snapshot so mutations during a listener do not
change the current delivery. on and once return unsubscribe functions.

Complexity: O(1) average subscribe/unsubscribe | O(number of listeners) emit
*/

class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    on(event, listener) {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event).add(listener);
        return () => this.listeners.get(event)?.delete(listener);
    }

    once(event, listener) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            listener(...args);
        });
        return unsubscribe;
    }

    emit(event, ...args) {
        for (const listener of [...(this.listeners.get(event) ?? [])]) listener(...args);
    }
}

function runTests() {
    const emitter = new EventEmitter();
    const values = [];
    const unsubscribe = emitter.on('change', (value) => values.push(`on:${value}`));
    emitter.once('change', (value) => values.push(`once:${value}`));
    emitter.emit('change', 1); unsubscribe(); emitter.emit('change', 2);
    const expected = ['on:1', 'once:1'];
    console.log(`Overall Result: ${JSON.stringify(values) === JSON.stringify(expected) ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { EventEmitter };
