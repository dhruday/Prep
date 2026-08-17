# Jenkins Pipelines — Declarative Syntax
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Jenkins = the enterprise CI/CD server**: open-source, self-hosted, the dominant CI/CD platform in large enterprises (SAP, Oracle, banks, telecoms); deployed on-premise or in a VPC; configures via `Jenkinsfile` checked into your repository (Pipeline as Code)
- **Declarative syntax** (modern, recommended): `pipeline { agent { ... } stages { stage('Name') { steps { ... } } } }` — structured, readable, with built-in constructs for agents, environment, credentials, and parallel stages
- **Scripted syntax** (older): `node { ... }` — Groovy code with full programmatic control; more flexible, harder to read, no validation; only use when declarative is insufficient
- **Key sections**: `agent` (where to run — any, specific node, Docker container), `environment` (env vars, credentials resolved by Jenkins), `stages/stage/steps` (the pipeline stages), `post` (always/success/failure hooks), `parallel` (run stages concurrently)
- **Shared Libraries**: reusable Groovy code stored in a separate Git repository; import common pipeline logic and call it from Jenkinsfiles across dozens of repositories — DRY principle at the CI level; `@Library('my-library') _`
- **Credentials plugin**: `withCredentials` or `credentials()` in `environment` block — Jenkins secret store keeps credentials out of the Jenkinsfile; `credentialsId` references the stored secret by ID; never hardcode passwords in Jenkinsfile
- ✅ **Hruday has direct production experience**: "I've worked with Jenkins pipelines at SAP — writing Jenkinsfiles, building shared library steps, using the Blue Ocean UI for visualisation, and debugging pipeline failures"

---

## 1. One-Line Definition
Jenkins is a self-hosted automation server where CI/CD pipelines are defined as code in a `Jenkinsfile` — checked into the repository, version-controlled, and executed by Jenkins when triggered by SCM events, webhooks, or schedules — the dominant enterprise CI/CD platform with thousands of plugins for every integration scenario.

---

## 2. The Problem It Solves

In large enterprises with strict security and compliance requirements, hosted CI/CD services like GitHub Actions can't always be used: code may be classified, builds may require network access to internal services, compliance may require all build infrastructure to remain within the corporate network perimeter, or the organisation standardised on Jenkins before alternatives existed.

Jenkins solves the enterprise CI/CD problem: it runs on your infrastructure, within your VPC, with access to your internal systems. It connects to private artifact repositories (Nexus, Artifactory), internal Kubernetes clusters, corporate LDAP for authentication, and internal test environments — none of which are accessible from GitHub's hosted runners.

Pipeline as Code (`Jenkinsfile`) solved Jenkins's original problem: pipelines were configured through the Jenkins UI (brittle, not version-controlled, hard to reproduce). A `Jenkinsfile` in the repository ties the pipeline definition to the codebase — branches, PRs, and tags each have their own pipeline configuration. Changes to the pipeline go through code review alongside application code changes.

---

## 3. How It Works Internally

### Declarative vs Scripted

```
Declarative Pipeline (modern — use this):
─────────────────────────────────────────
pipeline {
  agent any
  stages {
    stage('Test') {
      steps {
        sh './gradlew test'
      }
    }
  }
}

  Schema-enforced structure — syntax errors caught before execution
  Built-in constructs: agent, environment, when, post, parallel, input
  Restart from stage capability (re-run just the failed stage)
  Better Blue Ocean UI visualisation

Scripted Pipeline (older — avoid unless you need programmatic control):
──────────────────────────────────────────────────────────────────────
node {
  stage('Test') {
    sh './gradlew test'
  }
}

  Full Groovy code — if/for/try/catch available directly
  No schema validation — syntax errors appear at runtime
  When to use: when declarative's constraints are too limiting (dynamic stage names, complex parallelism)
```

### Jenkins Distributed Build Architecture

```
Jenkins Master (Controller):
  - Stores configuration, job definitions, build history
  - Orchestrates job scheduling and agent assignment
  - Serves the web UI and REST API
  - Does NOT run builds directly (in production setups)

Agents (Workers):
  - Connected to the master via JNLP or SSH
  - Actually run the pipeline steps
  - Different agents can have different labels: "docker", "linux", "windows", "gpu"
  - Dynamic agents: Jenkins spins up a Kubernetes pod to run the pipeline, then destroys it
    → Kubernetes plugin: `agent { kubernetes { ... } }` 

Pipeline flow:
  Developer pushes to git
    → Webhook fires to Jenkins master
    → Master picks up trigger, reads Jenkinsfile from repo
    → Master allocates an agent (based on agent directive)
    → Agent clones the repo, runs stages sequentially
    → Build artifacts and results reported back to master
    → Master stores results, notifies Slack/email
```

