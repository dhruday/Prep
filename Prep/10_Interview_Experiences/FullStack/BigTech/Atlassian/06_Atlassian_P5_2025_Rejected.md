# Atlassian — Senior SDE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Senior Software Engineer |
| **Level** | P5 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Values Screen + 2 Technical + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Technical — Implement a Workflow Automation Engine
**Duration:** 60 minutes

### Problem
Design a workflow engine (like Jira Automation) that:
- Defines workflows as DAG of tasks
- Tasks can have dependencies (must complete before dependents start)
- Support parallel execution of independent tasks
- Handle task failures with retry and fallback

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;

public class WorkflowEngine {

    enum TaskStatus { PENDING, RUNNING, COMPLETED, FAILED, SKIPPED }

    static class Task {
        final String id;
        final String name;
        final Callable<Object> action;
        final List<String> dependencies;
        int maxRetries;
        Callable<Object> fallback;

        volatile TaskStatus status = TaskStatus.PENDING;
        volatile Object result;
        volatile Exception error;
        int attemptCount = 0;

        Task(String id, String name, Callable<Object> action) {
            this.id = id;
            this.name = name;
            this.action = action;
            this.dependencies = new ArrayList<>();
            this.maxRetries = 0;
        }
    }

    static class Workflow {
        final String id;
        final Map<String, Task> tasks = new LinkedHashMap<>();
        private final Map<String, Set<String>> dependencyGraph = new HashMap<>();
        private final Map<String, Set<String>> dependentsGraph = new HashMap<>();

        Workflow(String id) {
            this.id = id;
        }

        Workflow addTask(Task task) {
            tasks.put(task.id, task);
            dependencyGraph.put(task.id, new HashSet<>());
            dependentsGraph.put(task.id, new HashSet<>());
            return this;
        }

        Workflow addDependency(String taskId, String dependsOn) {
            tasks.get(taskId).dependencies.add(dependsOn);
            dependencyGraph.get(taskId).add(dependsOn);
            dependentsGraph.computeIfAbsent(dependsOn, k -> new HashSet<>()).add(taskId);
            return this;
        }

        /**
         * Validate DAG — check for cycles using DFS.
         */
        boolean validate() {
            Set<String> visited = new HashSet<>();
            Set<String> inStack = new HashSet<>();

            for (String taskId : tasks.keySet()) {
                if (hasCycle(taskId, visited, inStack)) {
                    return false;
                }
            }
            return true;
        }

        private boolean hasCycle(String node, Set<String> visited, Set<String> inStack) {
            if (inStack.contains(node)) return true;
            if (visited.contains(node)) return false;

            visited.add(node);
            inStack.add(node);

            for (String dep : dependencyGraph.getOrDefault(node, Collections.emptySet())) {
                if (hasCycle(dep, visited, inStack)) return true;
            }

            inStack.remove(node);
            return false;
        }

        /**
         * Get tasks with no pending dependencies (ready to run).
         */
        List<Task> getReadyTasks() {
            List<Task> ready = new ArrayList<>();
            for (Task task : tasks.values()) {
                if (task.status != TaskStatus.PENDING) continue;

                boolean allDepsCompleted = task.dependencies.stream()
                    .allMatch(depId -> {
                        Task dep = tasks.get(depId);
                        return dep.status == TaskStatus.COMPLETED
                            || dep.status == TaskStatus.SKIPPED;
                    });

                if (allDepsCompleted) {
                    ready.add(task);
                }
            }
            return ready;
        }

        boolean isComplete() {
            return tasks.values().stream().allMatch(t ->
                t.status == TaskStatus.COMPLETED
                || t.status == TaskStatus.FAILED
                || t.status == TaskStatus.SKIPPED);
        }
    }

    private final ExecutorService executor;
    private final List<Consumer<Task>> taskListeners = new ArrayList<>();

    public WorkflowEngine(int parallelism) {
        this.executor = Executors.newFixedThreadPool(parallelism);
    }

    public void onTaskComplete(Consumer<Task> listener) {
        taskListeners.add(listener);
    }

    /**
     * Execute a workflow. Independent tasks run in parallel.
     * Returns a map of taskId -> result.
     */
    public Map<String, Object> execute(Workflow workflow) throws InterruptedException {
        if (!workflow.validate()) {
            throw new IllegalArgumentException("Workflow has circular dependencies");
        }

        Map<String, Object> results = new ConcurrentHashMap<>();

        while (!workflow.isComplete()) {
            List<Task> readyTasks = workflow.getReadyTasks();

            if (readyTasks.isEmpty() && !workflow.isComplete()) {
                // Deadlock — some tasks have failed dependencies
                markUnreachable(workflow);
                break;
            }

            // Submit all ready tasks in parallel
            CountDownLatch latch = new CountDownLatch(readyTasks.size());

            for (Task task : readyTasks) {
                task.status = TaskStatus.RUNNING;
                executor.submit(() -> {
                    try {
                        executeTask(task);
                        if (task.status == TaskStatus.COMPLETED) {
                            results.put(task.id, task.result);
                        }
                    } finally {
                        latch.countDown();
                    }
                });
            }

            latch.await(); // Wait for this batch to complete
        }

        return results;
    }

