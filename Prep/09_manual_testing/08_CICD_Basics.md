# CI/CD & Jenkins for QA Engineers - Interview Question Bank

## Table of Contents
1. [CI/CD Fundamentals](#cicd-fundamentals)
2. [Jenkins Basics](#jenkins-basics)
3. [Jenkins Configuration](#jenkins-configuration)
4. [Jenkins Pipeline](#jenkins-pipeline)
5. [Integration with Testing](#integration-with-testing)
6. [Real Interview Scenarios](#real-interview-scenarios)

---

## CI/CD Fundamentals

### Beginner Questions

#### Q1: What is CI/CD?
**Answer:**

**CI (Continuous Integration):**
Practice of frequently integrating code changes into a shared repository, with automated builds and tests.

**CD (Continuous Delivery):**
Extension of CI where code is automatically prepared for release to production (manual approval for deployment).

**CD (Continuous Deployment):**
Every change that passes tests is automatically deployed to production (no manual approval).

```
Code Commit → Build → Test → [Manual Approval] → Deploy
                              ↑                    ↑
                        Continuous Delivery   Continuous Deployment
```

**Benefits:**
- Early bug detection
- Faster feedback
- Consistent builds
- Reduced manual errors
- Faster time to market

---

#### Q2: What is a CI/CD Pipeline?
**Answer:**

A pipeline is an automated sequence of stages that code goes through from commit to deployment.

**Typical Pipeline Stages:**

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Build  │ → │  Unit   │ → │ Integr. │ → │   UAT   │ → │ Deploy  │
│         │    │  Tests  │    │  Tests  │    │  Tests  │    │  Prod   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

**Stage Details:**

| Stage | Purpose | Typical Time |
|-------|---------|--------------|
| Build | Compile code, create artifacts | 2-10 mins |
| Unit Tests | Test individual components | 5-15 mins |
| Integration Tests | Test component interactions | 10-30 mins |
| Code Analysis | Static analysis, security scans | 5-15 mins |
| Deploy to Test | Deploy to test environment | 5-10 mins |
| Functional Tests | Run automation suite | 15-60 mins |
| Performance Tests | Load/stress testing | 30-60 mins |
| Deploy to Prod | Release to production | 5-15 mins |

---

#### Q3: What is Jenkins?
**Answer:**

Jenkins is an open-source automation server used for CI/CD pipelines.

**Key Features:**
- Extensible with plugins (1800+)
- Pipeline as Code (Jenkinsfile)
- Distributed builds
- Easy configuration
- Integration with tools (Git, Maven, Docker)

**Architecture:**
```
┌─────────────────────┐
│   Jenkins Master    │
│   - Scheduling      │
│   - UI              │
│   - Configuration   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼───┐
│ Agent │    │ Agent │
│ (Node)│    │ (Node)│
└───────┘    └───────┘
```

---

### Intermediate Questions

#### Q4: What are Jenkins jobs?
**Answer:**

A Jenkins job is a task or set of tasks that Jenkins executes.

**Job Types:**

| Type | Description |
|------|-------------|
| Freestyle Project | Simple, configurable via UI |
| Pipeline | Complex workflows (Jenkinsfile) |
| Multibranch Pipeline | Pipelines for multiple branches |
| Folder | Organize jobs |
| Maven Project | For Maven-based projects |

**Job Configuration:**
- Source code management (Git)
- Build triggers
- Build steps
- Post-build actions

---

#### Q5: What are Jenkins build triggers?
**Answer:**

Build triggers define when a job should run.

| Trigger | Description |
|---------|-------------|
| **SCM Polling** | Check for changes periodically |
| **Webhook** | Triggered by Git push |
| **Scheduled (Cron)** | Run at specific times |
| **Build after other projects** | Dependency-based |
| **Manual** | Click "Build Now" |
| **Remote** | Trigger via URL |

**Cron Syntax:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, Sunday=0 or 7)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)

Examples:
H/15 * * * *     # Every 15 minutes
H 2 * * *        # Daily at 2 AM
H 2 * * 1-5      # Weekdays at 2 AM
H 0 1 * *        # Monthly on 1st
```

---

#### Q6: What is a Jenkinsfile?
**Answer:**

A Jenkinsfile defines the pipeline as code, stored with source code.

**Declarative Pipeline:**
```groovy
pipeline {
    agent any
    
    environment {
        APP_NAME = 'my-app'
    }
    
    stages {
        stage('Build') {
            steps {
                sh 'mvn clean compile'
            }
        }
        
        stage('Unit Tests') {
            steps {
                sh 'mvn test'
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                }
            }
        }
        
        stage('Integration Tests') {
            steps {
                sh 'mvn verify -P integration-tests'
            }
        }
        
        stage('Deploy to Test') {
            when {
                branch 'develop'
            }
            steps {
                sh './deploy.sh test'
            }
        }
        
        stage('Deploy to Prod') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
            }
            steps {
                sh './deploy.sh prod'
            }
        }
    }
    
    post {
        success {
            mail to: 'team@example.com',
                 subject: "SUCCESS: ${env.JOB_NAME}",
                 body: "Build succeeded!"
        }
        failure {
            mail to: 'team@example.com',
                 subject: "FAILED: ${env.JOB_NAME}",
                 body: "Build failed!"
        }
    }
}
```

---

#### Q7: What is the difference between Declarative and Scripted Pipeline?
**Answer:**

| Aspect | Declarative | Scripted |
|--------|-------------|----------|
| Syntax | Structured, predefined | Flexible, Groovy code |
| Learning Curve | Easier | Harder |
| Flexibility | Limited | Full Groovy power |
| Error Handling | Built-in | Manual |
| Best For | Standard pipelines | Complex logic |

**Declarative:**
```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'mvn build'
            }
        }
    }
}
```

**Scripted:**
```groovy
node {
    stage('Build') {
        sh 'mvn build'
    }
    
    if (env.BRANCH_NAME == 'main') {
        stage('Deploy') {
            sh './deploy.sh'
        }
    }
}
```

---

#### Q8: What are Jenkins agents/nodes?
**Answer:**

Agents (nodes) are machines where Jenkins runs jobs.

**Types:**
- **Master:** Main Jenkins server (scheduling, UI)
- **Agent:** Worker machines (execute jobs)

**Configuration:**
```groovy
pipeline {
    agent any               // Any available agent
    
    // Or specific agent
    agent {
        label 'linux'       // Agent with label
    }
    
    // Or per stage
    stages {
        stage('Build') {
            agent { label 'maven' }
            steps {
                sh 'mvn build'
            }
        }
        stage('Test Windows') {
            agent { label 'windows' }
            steps {
                bat 'run-tests.bat'
            }
        }
    }
}
```

---

## Integration with Testing

### Q9: How do you integrate Selenium tests with Jenkins?
**Answer:**

**Pipeline for Selenium Tests:**
```groovy
pipeline {
    agent any
    
    tools {
        maven 'Maven 3.8'
        jdk 'JDK 11'
    }
    
    environment {
        BROWSER = 'chrome'
        HEADLESS = 'true'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/org/test-automation.git'
            }
        }
        
        stage('Build') {
            steps {
                sh 'mvn clean compile'
            }
        }
        
        stage('Run Tests') {
            steps {
                sh 'mvn test -Dbrowser=${BROWSER} -Dheadless=${HEADLESS}'
            }
            post {
                always {
                    // Publish test results
                    junit 'target/surefire-reports/*.xml'
                    
                    // Publish HTML report
                    publishHTML([
                        allowMissing: false,
                        reportDir: 'target/extent-reports',
                        reportFiles: 'index.html',
                        reportName: 'Extent Report'
                    ])
                }
            }
        }
    }
    
    post {
        always {
            // Archive artifacts
            archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
            
            // Clean workspace
            cleanWs()
        }
        failure {
            // Send notification on failure
            emailext subject: "Test Failure: ${env.JOB_NAME}",
                     body: "Tests failed. Check ${env.BUILD_URL}",
                     to: 'qa-team@example.com'
        }
    }
}
```

---

#### Q10: How do you run tests in parallel in Jenkins?
**Answer:**

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                sh 'mvn clean compile'
            }
        }
        
        stage('Parallel Tests') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'mvn test -Dgroups=unit'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        sh 'mvn test -Dgroups=integration'
                    }
                }
                stage('API Tests') {
                    agent { label 'api-testing' }
                    steps {
                        sh 'mvn test -Dgroups=api'
                    }
                }
            }
        }
        
        stage('Cross-Browser Tests') {
            parallel {
                stage('Chrome') {
                    steps {
                        sh 'mvn test -Dbrowser=chrome'
                    }
                }
                stage('Firefox') {
                    steps {
                        sh 'mvn test -Dbrowser=firefox'
                    }
                }
                stage('Edge') {
                    steps {
                        sh 'mvn test -Dbrowser=edge'
                    }
                }
            }
        }
    }
}
```