---

## 4. The Code

### Wrong Way — Classic Freestyle Jobs and Hardcoded Secrets
```groovy
// ❌ WRONG — Scripted pipeline with hardcoded credentials
node {
  stage('Checkout') {
    checkout scm
  }
  
  stage('Build and Test') {
    // No separate lint stage — everything lumped together
    sh 'mvn clean package'
  }
  
  stage('Deploy') {
    // ❌ Credentials hardcoded in Jenkinsfile — committed to git
    sh """
      docker login -u admin -p SuperSecretPassword123 registry.company.com
      docker build -t registry.company.com/payment-service:latest .
      docker push registry.company.com/payment-service:latest
      kubectl --server=https://k8s.internal --token=abc123token set image deployment/payment-service...
    """
  }
}
```

> **Why this is a security and reliability problem:** Credentials hardcoded in a Jenkinsfile are in version control — every engineer with repository access sees the password. Change the password and you must update every Jenkinsfile that references it. Using `latest` Docker tags makes rollbacks untraceable. One monolithic job with no stage isolation means a test failure still proceeds to attempt a Docker build, wasting minutes. No `post` hooks means build failures are silent unless you poll the Jenkins UI.

### Right Way — Declarative Jenkins Pipeline
```groovy
// Jenkinsfile — placed at the root of the repository
// Jenkins uses this file automatically when Multibranch Pipeline job is configured

@Library('sap-jenkins-library@main') _    // Import shared library from a separate git repo
// Gives access to: slackNotify(), dockerBuild(), kubeDeployment(), etc.

pipeline {
    
    // AGENT — where do the stages run?
    agent {
        // Option 1: Kubernetes agent — spins up a pod for this pipeline, destroys after
        kubernetes {
            defaultContainer 'build'
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: build
      image: eclipse-temurin:17-jdk          # Java build container
      command: ['sleep', 'infinity']
    - name: docker
      image: docker:24-dind                   # Docker-in-Docker for docker build/push
      securityContext:
        privileged: true
    - name: kubectl
      image: bitnami/kubectl:latest           # kubectl for deployment
      command: ['sleep', 'infinity']
"""
        }
        // Option 2: Any available agent
        // agent any
    }
    
    // ENVIRONMENT — available to all stages
    environment {
        // Jenkins Credentials plugin: fetches the credential from Jenkins secret store
        // Never stored in Jenkinsfile — only the credentialsId is here
        DOCKER_CREDENTIALS = credentials('ecr-registry-credentials')   // Username/password
        KUBECONFIG_CREDENTIALS = credentials('eks-kubeconfig')          // Secret file
        
        // Pipeline variables
        APP_NAME = 'payment-service'
        ECR_REGISTRY = '123456789.dkr.ecr.ap-south-1.amazonaws.com'
        IMAGE_TAG = "${env.GIT_COMMIT.take(8)}"    // Short git SHA as image tag
        ECR_IMAGE = "${ECR_REGISTRY}/${APP_NAME}:${IMAGE_TAG}"
        
        DOCKER_HOST = 'tcp://localhost:2375'       // Connect to docker-in-docker
    }
    
    // OPTIONS — pipeline-level configuration
    options {
        timeout(time: 30, unit: 'MINUTES')         // Fail if pipeline takes > 30 min
        buildDiscarder(logRotator(numToKeepStr: '20'))  // Keep last 20 builds
        disableConcurrentBuilds()                  // Don't run multiple builds for same branch simultaneously
        timestamps()                               // Prefix all log lines with timestamp
    }
    
    stages {
        
        // STAGE 1: LINT
        stage('Code Quality') {
            steps {
                container('build') {                // Run in the 'build' container
                    sh '''
                        chmod +x gradlew
                        ./gradlew checkstyleMain checkstyleTest spotbugsMain --no-daemon
                    '''
                }
            }
            post {
                failure {
                    // Publish checkstyle results as Jenkins report
                    recordIssues(tools: [checkStyle(pattern: 'build/reports/checkstyle/*.xml')])
                }
            }
        }
        
        // STAGE 2: TEST
        stage('Test') {
            steps {
                container('build') {
                    sh './gradlew test integrationTest --no-daemon'
                }
            }
            post {
                always {
                    // Publish JUnit test results — visible in Jenkins UI
                    junit 'build/test-results/**/*.xml'
                    
                    // Publish coverage report
                    publishCoverage adapters: [jacocoAdapter('build/reports/jacoco/**/*.xml')],
                                   sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                }
            }
        }
        
        // STAGE 3 + 4: BUILD + DOCKERIZE
        // Run in parallel to save time (independent operations)
        stage('Build & Package') {
            // 'when' — skip this stage on feature branches (only build on main/release branches)
            when {
                anyOf {
                    branch 'main'
                    branch 'release/*'
                }
            }
            
            parallel {
                stage('Gradle Build') {
                    steps {
                        container('build') {
                            sh './gradlew build -x test --no-daemon'    // Tests already ran
                        }
                    }
                }
                
                stage('Security Scan') {
                    // Dependency vulnerability scan runs while Gradle builds
                    steps {
                        container('build') {
                            sh './gradlew dependencyCheckAnalyze --no-daemon'
                        }
                    }
                    post {
                        always {
                            dependencyCheckPublisher pattern: 'build/reports/dependency-check-report.xml'
                        }
                    }
                }
            }
        }
        
        // STAGE 5: DOCKER BUILD + PUSH
        stage('Docker Build & Push') {
            when {
                anyOf { branch 'main'; branch 'release/*' }
            }
            steps {
                container('docker') {
                    sh """
                        # Build Docker image with git SHA as tag
                        docker build \
                            --build-arg APP_VERSION=${IMAGE_TAG} \
                            -t ${ECR_IMAGE} \
                            -t ${ECR_REGISTRY}/${APP_NAME}:latest \
                            .
                        
                        # Push to ECR (credentials from Jenkins secret store)
                        echo ${DOCKER_CREDENTIALS_PSW} | docker login \
                            --username ${DOCKER_CREDENTIALS_USR} \
                            --password-stdin ${ECR_REGISTRY}
                        
                        docker push ${ECR_IMAGE}
                        docker push ${ECR_REGISTRY}/${APP_NAME}:latest
                    """
                }
            }
        }
        
        // STAGE 6: DEPLOY TO DEV (automatic)
        stage('Deploy → Dev') {
            when {
                branch 'main'
            }
            steps {
                container('kubectl') {
                    withCredentials([file(credentialsId: 'eks-kubeconfig-dev', variable: 'KUBECONFIG_FILE')]) {
                        sh """
                            export KUBECONFIG=${KUBECONFIG_FILE}
                            kubectl set image deployment/${APP_NAME} \
                                ${APP_NAME}=${ECR_IMAGE} \
                                -n payment-dev
                            kubectl rollout status deployment/${APP_NAME} \
                                -n payment-dev \
                                --timeout=5m
                        """
                    }
                }
            }
        }
        
        // STAGE 7: DEPLOY TO STAGING (manual approval)
        stage('Deploy → Staging') {
            when {
                branch 'main'
            }
            steps {
                // 'input' pauses the pipeline and waits for human approval in Jenkins UI
                input(
                    message: "Approve deployment of ${IMAGE_TAG} to Staging?",
                    ok: 'Deploy to Staging',
                    submitter: 'senior-engineers,tech-leads',  // Only these users can approve
                    parameters: [
                        text(name: 'CHANGE_DESCRIPTION', defaultValue: '', description: 'Optional: describe the change')
                    ]
                )
                
                container('kubectl') {
                    withCredentials([file(credentialsId: 'eks-kubeconfig-staging', variable: 'KUBECONFIG_FILE')]) {
                        sh """
                            export KUBECONFIG=${KUBECONFIG_FILE}
                            kubectl set image deployment/${APP_NAME} \
                                ${APP_NAME}=${ECR_IMAGE} \
                                -n payment-staging
                            kubectl rollout status deployment/${APP_NAME} \
                                -n payment-staging \
                                --timeout=5m
                        """
                    }
                }
            }
        }
    }
    
    // POST — runs after all stages complete (always, on success, on failure, on unstable)
    post {
        always {
            // Clean workspace to free disk space on the agent
            cleanWs()
        }
        success {
            // Notify Slack on successful deployment — using shared library step
            slackNotify(
                channel: '#deployments',
                color: 'good',
                message: "✅ ${APP_NAME}:${IMAGE_TAG} deployed to dev. <${env.BUILD_URL}|Build #${env.BUILD_NUMBER}>"
            )
        }
        failure {
            slackNotify(
                channel: '#alerts',
                color: 'danger',
                message: "❌ Pipeline FAILED: ${APP_NAME} - <${env.BUILD_URL}|Build #${env.BUILD_NUMBER}>"
            )
        }
    }
}
```

