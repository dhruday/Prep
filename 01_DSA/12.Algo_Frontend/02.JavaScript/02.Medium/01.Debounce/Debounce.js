/*
Debounce

Problem Statement:
Return a debounced version of a function. It should run after delay milliseconds
have passed since the most recent call. Expose cancel() to discard pending work.

Solution:
One timer represents the pending invocation. Every call replaces it; the final call
owns the arguments and receiver used when the timer fires.

Complexity: O(1) work per call | O(1) extra space
*/

function debounce(callback, delay) {
    let timerId = null;
    function debounced(...args) {
        if (timerId !== null) clearTimeout(timerId);
        timerId = setTimeout(() => {
            timerId = null;
            callback.apply(this, args);
        }, delay);
    }
    debounced.cancel = () => {
        if (timerId !== null) clearTimeout(timerId);
        timerId = null;
    };
    return debounced;
}

async function runTests() {
    const values = [];
    const save = debounce((value) => values.push(value), 10);
    save(1); save(2); save(3);
    await new Promise((resolve) => setTimeout(resolve, 25));
    save(4); save.cancel();
    await new Promise((resolve) => setTimeout(resolve, 15));
    console.log(`Overall Result: ${JSON.stringify(values) === JSON.stringify([3]) ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { debounce };
