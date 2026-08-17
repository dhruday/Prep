/*
Virtual List Range

Problem Statement:
For a fixed-height virtual list, return the inclusive item range that should render
for a scroll position. Include overscan items to avoid visible blank space while scrolling.

Solution:
Convert viewport pixels to item indices, clamp them to the collection, and expand by
overscan. A UI renders only that slice inside a container with total list height.

Complexity: O(1) time | O(1) space
*/

function getVirtualRange({ itemCount, itemHeight, viewportHeight, scrollTop, overscan = 2 }) {
    if (itemCount <= 0 || itemHeight <= 0 || viewportHeight <= 0) return { start: 0, end: -1 };
    const firstVisible = Math.floor(Math.max(0, scrollTop) / itemHeight);
    const lastVisible = Math.min(itemCount - 1, Math.floor((scrollTop + viewportHeight - 1) / itemHeight));
    return {
        start: Math.max(0, firstVisible - overscan),
        end: Math.min(itemCount - 1, lastVisible + overscan),
    };
}

function runTests() {
    const middle = getVirtualRange({ itemCount: 100, itemHeight: 20, viewportHeight: 100, scrollTop: 200, overscan: 2 });
    const empty = getVirtualRange({ itemCount: 0, itemHeight: 20, viewportHeight: 100, scrollTop: 0 });
    const passed = JSON.stringify(middle) === JSON.stringify({ start: 8, end: 16 })
        && JSON.stringify(empty) === JSON.stringify({ start: 0, end: -1 });
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { getVirtualRange };