```groovy
// Shared Library — vars/slackNotify.groovy (in a separate repository: jenkins-shared-library)
// Called as: slackNotify(channel: '#deployments', color: 'good', message: 'deployed')

def call(Map config) {
    String channel = config.get('channel', '#ci-cd')
    String color = config.get('color', 'good')
    String message = config.message
    
    slackSend(
        channel: channel,
        color: color,
        message: "[${env.JOB_NAME}] ${message}",
        teamDomain: 'sap-internal',
        tokenCredentialId: 'slack-bot-token'
    )
}
```

```groovy
// Shared Library — vars/kubeDeployment.groovy
// Called as: kubeDeployment(credentialsId: 'eks-kubeconfig-dev', namespace: 'payment-dev', ...)

def call(Map config) {
    withCredentials([file(credentialsId: config.credentialsId, variable: 'KUBECONFIG_FILE')]) {
        container('kubectl') {
            sh """
                export KUBECONFIG=${KUBECONFIG_FILE}
                kubectl set image deployment/${config.appName} \
                    ${config.appName}=${config.image} \
                    -n ${config.namespace}
                kubectl rollout status deployment/${config.appName} \
                    -n ${config.namespace} \
                    --timeout=${config.get('timeout', '5m')}
            """
        }
    }
}
```

