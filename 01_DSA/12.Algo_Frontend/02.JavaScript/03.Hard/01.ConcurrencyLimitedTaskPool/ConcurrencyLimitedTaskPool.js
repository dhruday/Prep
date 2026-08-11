/*
Concurrency-Limited Task Pool

Problem Statement:
Given async functions and a positive concurrency limit, run no more than limit at a
time. Resolve with results in input order; reject immediately when a task rejects.

Solution:
Workers share a next-task index. Each worker repeatedly claims one index, awaits the
task, and stores its result in the reserved result slot.

Complexity: O(n) scheduling work | O(n) result space
*/

async function runWithConcurrency(tasks, limit) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be a positive integer');
    const results = new Array(tasks.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < tasks.length) {
            const index = nextIndex++;
            results[index] = await tasks[index]();
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
    return results;
}

async function runTests() {
    let active = 0;
    let maximumActive = 0;
    const tasks = [30, 10, 20, 5].map((value) => async () => {
        active++; maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, value));
        active--;
        return value;
    });
    const result = await runWithConcurrency(tasks, 2);
    const passed = JSON.stringify(result) === JSON.stringify([30, 10, 20, 5]) && maximumActive === 2;
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { runWithConcurrency };
