/*
Throttle

Problem Statement:
Return a function that runs at most once every delay milliseconds. Calls made while
waiting should run once more at the end with the latest arguments.

Solution:
Run the first call immediately, store the latest suppressed call, and schedule one
trailing invocation. This is the common leading-and-trailing UI policy.

Complexity: O(1) work per call | O(1) extra space
*/

function throttle(callback, delay) {
    let lastRun = -Infinity;
    let timerId = null;
    let trailingArgs = null;
    let trailingThis = null;

    function run(now, receiver, args) {
        lastRun = now;
        callback.apply(receiver, args);
    }

    return function throttled(...args) {
        const now = Date.now();
        const remaining = delay - (now - lastRun);
        if (remaining <= 0) {
            if (timerId !== null) clearTimeout(timerId);
            timerId = null;
            trailingArgs = null;
            run(now, this, args);
            return;
        }

        trailingArgs = args;
        trailingThis = this;
        if (timerId === null) {
            timerId = setTimeout(() => {
                timerId = null;
                run(Date.now(), trailingThis, trailingArgs);
                trailingArgs = null;
            }, remaining);
        }
    };
}

async function runTests() {
    const values = [];
    const record = throttle((value) => values.push(value), 15);
    record(1); record(2); record(3);
    await new Promise((resolve) => setTimeout(resolve, 30));
    console.log(`Overall Result: ${JSON.stringify(values) === JSON.stringify([1, 3]) ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { throttle };