> **Key decisions here:**
> - Kubernetes agents (`agent { kubernetes { ... } }`) — each pipeline run spins up a fresh pod in Kubernetes, runs the stages, then the pod is deleted; this is cleaner than having static build agents that accumulate state and require maintenance; the Kubernetes plugin manages the pod lifecycle
> - `credentials('ecr-registry-credentials')` in the environment block — credentials never appear in Jenkinsfile text; they're injected as `DOCKER_CREDENTIALS_USR` and `DOCKER_CREDENTIALS_PSW` environment variables from the Jenkins secret store, masked in build logs
> - `input()` for manual approvals — unlike GitHub Actions Environments, Jenkins `input()` is in the pipeline code itself; you specify which users/groups can approve with `submitter:` — this is the RBAC for deployment approvals; `parameters` allows the approver to add a change description that becomes part of the build log

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a Jenkinsfile and why is it better than configuring Jenkins jobs through the UI?"

**Hruday's answer:**
> A Jenkinsfile is the definition of a CI/CD pipeline stored as code in your repository alongside the application code. It uses Jenkins declarative or scripted syntax — Groovy-based DSL.
>
> Before Jenkinsfiles (the classic Jenkins way), you configured pipelines through the Jenkins UI — clicking dropdowns to add build steps, configure parameters, set up triggers. This configuration lives in Jenkins's internal database, not in version control.
>
> The problems with UI configuration: first, it's not reproducible — if the Jenkins server is lost, the pipeline configuration is gone; there's no history of what changed. Second, you can't review pipeline changes in a PR alongside the code changes that require them — a developer changes the code and separately changes the Jenkins job UI, but these two changes are disconnected. Third, it doesn't work with Multibranch pipelines — you'd need to manually create a new Jenkins job for every feature branch.
>
> With a Jenkinsfile, the pipeline travels with the code: every branch has its own `Jenkinsfile` version, PR reviews include pipeline changes, git provides the full history of pipeline evolution, and a new Jenkins server can discover and run all jobs by scanning the repository. This is "Pipeline as Code" — the same principles Git brought to application code, applied to the CI/CD process.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do Jenkins shared libraries work and when would you use them?"

