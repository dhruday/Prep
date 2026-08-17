/*
Form State Machine

Problem Statement:
Model a form that can be idle, validating, submitting, succeeded, or failed. Invalid
transitions must throw so independent booleans cannot create impossible UI states.

Solution:
Represent state as one tagged value and list its allowed transitions. A React component
can render each state exhaustively and keep error/message data with the current state.

Complexity: O(1) per transition | O(1) space
*/

const allowedTransitions = {
    idle: new Set(['validating', 'submitting']),
    validating: new Set(['idle', 'submitting', 'failed']),
    submitting: new Set(['succeeded', 'failed']),
    succeeded: new Set(['idle']),
    failed: new Set(['idle', 'validating', 'submitting']),
};

function transitionForm(state, nextStatus, details = {}) {
    if (!allowedTransitions[state.status]?.has(nextStatus)) {
        throw new Error(`Cannot transition from ${state.status} to ${nextStatus}`);
    }
    return { status: nextStatus, ...details };
}

function runTests() {
    const validating = transitionForm({ status: 'idle' }, 'validating');
    const succeeded = transitionForm(transitionForm(validating, 'submitting'), 'succeeded', { receiptId: 'r1' });
    let rejected = false;
    try { transitionForm({ status: 'idle' }, 'succeeded'); } catch { rejected = true; }
    console.log(`Overall Result: ${validating.status === 'validating' && succeeded.receiptId === 'r1' && rejected ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { transitionForm };