    private void executeTask(Task task) {
        while (task.attemptCount <= task.maxRetries) {
            task.attemptCount++;
            try {
                task.result = task.action.call();
                task.status = TaskStatus.COMPLETED;
                notifyListeners(task);
                return;
            } catch (Exception e) {
                task.error = e;
                System.err.printf("Task '%s' attempt %d failed: %s%n",
                    task.name, task.attemptCount, e.getMessage());

                if (task.attemptCount > task.maxRetries) {
                    // Try fallback
                    if (task.fallback != null) {
                        try {
                            task.result = task.fallback.call();
                            task.status = TaskStatus.COMPLETED;
                            notifyListeners(task);
                            return;
                        } catch (Exception fe) {
                            task.error = fe;
                        }
                    }
                    task.status = TaskStatus.FAILED;
                    notifyListeners(task);
                }
            }
        }
    }

    private void markUnreachable(Workflow workflow) {
        for (Task task : workflow.tasks.values()) {
            if (task.status == TaskStatus.PENDING) {
                boolean hasFailedDep = task.dependencies.stream()
                    .anyMatch(depId -> workflow.tasks.get(depId).status == TaskStatus.FAILED);
                if (hasFailedDep) {
                    task.status = TaskStatus.SKIPPED;
                    notifyListeners(task);
                }
            }
        }
    }

    private void notifyListeners(Task task) {
        for (Consumer<Task> listener : taskListeners) {
            try {
                listener.accept(task);
            } catch (Exception e) {
                // Listener errors should not affect workflow
            }
        }
    }

    public void shutdown() {
        executor.shutdown();
    }

    // === Builder helpers ===

    public static Task task(String id, String name, Callable<Object> action) {
        return new Task(id, name, action);
    }

    public static void main(String[] args) throws Exception {
        WorkflowEngine engine = new WorkflowEngine(4);

        engine.onTaskComplete(task ->
            System.out.printf("  [%s] %s: %s -> %s%n",
                task.status, task.id, task.name, task.result));

        // Define workflow
        Workflow wf = new Workflow("deploy_pipeline");

        Task build = task("build", "Build Application", () -> {
            Thread.sleep(500);
            return "build-v1.0.jar";
        });

        Task test = task("test", "Run Tests", () -> {
            Thread.sleep(300);
            return "42/42 passed";
        });

        Task lint = task("lint", "Code Lint", () -> {
            Thread.sleep(200);
            return "no warnings";
        });

        Task dockerize = task("docker", "Build Docker Image", () -> {
            Thread.sleep(400);
            return "image:latest";
        });

        Task deploy = task("deploy", "Deploy to K8s", () -> {
            Thread.sleep(600);
            return "deployed to prod";
        });
        deploy.maxRetries = 2;

        Task notify = task("notify", "Send Notification", () -> {
            return "slack notification sent";
        });

        wf.addTask(build).addTask(test).addTask(lint)
          .addTask(dockerize).addTask(deploy).addTask(notify);

        // Dependencies: test & lint depend on build, docker depends on test & lint
        // deploy depends on docker, notify depends on deploy
        wf.addDependency("test", "build");
        wf.addDependency("lint", "build");
        wf.addDependency("docker", "test");
        wf.addDependency("docker", "lint");
        wf.addDependency("deploy", "docker");
        wf.addDependency("notify", "deploy");

        System.out.println("Executing workflow: " + wf.id);
        long start = System.currentTimeMillis();
        Map<String, Object> results = engine.execute(wf);
        long elapsed = System.currentTimeMillis() - start;

        System.out.println("\nResults: " + results);
        System.out.println("Total time: " + elapsed + "ms");
        // test & lint run in parallel after build, so total < sum of all tasks

        engine.shutdown();
    }
}
```

## 🎯 Key Takeaways
- Atlassian interviews test **workflow/pipeline** design — directly maps to Jira, Bitbucket Pipelines
- DAG validation (cycle detection via DFS) is mandatory before execution
- Independent tasks should run in parallel (test & lint after build)
- Retry + fallback pattern for resilient task execution
- `CountDownLatch` coordinates batch completion before discovering next ready tasks
- Mark downstream tasks as SKIPPED when dependencies fail

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Hard | DAG, Topological Execution, Concurrency |
| Technical 2 | Medium | API Design, OOP |
| Values | Medium | Atlassian Values (Open, Play, Build with Heart) |