**Hruday's answer:**
> Jenkins shared libraries are reusable Groovy code stored in a separate git repository and loaded into Jenkinsfiles with `@Library('library-name@version') _`. They let you extract common pipeline logic that would otherwise be duplicated across dozens of Jenkinsfiles.
>
> The structure of a shared library: `vars/` contains global pipeline steps (functions callable directly in the Jenkinsfile), `src/` contains Groovy classes for more complex logic, and `resources/` holds static files.
>
> A practical example from SAP: we had 12 Spring Boot microservices, all with nearly identical Jenkinsfiles — same Docker build logic, same ECR push logic, same Kubernetes deployment logic. If we needed to update the ECR authentication approach (for example, switching to OIDC), we'd need to update 12 Jenkinsfiles. With a shared library, we extract `vars/dockerBuildAndPush.groovy` and `vars/kubeDeployment.groovy`. Each Jenkinsfile calls these steps: `dockerBuildAndPush(image: 'payment-service', tag: env.GIT_COMMIT)`. Updating the authentication logic in one place (the shared library) applies to all 12 services on the next pipeline run.
>
> When to use: teams with more than 3-4 services using the same pipeline patterns. When the boilerplate in each Jenkinsfile exceeds 30-40 lines of repeated logic. When compliance or security requirements mandate standardised pipeline steps that all teams must use identically.

---

### Q3 — Trade-Off
**Interviewer asks:** "What are the trade-offs of Jenkins versus GitHub Actions?"

**Hruday's answer:**
> Jenkins is self-hosted — you own the infrastructure and maintenance burden: upgrading Jenkins, managing plugins, provisioning and maintaining build agents, ensuring high availability of the Jenkins server itself. GitHub Actions offloads all of this to GitHub. This operational overhead is real — at SAP, a dedicated DevOps team managed the Jenkins infrastructure, including security patching, plugin updates (Jenkins has hundreds of plugins with independent release cycles), and agent capacity planning.
>
> Jenkins's advantages: it runs inside your network, with access to internal services not reachable from GitHub's runners. This matters for companies with strict network policies, private artifact repositories (Nexus/Artifactory behind a firewall), or compliance requirements that code must never leave the corporate network. Jenkins also has a massive plugin ecosystem (1,800+ plugins) for every integration scenario, built over 15 years.
>
> GitHub Actions's advantages: zero infrastructure overhead, native GitHub integration (branch protection rules, PR checks, environment protection policies), OIDC-based cloud auth is first-class, the marketplace has modern actions, and the development experience (writing YAML, seeing results in the PR) is smoother.
>
> My recommendation: if you're on GitHub and there's no strong reason to self-host, GitHub Actions is the better default now. Jenkins remains the right choice for enterprises with strict network compliance, large existing Jenkins investments, or complex custom pipelines that leverage years of shared library investment. At SAP, Jenkins was the established standard — migrating to GitHub Actions would be a multi-year effort.

---

### Q4 — Scenario
**Interviewer asks:** "A Jenkins pipeline is stuck waiting for an input approval step and nobody approved it. How do you handle this and how do you prevent it from being a problem?"

**Hruday's answer:**
> An `input()` step pauses the pipeline indefinitely by default until someone approves or rejects it. The build occupies a workspace and (in traditional agent-based Jenkins) ties up an agent slot. In Kubernetes-based Jenkins setups this is less of a problem since the agent pod is still running but not doing work.
>
> The immediate fix for a stuck input: use the Jenkins UI to locate the paused build and either proceed or abort it. You can also call the Jenkins REST API: `POST <jenkins-url>/job/<job-name>/<build-number>/input/<input-id>/proceedEmpty` to automatically approve, or `POST .../abort` to cancel.
>
> Prevention strategies: First, add a timeout to the input step with the `timeout()` wrapper: `timeout(time: 24, unit: 'HOURS') { input 'Approve?' }` — auto-abort after 24 hours so the pipeline doesn't run indefinitely. Second, send a notification to the approvers (Slack, email) when the input is waiting — the `input()` step can be preceded by a notification step. Third, configure `submitter:` to ensure the right people are notified and empowered to approve. Fourth, track unapproved input steps in monitoring — a Prometheus alert on "pending Jenkins inputs older than 4 hours" tells the ops team to investigate.
>
> The deeper issue is organizational: if planned releases are regularly blocked by missing approvals, the approval step might be configured for the wrong audience, or the process isn't integrated into the team's workflow. I'd review whether the approvals are delivering value or just adding friction.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Jenkins is outdated" | "Nobody uses Jenkins anymore — GitHub Actions is the standard" | Jenkins has the largest enterprise market share in CI/CD; SAP, Oracle, banks, and telecoms run hundreds of thousands of Jenkins pipelines; GitHub Actions dominates startups and cloud-native companies; the correct answer is "it depends on the company's constraints" |
| "Declarative and scripted are interchangeable" | "Both do the same thing" | Declarative is schema-validated, restartable from a failed stage, better visualised in Blue Ocean, and has built-in constructs for most common patterns; scripted is raw Groovy with no validation; declarative should be the default, scripted only for advanced cases |
| "Credentials in environment block are exposed" | "The credentials() binding exposes the password in logs" | Jenkins's credentials binding masks the credential value in all logs — it appears as `****`; but `echo $DOCKER_CREDENTIALS_PSW` would try to print it and Jenkins would mask it; you should still use `withCredentials` for fine-grained scoping rather than environment block for all-steps availability |
| "input() is for production safety" | "Just use input() and you're safe for production" | `input()` without `timeout()` and without `submitter:` scoping is an uncontrolled approval gate — anyone can approve and it can block indefinitely; always set timeout and submitter for production gates |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I owned the Jenkins pipeline for our payment processing service — a Multibranch Pipeline Jenkinsfile that ran on Kubernetes dynamic agents provisioned by the Jenkins Kubernetes plugin. One major improvement I made was extracting our Docker build and ECR push logic into the SAP internal Jenkins shared library. Before the extraction, our Jenkinsfile had 80 lines of Docker boilerplate. After, it was `dockerBuildAndPush(imageName: 'payment-service', gitSha: env.GIT_COMMIT)` — 1 line. When SAP standardised on a new ECR registry in a new AWS account (requiring updated ECR login logic), updating the shared library applied the change to all 8 services that used it in a single PR.
>
> I also integrated Blue Ocean for public-facing pipeline visualisation — the stage view made it easy for product managers and non-technical stakeholders to understand the pipeline status during releases without navigating the classic Jenkins UI. The parallel stages for security scanning and Gradle build showed visually that we weren't sacrificing speed for security coverage."

