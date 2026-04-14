# SAP Labs — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 / T2 |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 3 (OA + Technical + Managerial)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Implement a Cron Expression Parser and Scheduler**
   - Parse cron expressions: `* * * * *` (minute, hour, day, month, weekday)
   - Compute the next N execution times from a given start time
   - Support special characters: `*`, `/`, `-`, `,`

### 💡 Interview-Ready Answer

```java
import java.time.*;
import java.util.*;

public class CronParser {

    static class CronExpression {
        Set<Integer> minutes;  // 0-59
        Set<Integer> hours;    // 0-23
        Set<Integer> days;     // 1-31
        Set<Integer> months;   // 1-12
        Set<Integer> weekdays; // 0-6 (0=Sunday)

        CronExpression(String expression) {
            String[] parts = expression.trim().split("\\s+");
            if (parts.length != 5) {
                throw new IllegalArgumentException("Invalid cron: must have 5 fields");
            }

            minutes = parseField(parts[0], 0, 59);
            hours = parseField(parts[1], 0, 23);
            days = parseField(parts[2], 1, 31);
            months = parseField(parts[3], 1, 12);
            weekdays = parseField(parts[4], 0, 6);
        }

        /**
         * Parse a single cron field.
         * Supports: * (all), N (exact), N-M (range), * /N (every N), N,M (list)
         */
        private Set<Integer> parseField(String field, int min, int max) {
            Set<Integer> values = new TreeSet<>();

            for (String part : field.split(",")) {
                part = part.trim();

                if (part.equals("*")) {
                    for (int i = min; i <= max; i++) values.add(i);
                } else if (part.contains("/")) {
                    // Step: */5 or 1-30/5
                    String[] stepParts = part.split("/");
                    int step = Integer.parseInt(stepParts[1]);
                    int start = min;
                    int end = max;

                    if (!stepParts[0].equals("*")) {
                        if (stepParts[0].contains("-")) {
                            String[] range = stepParts[0].split("-");
                            start = Integer.parseInt(range[0]);
                            end = Integer.parseInt(range[1]);
                        } else {
                            start = Integer.parseInt(stepParts[0]);
                        }
                    }

                    for (int i = start; i <= end; i += step) {
                        values.add(i);
                    }
                } else if (part.contains("-")) {
                    // Range: 1-5
                    String[] range = part.split("-");
                    int start = Integer.parseInt(range[0]);
                    int end = Integer.parseInt(range[1]);
                    for (int i = start; i <= end; i++) {
                        values.add(i);
                    }
                } else {
                    // Exact value
                    values.add(Integer.parseInt(part));
                }
            }

            // Validate
            for (int v : values) {
                if (v < min || v > max) {
                    throw new IllegalArgumentException(
                        String.format("Value %d out of range [%d, %d]", v, min, max));
                }
            }

            return values;
        }

        boolean matches(LocalDateTime dt) {
            return minutes.contains(dt.getMinute())
                && hours.contains(dt.getHour())
                && days.contains(dt.getDayOfMonth())
                && months.contains(dt.getMonthValue())
                && weekdays.contains(dt.getDayOfWeek().getValue() % 7); // Monday=1..Sunday=7 → 1..0
        }
    }

    /**
     * Find the next N execution times after a given start time.
     * Approach: Iterate minute by minute and check if cron matches.
     * Optimization: Skip to next valid month/day/hour when possible.
     */
    public static List<LocalDateTime> nextExecutions(CronExpression cron,
                                                      LocalDateTime start,
                                                      int count) {
        List<LocalDateTime> results = new ArrayList<>();
        LocalDateTime current = start.plusMinutes(1).withSecond(0).withNano(0);

        // Max 2 years of search to prevent infinite loop
        LocalDateTime maxTime = start.plusYears(2);

        while (results.size() < count && current.isBefore(maxTime)) {
            // Skip to next valid month
            if (!cron.months.contains(current.getMonthValue())) {
                Integer nextMonth = nextInSet(cron.months, current.getMonthValue());
                if (nextMonth == null) {
                    // Wrap to next year
                    current = current.plusYears(1).withMonth(cron.months.iterator().next())
                        .withDayOfMonth(1).withHour(0).withMinute(0);
                } else {
                    current = current.withMonth(nextMonth).withDayOfMonth(1)
                        .withHour(0).withMinute(0);
                }
                continue;
            }

            // Skip to next valid day
            if (!cron.days.contains(current.getDayOfMonth()) ||
                !cron.weekdays.contains(current.getDayOfWeek().getValue() % 7)) {
                current = current.plusDays(1).withHour(0).withMinute(0);
                continue;
            }

            // Skip to next valid hour
            if (!cron.hours.contains(current.getHour())) {
                Integer nextHour = nextInSet(cron.hours, current.getHour());
                if (nextHour == null) {
                    current = current.plusDays(1).withHour(
                        cron.hours.iterator().next()).withMinute(0);
                } else {
                    current = current.withHour(nextHour).withMinute(0);
                }
                continue;
            }

            // Check minute
            if (cron.minutes.contains(current.getMinute())) {
                results.add(current);
            }

            current = current.plusMinutes(1);
        }

        return results;
    }

    private static Integer nextInSet(Set<Integer> set, int current) {
        for (int v : set) {
            if (v > current) return v;
        }
        return null;
    }

    public static void main(String[] args) {
        // Every 15 minutes
        CronExpression cron1 = new CronExpression("*/15 * * * *");
        List<LocalDateTime> next = nextExecutions(cron1,
            LocalDateTime.of(2025, 3, 15, 10, 0), 5);
        System.out.println("Every 15 min:");
        next.forEach(t -> System.out.println("  " + t));

        // Weekdays at 9:30 AM
        CronExpression cron2 = new CronExpression("30 9 * * 1-5");
        next = nextExecutions(cron2,
            LocalDateTime.of(2025, 3, 14, 10, 0), 5);
        System.out.println("\nWeekdays at 9:30:");
        next.forEach(t -> System.out.println("  " + t));

        // Every hour on 1st and 15th of month
        CronExpression cron3 = new CronExpression("0 * 1,15 * *");
        next = nextExecutions(cron3,
            LocalDateTime.of(2025, 3, 10, 0, 0), 5);
        System.out.println("\n1st and 15th hourly:");
        next.forEach(t -> System.out.println("  " + t));
    }
}
```

## Round 2: Technical Interview
**Duration:** 60 minutes

### Questions Asked
1. **Design a Task Queue with Priority and Dead Letter Queue**
   - Support: `enqueue(task, priority)`, `dequeue()`, `retry(task)`, `moveToDeadLetter(task)`
   - Max retry count per task

### Result
- Rejected — technical round went well but managerial round found poor alignment with team needs

## 🎯 Key Takeaways
- SAP loves **scheduler/cron** problems — commonly used in enterprise applications
- Cron field parsing must handle all special chars: `*`, `/`, `-`, `,`
- **Skip-forward optimization** is important — don't iterate every minute for sparse schedules
- Always validate field ranges (minute 0-59, hour 0-23, etc.)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium-Hard | Cron Parsing, Date-Time, Set Operations |
| Technical | Medium | Priority Queue, Retry, Dead Letter |
| Managerial | Easy | Behavioral |
