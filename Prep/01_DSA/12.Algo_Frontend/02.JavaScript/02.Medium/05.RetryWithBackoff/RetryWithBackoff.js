/*
Retry With Backoff

Problem Statement:
Retry an async operation up to maxAttempts times. Wait exponentially longer between
retryable failures and never retry a non-retryable failure.

Solution:
Attempt sequentially so only one request is active. The caller provides the retry
predicate; production code should add jitter to prevent synchronized retries.

Complexity: O(attempts) time excluding waits | O(1) extra space
*/

async function retry(operation, { maxAttempts, baseDelay = 0, shouldRetry = () => true }) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation(attempt);
        } catch (error) {
            lastError = error;
            if (attempt === maxAttempts || !shouldRetry(error)) throw error;
            await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** (attempt - 1)));
        }
    }
    throw lastError;
}

async function runTests() {
    let attempts = 0;
    const result = await retry(async () => {
        attempts++;
        if (attempts < 3) throw new Error('temporary');
        return 'ok';
    }, { maxAttempts: 3 });
    let stopped = false;
    try { await retry(async () => { throw new Error('bad request'); }, { maxAttempts: 3, shouldRetry: () => false }); } catch { stopped = true; }
    console.log(`Overall Result: ${result === 'ok' && attempts === 3 && stopped ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { retry };