---

## 8. Scale Evolution

**1,000 users/day →** Simple declarative Jenkinsfile with sequential stages, GitHub/GitLab webhook trigger, single static build agent. Blue Ocean for visualisation. Single environment (dev) deployment.

**100,000 users/day →** Kubernetes dynamic agents for every pipeline run. Shared library for common steps across multiple services. Parallel stages for build + scan. Multi-environment deployment with `input()` approval gates. Dedicated Jenkins master with HA setup.

**10 million users/day →** Jenkins at scale is complex: 300+ services, thousands of builds per day, Jenkins operator on Kubernetes for HA controller management, ephemeral Kubernetes pods for every build, Elasticsearch/CloudWatch for centralized build logs, automated pipeline performance monitoring (SLA: all pipelines complete in <15 min), shared library versioned and released separately from service code.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Mix of Jenkins (legacy enterprise pipelines) and GitHub Actions (newer services); senior engineers expected to work with both; Jenkins shared libraries important for maintaining consistency | Know both syntaxes; explain shared libraries; compare with GitHub Actions |
| Swiggy / Meesho | Some teams on Jenkins, some on GitHub Actions; migration knowledge valuable; Jenkins on Kubernetes with dynamic agents is the modern pattern | Know Kubernetes agent configuration; parallel stages; `when` conditions |
| Adobe / Microsoft | Large enterprise Jenkins installations; Microsoft also uses Azure DevOps internally (similar concepts to Jenkins); senior engineers expected to maintain and improve CI/CD infrastructure | Shared libraries at scale; Jenkins security hardening; plugin management |
| SAP Labs | SAP uses Jenkins as the primary CI/CD standard for many products; the Jenkins shared library is an internal platform component; direct experience with SAP's Kubernetes-based Jenkins setup | Direct Jenkinsfile authorship; shared library extraction; Kubernetes agents |

---

## 10. Related Topics — What to Study Next

- **Topic 191 — GitHub Actions** — the modern alternative to Jenkins; comparing the two (trigger model, job parallelism, credentials management, approval gates) is a common interview discussion; understand both and when each is appropriate
- **Topic 190 — Pipeline Stages: Lint → Test → Build → Dockerize → Deploy** — the Jenkins pipeline implements this stage design; the conceptual pipeline design is the "what"; the Jenkinsfile is the "how"; both topics together give complete coverage of the CI/CD question space
- **Topic 193 — Blue-Green Deployment** and **Topic 194 — Canary Releases** — when the Jenkins deploy stage becomes more than `kubectl set image`, these topics cover the orchestration of advanced deployment strategies from a pipeline; Jenkins pipelines can call Helm, Argo Rollouts CLI, or kubectl with custom rollout scripts

---

*Part 11 · Jenkins Pipelines — Declarative Syntax · Full Stack Interview Guide · Hruday D · 2026*
