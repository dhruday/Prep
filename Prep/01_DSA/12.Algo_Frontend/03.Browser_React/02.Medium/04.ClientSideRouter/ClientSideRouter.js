/*
Client-Side Router Matcher

Problem Statement:
Given route patterns such as /products/:id and a URL path, return the matching route
and decoded path parameters. Prefer the first declared matching route; return null for no match.

Solution:
Split patterns and paths into segments. Static segments must match exactly and
parameter segments capture one decoded path segment.

Complexity: O(routes × segments) time | O(segments) space per attempted route
*/

function matchRoute(routes, path) {
    const pathSegments = path.split('/').filter(Boolean);
    for (const route of routes) {
        const patternSegments = route.path.split('/').filter(Boolean);
        if (patternSegments.length !== pathSegments.length) continue;
        const params = {};
        let matches = true;
        for (let index = 0; index < patternSegments.length; index++) {
            const pattern = patternSegments[index];
            const segment = pathSegments[index];
            if (pattern.startsWith(':')) params[pattern.slice(1)] = decodeURIComponent(segment);
            else if (pattern !== segment) { matches = false; break; }
        }
        if (matches) return { route, params };
    }
    return null;
}

function runTests() {
    const routes = [{ path: '/' }, { path: '/products/:id' }, { path: '/settings/profile' }];
    const product = matchRoute(routes, '/products/hello%20world');
    const passed = product.route.path === '/products/:id' && product.params.id === 'hello world'
        && matchRoute(routes, '/missing') === null;
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { matchRoute };
