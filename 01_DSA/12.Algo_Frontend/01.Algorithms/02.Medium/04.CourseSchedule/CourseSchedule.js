/*
Course Schedule

Problem Statement:
Given course IDs from 0 to courseCount - 1 and prerequisite pairs [course, prerequisite],
return whether every course can be completed.

Solution:
Use Kahn's topological-sort algorithm. Repeatedly take courses with no remaining
prerequisites. A cycle exists exactly when not every course can be processed.

Complexity: O(V + E) time | O(V + E) space
*/

function canFinishCourses(courseCount, prerequisites) {
    const dependents = Array.from({ length: courseCount }, () => []);
    const prerequisiteCount = new Array(courseCount).fill(0);

    for (const [course, prerequisite] of prerequisites) {
        dependents[prerequisite].push(course);
        prerequisiteCount[course]++;
    }

    const queue = [];
    for (let course = 0; course < courseCount; course++) {
        if (prerequisiteCount[course] === 0) queue.push(course);
    }

    let completed = 0;
    for (let index = 0; index < queue.length; index++) {
        const course = queue[index];
        completed++;
        for (const dependent of dependents[course]) {
            prerequisiteCount[dependent]--;
            if (prerequisiteCount[dependent] === 0) queue.push(dependent);
        }
    }

    return completed === courseCount;
}

function runTests() {
    const passed = canFinishCourses(2, [[1, 0]])
        && !canFinishCourses(2, [[1, 0], [0, 1]])
        && canFinishCourses(3, []);
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { canFinishCourses };
