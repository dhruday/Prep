/*
Redux-Like Store

Problem Statement:
Implement a minimal predictable state container with getState, dispatch, and subscribe.
Subscribers should receive updates after a reducer calculates the next state.

Solution:
Keep state private, derive new state through a reducer, and take a listener snapshot
before notification. The reducer must stay pure; side effects belong outside dispatch.

Complexity: O(1) get/dispatch excluding reducer | O(number of listeners) notification
*/

function createStore(reducer, initialState) {
    let state = initialState;
    const listeners = new Set();
    return {
        getState: () => state,
        dispatch(action) {
            state = reducer(state, action);
            for (const listener of [...listeners]) listener();
            return action;
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

function runTests() {
    const store = createStore((state, action) => action.type === 'increment' ? { count: state.count + 1 } : state, { count: 0 });
    let observed = 0;
    const unsubscribe = store.subscribe(() => { observed = store.getState().count; });
    store.dispatch({ type: 'increment' }); unsubscribe(); store.dispatch({ type: 'increment' });
    console.log(`Overall Result: ${store.getState().count === 2 && observed === 1 ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { createStore };