---

#### Q11: How do you handle test reports in Jenkins?
**Answer:**

**JUnit Reports:**
```groovy
post {
    always {
        junit 'target/surefire-reports/*.xml'
    }
}
```

**HTML Reports:**
```groovy
post {
    always {
        publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'target/reports',
            reportFiles: 'report.html',
            reportName: 'Test Report'
        ])
    }
}
```

**Allure Reports:**
```groovy
post {
    always {
        allure includeProperties: false,
               jdk: '',
               results: [[path: 'target/allure-results']]
    }
}
```

**Cucumber Reports:**
```groovy
post {
    always {
        cucumber jsonReportDirectory: 'target/cucumber-reports',
                 fileIncludePattern: '*.json'
    }
}
```

---

#### Q12: How do you manage test environments in CI/CD?
**Answer:**

**Using Environment Variables:**
```groovy
pipeline {
    agent any
    
    environment {
        // Global environment variables
        APP_URL = 'https://test.example.com'
        DB_HOST = 'test-db.example.com'
    }
    
    stages {
        stage('Test on QA') {
            environment {
                ENV = 'qa'
                APP_URL = 'https://qa.example.com'
            }
            steps {
                sh 'mvn test -Denv=${ENV} -Dapp.url=${APP_URL}'
            }
        }
        
        stage('Test on Staging') {
            environment {
                ENV = 'staging'
                APP_URL = 'https://staging.example.com'
            }
            steps {
                sh 'mvn test -Denv=${ENV} -Dapp.url=${APP_URL}'
            }
        }
    }
}
```

