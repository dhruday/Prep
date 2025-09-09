/*
Calendar Matching

Problem Statement:
Imagine that you want to schedule a meeting of a certain duration with a coworker. You both have busy
schedules, and you want to find a time that works for both of you.

Given both of your schedules (as arrays of meetings, where each meeting is represented by a start and
end time), your respective daily bounds (i.e., the earliest and latest times you're available each day),
and the duration of the meeting you want to schedule, write a function that returns a list of all the
time slots during which you could schedule the meeting.

A meeting consists of a start time and an end time, represented by integers in 24-hour format (e.g., 8:30
is represented as 830, and 21:00 is represented as 2100).

The output should be all the time slots during which you could schedule the meeting, represented by arrays
of start and end times.

Note: expect the input arrays to be sorted.

Sample Input:
calendar1 = [['9:00', '10:30'], ['12:00', '13:00'], ['16:00', '18:00']]
dailyBounds1 = ['9:00', '20:00']
calendar2 = [['10:00', '11:30'], ['12:30', '14:30'], ['14:30', '15:00'], ['16:00', '17:00']]
dailyBounds2 = ['10:00', '18:30']
meetingDuration = 30

Sample Output:
[['11:30', '12:00'], ['15:00', '16:00'], ['18:00', '18:30']]

Test Cases:
1. calendar1 = [['9:00', '10:30'], ['12:00', '13:00'], ['16:00', '18:00']]
   dailyBounds1 = ['9:00', '20:00']
   calendar2 = [['10:00', '11:30'], ['12:30', '14:30'], ['14:30', '15:00'], ['16:00', '17:00']]
   dailyBounds2 = ['10:00', '18:30']
   meetingDuration = 30
   Expected Output: [['11:30', '12:00'], ['15:00', '16:00'], ['18:00', '18:30']]

2. calendar1 = [['9:00', '10:30']]
   dailyBounds1 = ['9:00', '20:00']
   calendar2 = [['10:00', '11:30']]
   dailyBounds2 = ['10:00', '18:30']
   meetingDuration = 30
   Expected Output: [['11:30', '18:30']]

3. calendar1 = []
   dailyBounds1 = ['9:00', '20:00']
   calendar2 = []
   dailyBounds2 = ['10:00', '18:30']
   meetingDuration = 30
   Expected Output: [['10:00', '18:30']]

4. calendar1 = [['9:00', '20:00']]
   dailyBounds1 = ['9:00', '20:00']
   calendar2 = []
   dailyBounds2 = ['10:00', '18:30']
   meetingDuration = 30
   Expected Output: []

5. calendar1 = [['9:00', '10:00']]
   dailyBounds1 = ['9:00', '20:00']
   calendar2 = [['10:30', '11:30']]
   dailyBounds2 = ['10:00', '18:30']
   meetingDuration = 15
   Expected Output: [['10:00', '10:30'], ['11:30', '18:30']]

Solution Approaches:
1. Merge and Process: O(c1 + c2) time | O(c1 + c2) space
   - Convert times to minutes
   - Merge calendars
   - Find available slots
   - Filter by meeting duration
*/

function calendarMatching(
    calendar1,
    dailyBounds1,
    calendar2,
    dailyBounds2,
    meetingDuration
) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        calendar1: [['9:00', '10:30'], ['12:00', '13:00'], ['16:00', '18:00']],
        dailyBounds1: ['9:00', '20:00'],
        calendar2: [['10:00', '11:30'], ['12:30', '14:30'], ['14:30', '15:00'], ['16:00', '17:00']],
        dailyBounds2: ['10:00', '18:30'],
        meetingDuration: 30,
        expected: [['11:30', '12:00'], ['15:00', '16:00'], ['18:00', '18:30']]
    },
    {
        calendar1: [['9:00', '10:30']],
        dailyBounds1: ['9:00', '20:00'],
        calendar2: [['10:00', '11:30']],
        dailyBounds2: ['10:00', '18:30'],
        meetingDuration: 30,
        expected: [['11:30', '18:30']]
    },
    {
        calendar1: [],
        dailyBounds1: ['9:00', '20:00'],
        calendar2: [],
        dailyBounds2: ['10:00', '18:30'],
        meetingDuration: 30,
        expected: [['10:00', '18:30']]
    },
    {
        calendar1: [['9:00', '20:00']],
        dailyBounds1: ['9:00', '20:00'],
        calendar2: [],
        dailyBounds2: ['10:00', '18:30'],
        meetingDuration: 30,
        expected: []
    },
    {
        calendar1: [['9:00', '10:00']],
        dailyBounds1: ['9:00', '20:00'],
        calendar2: [['10:30', '11:30']],
        dailyBounds2: ['10:00', '18:30'],
        meetingDuration: 15,
        expected: [['10:00', '10:30'], ['11:30', '18:30']]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = calendarMatching(
            JSON.parse(JSON.stringify(testCase.calendar1)),
            [...testCase.dailyBounds1],
            JSON.parse(JSON.stringify(testCase.calendar2)),
            [...testCase.dailyBounds2],
            testCase.meetingDuration
        );
        console.log(`Test Case ${index + 1}:`);
        console.log(`Calendar 1: [${testCase.calendar1.map(meeting => `[${meeting}]`)}]`);
        console.log(`Daily Bounds 1: [${testCase.dailyBounds1}]`);
        console.log(`Calendar 2: [${testCase.calendar2.map(meeting => `[${meeting}]`)}]`);
        console.log(`Daily Bounds 2: [${testCase.dailyBounds2}]`);
        console.log(`Meeting Duration: ${testCase.meetingDuration}`);
        console.log(`Your Output: [${result.map(slot => `[${slot}]`)}]`);
        console.log(`Expected Output: [${testCase.expected.map(slot => `[${slot}]`)}]`);
        const passed = areCalendarsEqual(result, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare time slots
function areCalendarsEqual(cal1, cal2) {
    if (cal1.length !== cal2.length) return false;
    for (let i = 0; i < cal1.length; i++) {
        if (cal1[i][0] !== cal2[i][0] || cal1[i][1] !== cal2[i][1]) {
            return false;
        }
    }
    return true;
}

// Run the tests
runTests();
