/*
Promise.all

Problem Statement:
Implement Promise.all behavior for an iterable of values or promises. Preserve input
order, resolve an empty input immediately, and reject as soon as one input rejects.

Solution:
Convert the iterable to an array, reserve result slots by index, and count completed
promises. Promise.resolve also accepts ordinary values and thenables.

Complexity: O(n) bookkeeping | O(n) result space
*/

function promiseAll(values) {
    const inputs = Array.from(values);
    if (inputs.length === 0) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
        const results = new Array(inputs.length);
        let completed = 0;
        inputs.forEach((value, index) => {
            Promise.resolve(value).then((result) => {
                results[index] = result;
                completed++;
                if (completed === inputs.length) resolve(results);
            }, reject);
        });
    });
}

async function runTests() {
    const ordered = await promiseAll([Promise.resolve('first'), 2, new Promise((resolve) => setTimeout(() => resolve('third'), 5))]);
    const empty = await promiseAll([]);
    let rejected = false;
    try { await promiseAll([Promise.resolve(1), Promise.reject(new Error('failed'))]); } catch { rejected = true; }
    const passed = JSON.stringify(ordered) === JSON.stringify(['first', 2, 'third']) && empty.length === 0 && rejected;
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { promiseAll };