**Using Credentials:**
```groovy
pipeline {
    agent any
    
    stages {
        stage('Test') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'test-credentials',
                        usernameVariable: 'USERNAME',
                        passwordVariable: 'PASSWORD'
                    )
                ]) {
                    sh 'mvn test -Duser=${USERNAME} -Dpassword=${PASSWORD}'
                }
            }
        }
    }
}
```

---

### Q13: What are common Jenkins plugins for testing?
**Answer:**

| Plugin | Purpose |
|--------|---------|
| JUnit | Publish JUnit test results |
| HTML Publisher | Publish HTML reports |
| Allure | Allure test reports |
| Cucumber Reports | Cucumber BDD reports |
| TestNG | TestNG results |
| Cobertura | Code coverage |
| JaCoCo | Java code coverage |
| SonarQube | Code quality |
| Email Extension | Notifications |
| Slack Notification | Slack alerts |
| Build Failure Analyzer | Analyze failures |

---

### Q14: How do you handle flaky tests in CI/CD?
**Answer:**

**Strategies:**

1. **Retry Mechanism:**
```groovy
stage('Tests') {
    steps {
        retry(3) {
            sh 'mvn test'
        }
    }
}
```

2. **Test Stability Reports:**
- Track test history
- Identify patterns
- Quarantine flaky tests

3. **TestNG Retry:**
```java
public class RetryAnalyzer implements IRetryAnalyzer {
    private int count = 0;
    private static final int MAX_RETRY = 2;
    
    @Override
    public boolean retry(ITestResult result) {
        if (count < MAX_RETRY) {
            count++;
            return true;
        }
        return false;
    }
}
```

4. **Separate Pipeline:**
```groovy
stage('Stable Tests') {
    steps {
        sh 'mvn test -Dgroups=stable'
    }
}

stage('Flaky Tests') {
    steps {
        // Don't fail build on flaky tests
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
            sh 'mvn test -Dgroups=flaky'
        }
    }
}
```

---

## Jenkins Advanced Concepts

### Q15: What are Jenkins shared libraries?
**Answer:**

Shared libraries allow reusing pipeline code across multiple projects.

**Structure:**
```
(shared-library-repo)
├── vars/
│   ├── runTests.groovy
│   └── notify.groovy
└── src/
    └── org/
        └── utils/
            └── Helper.groovy
```

**vars/runTests.groovy:**
```groovy
def call(Map config) {
    pipeline {
        agent any
        
        stages {
            stage('Run Tests') {
                steps {
                    sh "mvn test -Dbrowser=${config.browser}"
                }
                post {
                    always {
                        junit 'target/surefire-reports/*.xml'
                    }
                }
            }
        }
    }
}
```

**Using in Jenkinsfile:**
```groovy
@Library('my-shared-library') _

runTests(browser: 'chrome')
```

---

### Q16: How do you implement quality gates?
**Answer:**

