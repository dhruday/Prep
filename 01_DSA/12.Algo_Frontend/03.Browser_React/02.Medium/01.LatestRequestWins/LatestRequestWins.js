/*
Latest Request Wins

Problem Statement:
Create a request coordinator for a search UI. Only the newest request may update the
UI; slower earlier requests must be marked stale. The caller may use the result to
avoid rendering outdated data after a new query or component unmount.

Solution:
Increment a monotonically increasing request ID before starting each request. A
response is current only if its ID still equals the most recently started ID.

Complexity: O(1) coordination per request | O(1) coordinator state
*/

class LatestRequestCoordinator {
    constructor() {
        this.latestRequestId = 0;
    }

    async run(request) {
        const requestId = ++this.latestRequestId;
        try {
            const value = await request();
            return { stale: requestId !== this.latestRequestId, value };
        } catch (error) {
            return { stale: requestId !== this.latestRequestId, error };
        }
    }
}

async function runTests() {
    const coordinator = new LatestRequestCoordinator();
    const slow = coordinator.run(() => new Promise((resolve) => setTimeout(() => resolve('old'), 20)));
    const fast = coordinator.run(() => new Promise((resolve) => setTimeout(() => resolve('new'), 5)));
    const [oldResult, newResult] = await Promise.all([slow, fast]);
    const passed = oldResult.stale && oldResult.value === 'old' && !newResult.stale && newResult.value === 'new';
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { LatestRequestCoordinator };