Quality gates fail builds that don't meet criteria.

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }
        
        stage('Unit Tests') {
            steps {
                sh 'mvn test'
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                }
            }
        }
        
        stage('Code Coverage') {
            steps {
                sh 'mvn jacoco:report'
                jacoco(
                    execPattern: '**/target/*.exec',
                    minimumLineCoverage: '80',
                    minimumBranchCoverage: '70'
                )
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh 'mvn sonar:sonar'
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }
}
```

---

## Real Interview Scenarios

### Scenario 1: Describe a CI/CD pipeline you have set up
**Answer:**

"In my previous project, I set up a Jenkins pipeline for our test automation framework:

**Pipeline Stages:**
1. **Checkout:** Pull code from Git
2. **Build:** Compile test code with Maven
3. **Unit Tests:** Run unit tests (5 minutes)
4. **Deploy to Test:** Deploy application to test environment
5. **Smoke Tests:** Quick sanity checks (2 minutes)
6. **Regression Tests:** Full regression suite - parallel execution (30 minutes)
7. **Report Generation:** Allure reports, JUnit results
8. **Notification:** Email/Slack on failure

**Key Features:**
- Triggered on every PR
- Parallel test execution reduced time by 60%
- Automatic retry for flaky tests
- Environment-specific configurations
- Screenshot capture on failure"

---

### Scenario 2: Build failed due to test failures. How do you investigate?
**Answer:**

1. **Check Jenkins Console Output:**
   - Look for error messages
   - Identify which tests failed

2. **Review Test Reports:**
   - JUnit/TestNG reports
   - Stack traces
   - Screenshots if available

3. **Check Environment:**
   - Was the environment stable?
   - Any deployments during test?
   - Database state

4. **Compare with Previous Runs:**
   - Is this a new failure?
   - Any recent code changes?
   - Same failure on other branches?

5. **Reproduce Locally:**
   - Run failing tests locally
   - Check for environment differences

6. **Check for Flakiness:**
   - Re-run the build
   - Check test history

---

### Scenario 3: How would you set up nightly regression tests?
**Answer:**

```groovy
pipeline {
    agent { label 'linux-test' }
    
    triggers {
        cron('H 2 * * *')  // Every night at 2 AM
    }
    
    options {
        timeout(time: 2, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '30'))
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'docker-compose up -d'
                sleep(time: 30, unit: 'SECONDS')
            }
        }
        
        stage('Regression Tests') {
            steps {
                sh 'mvn test -Dgroups=regression -Dparallel=methods -DthreadCount=4'
            }
        }
    }
    
    post {
        always {
            junit 'target/surefire-reports/*.xml'
            
            publishHTML([
                reportDir: 'target/extent-reports',
                reportFiles: 'report.html',
                reportName: 'Regression Report'
            ])
            
            sh 'docker-compose down'
        }
        
        failure {
            emailext(
                subject: "Nightly Regression Failed: ${env.BUILD_NUMBER}",
                body: """
                    Regression tests failed!
                    
                    Build: ${env.BUILD_URL}
                    Report: ${env.BUILD_URL}Regression_Report/
                    
                    Please investigate immediately.
                """,
                to: 'qa-team@example.com'
            )
        }
        
        success {
            emailext(
                subject: "Nightly Regression Passed: ${env.BUILD_NUMBER}",
                body: "All regression tests passed. Report: ${env.BUILD_URL}Regression_Report/",
                to: 'qa-team@example.com'
            )
        }
    }
}
```

---

## Common Traps & How to Answer

### Trap 1: "What's the difference between CI and CD?"
**Smart Answer:**
"CI focuses on integrating code changes frequently with automated builds and tests. CD extends this - Continuous Delivery prepares code for release with manual approval, while Continuous Deployment automatically deploys every passing change. Most organizations I've worked with use Continuous Delivery with manual gates for production."

### Trap 2: "Why is your build so slow?"
**Smart Answer:**
"Build optimization is ongoing. Common strategies I've used:
1. Parallel test execution
2. Selective testing based on changed files
3. Caching dependencies
4. Distributed builds across agents
5. Running different test suites at different stages
6. Using faster machines for critical path"

### Trap 3: "How do you ensure test reliability in CI?"
**Smart Answer:**
"I implement several strategies:
1. Retry mechanisms for transient failures
2. Proper waits instead of sleep
3. Isolated test environments
4. Test data management
5. Monitoring and tracking flaky tests
6. Regular maintenance of test suite
7. Running tests multiple times before merging"

---

## Jenkins Quick Reference

### Common Pipeline Syntax:

```groovy
// Checkout
git branch: 'main', url: 'https://github.com/repo.git'

// Execute shell
sh 'command'
sh '''
    line1
    line2
'''

// Execute batch (Windows)
bat 'command'

// Environment variables
env.MY_VAR = 'value'
echo "${env.MY_VAR}"

// Credentials
withCredentials([string(credentialsId: 'my-secret', variable: 'SECRET')]) {
    sh 'echo $SECRET'
}

// Conditional
when {
    branch 'main'
    environment name: 'ENV', value: 'prod'
}

// Input
input message: 'Proceed?'

// Timeout
timeout(time: 30, unit: 'MINUTES') {
    // steps
}

// Retry
retry(3) {
    // steps
}

// Archive
archiveArtifacts artifacts: '**/*.jar'

// Stash/Unstash
stash name: 'build', includes: 'target/**'
unstash 'build'
```

---

Continue to [09_Real_Scenario_Questions.md](09_Real_Scenario_Questions.md) for comprehensive scenario-based interview questions.
