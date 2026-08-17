# GitHub Actions — Workflows, Jobs, Matrix Builds
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **GitHub Actions = CI/CD built into GitHub**: trigger → workflows → jobs → steps; everything defined in YAML files under `.github/workflows/`; no separate CI server to provision or maintain
- **Trigger types**: `on: push` (run on every commit), `on: pull_request` (run when PR is opened/updated), `on: workflow_dispatch` (manual trigger), `on: schedule` (cron-based), `on: release` (when a GitHub Release is published)
- **Jobs run in parallel by default**: use `needs: [lint, test]` to make a job depend on others; this creates a DAG of job execution; a deploy job `needs: build` to run after build completes
- **Steps execute sequentially within a job**: `uses: actions/checkout@v4` (checkout code), `uses: actions/setup-java@v4` (install JDK), `run: ./gradlew test` (shell command)
- **Matrix builds**: run the same job with multiple variable combinations — test against Java 17 AND Java 21, against Ubuntu AND Windows, against multiple Spring Boot versions; `strategy.matrix` creates a job copy per combination
- **Secrets and environments**: secrets stored in GitHub Settings, accessed as `${{ secrets.SECRET_NAME }}`; environment-specific secrets + manual approval gates via GitHub Environments
- **OIDC for cloud auth**: trust GitHub's OIDC token issuer to assume an AWS IAM role without storing long-lived credentials in GitHub Secrets — the recommended production pattern
- ✅ **Hruday has direct production experience**: "I've built and maintained GitHub Actions pipelines at SAP for Spring Boot services deployed to AKS — writing workflows, debugging failures, optimising build times"

---

## 1. One-Line Definition
GitHub Actions is a CI/CD automation platform built into GitHub that defines workflows in YAML files — triggered by git events, running jobs in parallel or sequentially on ephemeral runners — automating everything from code quality checks and tests to Docker builds, container registry pushes, and Kubernetes deployments.

---

## 2. The Problem It Solves

Before hosted CI/CD like GitHub Actions, teams needed to provision, maintain, and update a separate CI server (Jenkins, TeamCity, CircleCI) — additional infrastructure to manage, separate from where the code lives. Connecting the CI server to the repository required webhooks and credentials. Scaling runners required provisioning more servers. The CI configuration used a different system with a different access model than the codebase.

GitHub Actions collapses this: the pipeline lives alongside the code in the same repository, in the same version control system, subject to the same code review processes. Triggering on push is automatic — no webhook setup. Hosted runners (ubuntu-latest) scale automatically — no runner infrastructure to manage. Repository permissions and branch protection rules integrate directly with the pipeline — only pipelines from trusted branches can deploy to production.

For individual developers and small teams, GitHub Actions eliminated the need for a dedicated DevOps engineer just to maintain CI infrastructure. For enterprises, it reduced the maintenance overhead of CI servers significantly while providing a consistent pipeline definition format across all repositories.

---

## 3. How It Works Internally

### Workflow Structure

```
Repository
└── .github/
    └── workflows/
        ├── ci-cd.yml             ← Main pipeline (push to main)
        ├── pr-checks.yml         ← Lint and test only (on pull_request)
        ├── scheduled-scan.yml    ← Nightly security scan (on schedule)
        └── manual-deploy.yml     ← Manual deployment trigger (workflow_dispatch)

Workflow anatomy:
  name: (display name in GitHub UI)
  on: (trigger conditions)
  env: (environment variables available to all jobs)
  jobs:
    job-name:
      runs-on: (runner type: ubuntu-latest, windows-latest, macos-latest, self-hosted)
      needs: (other jobs that must succeed first)
      if: (condition to run this job)
      environment: (GitHub Environment — approval gate)
      strategy:
        matrix: (matrix build dimensions)
      steps:
        - uses: (reusable action from marketplace or local)
          with: (action inputs)
        - name: (step display name)
          run: (shell command)
          env: (step-level env vars)
```

### Job Execution Model

```
Jobs run on fresh ephemeral virtual machines (or containers):
  - GitHub starts a new VM for each job
  - The VM is destroyed after the job completes
  - No state persists between jobs (use artifacts to pass files)
  
Parallelism model:
  Jobs in the same workflow run CONCURRENTLY unless linked with 'needs'
  
  Example workflow — visual dependency graph:
  
  push event
      │
      ├──── lint ──────────────────────────────────────────────────┐
      │                                                            │
      └──── test-unit ──────────────────────────────────────────── build
                                                                     │
                                                        (runs after BOTH lint AND test complete)
      
  yaml that creates this:
    jobs:
      lint:                         # Starts immediately on trigger
        runs-on: ubuntu-latest
        
      test-unit:                    # Starts immediately on trigger (parallel with lint)
        runs-on: ubuntu-latest
        
      build:
        runs-on: ubuntu-latest
        needs: [lint, test-unit]    # Waits for BOTH to succeed
```

### Matrix Builds

```
Problem: test against multiple Java versions to ensure forward compatibility

Without matrix:
  test-java17:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
      - run: ./gradlew test
  
  test-java21:                  ← Duplicate of test-java17 — violation of DRY
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
      - run: ./gradlew test

With matrix (one job definition, N executions):
  test:
    strategy:
      matrix:
        java-version: ['17', '21']
    steps:
      - uses: actions/setup-java@v4
        with:
          java-version: ${{ matrix.java-version }}  ← Variable from matrix
      - run: ./gradlew test
  
  Result: GitHub runs TWO jobs — test (17) and test (21) — in parallel
  If either fails, the matrix job fails
  
Multi-dimensional matrix:
  matrix:
    java-version: ['17', '21']
    os: ['ubuntu-latest', 'windows-latest']
  
  Result: 4 jobs — [17, ubuntu], [17, windows], [21, ubuntu], [21, windows]
  Each combination runs concurrently
```

---

## 4. The Code

### Wrong Way — No Caching, Stored Credentials, No Parallelism
```yaml
# ❌ WRONG — naive first-attempt workflow
name: Build

on: [push]

jobs:
  everything:           # All stages in one job — no parallelism, can't fail fast
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      
      # No Gradle cache — downloads all dependencies from scratch every run (2-3 min waste)
      
      - run: ./gradlew checkstyle test build docker
      
      # Hard-coded AWS credentials in secrets — long-lived, privilege-escalation risk
      - name: Push to ECR
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}        # Long-lived static key
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }} # Exposed in memory
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin ...
          docker tag payment-service:latest $ECR_REGISTRY/payment-service:latest    # 'latest' = untraceable
          docker push $ECR_REGISTRY/payment-service:latest
```

> **Why this is slow and insecure:**
> - One large sequential job means a checkstyle failure still runs the full build before reporting the error — wasting 3+ minutes per failure on the slowest stages
> - No Gradle dependency cache means the pipeline downloads all Maven dependencies from scratch on every run — costs 2-3 minutes and network egress
> - Stored AWS access keys (`AWS_ACCESS_KEY_ID`) are long-lived credentials that, if leaked (via logs, through accidentally exposed `env` output, or GitHub secret exposure), provide persistent AWS access; OIDC doesn't store credentials at all
> - Tagging with `latest` makes rollback and incident diagnosis impossible

### Right Way — Proper GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD — payment-service

on:
  push:
    branches: [main]
    paths:
      - 'services/payment-service/**'   # Only trigger when payment-service files change
      - '.github/workflows/ci-cd.yml'   # Also trigger when the workflow itself changes
  pull_request:
    branches: [main]
    paths:
      - 'services/payment-service/**'

# Concurrency: if a new push arrives while the pipeline runs, cancel the old one
# (don't queue up multiple deployments for intermediate commits)
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  JAVA_VERSION: '17'
  AWS_REGION: ap-south-1
  ECR_REGISTRY: 123456789.dkr.ecr.ap-south-1.amazonaws.com
  ECR_REPOSITORY: payment-service
  EKS_CLUSTER_DEV: payment-dev-cluster

jobs:
  # ─────── LINT (fast, runs first) ────────────────────────────────
  lint:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: gradle                     # Built-in Gradle dependency caching
      
      - name: Checkstyle
        run: ./gradlew checkstyleMain checkstyleTest --no-daemon
      
      - name: SpotBugs
        run: ./gradlew spotbugsMain --no-daemon

  # ─────── TEST ───────────────────────────────────────────────────
  test:
    name: Tests (Java ${{ matrix.java }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java: ['17', '21']             # Matrix: test on both Java versions
      fail-fast: false                   # Don't cancel Java 21 if Java 17 fails — see both results
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-java@v4
        with:
          java-version: ${{ matrix.java }}
          distribution: 'temurin'
          cache: gradle
      
      - name: Run tests
        run: ./gradlew test integrationTest --no-daemon
        env:
          SPRING_PROFILES_ACTIVE: test
      
      - name: Verify coverage (>= 80%)
        run: ./gradlew jacocoTestCoverageVerification --no-daemon
      
      - name: Publish Test Results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Tests (Java ${{ matrix.java }})
          path: build/test-results/**/*.xml
          reporter: java-junit

  # ─────── BUILD + PUSH (only on main branch merges) ──────────────
  build-push:
    name: Build and Push Image
    runs-on: ubuntu-latest
    needs: [lint, test]             # Both lint and test (all matrix variants) must pass
    if: github.event_name == 'push' # Only runs on push to main, not on PRs
    
    outputs:
      image-tag: ${{ steps.image-tag.outputs.sha }}   # Pass tag to deploy jobs
      ecr-image: ${{ steps.image-tag.outputs.full-ref }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: gradle
      
      - name: Build JAR (skip tests — already ran)
        run: ./gradlew build -x test --no-daemon
      
      - name: Generate image tag
        id: image-tag
        run: |
          SHA=$(git rev-parse --short HEAD)
          echo "sha=${SHA}" >> $GITHUB_OUTPUT
          echo "full-ref=${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:${SHA}" >> $GITHUB_OUTPUT
      
      # OIDC auth — no stored AWS credentials!
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GithubActionsECRRole
          aws-region: ${{ env.AWS_REGION }}
          # GitHub OIDC token is presented; AWS verifies it against the configured trust policy
          # The role only allows actions from this specific repository
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      # Docker layer cache to avoid rebuilding unchanged layers
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:${{ steps.image-tag.outputs.sha }}
            ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:latest
          cache-from: type=gha           # GitHub Actions cache for Docker layers
          cache-to: type=gha,mode=max    # Persist new layers to cache
          build-args: |
            APP_VERSION=${{ steps.image-tag.outputs.sha }}
      
      - name: Container vulnerability scan (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.image-tag.outputs.full-ref }}
          exit-code: '1'               # Fail pipeline on HIGH or CRITICAL CVEs
          severity: 'HIGH,CRITICAL'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()                   # Upload even if Trivy found issues (for review)
        with:
          sarif_file: 'trivy-results.sarif'

  # ─────── DEPLOY TO DEV (automatic) ──────────────────────────────
  deploy-dev:
    name: Deploy → Dev
    runs-on: ubuntu-latest
    needs: build-push
    environment: development           # GitHub Environment (no approval required)
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GithubActionsK8sRole
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER_DEV }} --region ${{ env.AWS_REGION }}
      
      - name: Deploy
        run: |
          kubectl set image deployment/payment-service \
            payment-service=${{ needs.build-push.outputs.ecr-image }} \
            -n payment-dev
          kubectl rollout status deployment/payment-service -n payment-dev --timeout=5m

  # ─────── DEPLOY TO STAGING (after manual approval) ──────────────
  deploy-staging:
    name: Deploy → Staging
    runs-on: ubuntu-latest
    needs: deploy-dev
    environment: staging               # ← GitHub Environment with "Required reviewers" configured
    # When a reviewer approves in GitHub UI, this job proceeds
    
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GithubActionsK8sRole
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update kubeconfig for staging
        run: aws eks update-kubeconfig --name payment-staging-cluster --region ${{ env.AWS_REGION }}
      
      - name: Deploy to staging
        run: |
          kubectl set image deployment/payment-service \
            payment-service=${{ needs.build-push.outputs.ecr-image }} \
            -n payment-staging
          kubectl rollout status deployment/payment-service -n payment-staging --timeout=5m

  # ─────── REUSABLE WORKFLOW EXAMPLE ──────────────────────────────
  # To call this from another workflow file:
  # jobs:
  #   run-tests:
  #     uses: ./.github/workflows/reusable-test.yml
  #     with:
  #       java-version: '17'
  #     secrets: inherit
```

```yaml
# .github/workflows/reusable-test.yml — a reusable workflow callable from other workflows
name: Reusable — Run Tests

on:
  workflow_call:              # This makes it a reusable workflow
    inputs:
      java-version:
        required: false
        type: string
        default: '17'
    secrets:
      SLACK_WEBHOOK:
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: ${{ inputs.java-version }}
          distribution: 'temurin'
          cache: gradle
      - run: ./gradlew test --no-daemon
```

> **Key decisions here:**
> - `concurrency: cancel-in-progress: true` — when code is pushed rapidly (3 commits in 30 seconds), you want the pipeline to run for the latest commit only; older in-flight runs waste resources; this also prevents multiple deployments queuing up for rapid successive commits
> - `actions/setup-java@v4` with `cache: gradle` is simpler than manually configuring `actions/cache@v4` for Gradle; it caches the Gradle home directory with a hash of build files; cache hit = skip dependency download; saves 1-3 minutes per run
> - `docker/build-push-action@v5` with `cache-from: type=gha` — Docker's BuildKit supports GitHub Actions cache for layer reuse; if only application code changed (not dependencies), the layer containing the dependencies is reused from cache; cuts Docker build time from 4 minutes to 45 seconds on a cache hit

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is GitHub Actions and how does it work?"

**Hruday's answer:**
> GitHub Actions is a CI/CD automation platform built directly into GitHub. You define workflows in YAML files inside `.github/workflows/` in the repository. A workflow is triggered by a git event — a push, a pull request, a scheduled cron, or a manual dispatch.
>
> When triggered, GitHub spins up ephemeral virtual machines called runners — hosted by GitHub (ubuntu-latest) or self-hosted on your own infrastructure. The workflow defines jobs, which run on these runners. Jobs are independent units that run in parallel by default and can be chained with `needs` to run sequentially. Each job contains steps — either shell commands (`run: ./gradlew test`) or reusable actions from the GitHub Marketplace or your own repository (`uses: actions/checkout@v4`).
>
> The workflow file is version-controlled alongside the code — changes to the pipeline go through the same PR review process as application code. This is a significant advantage over external CI systems where the pipeline config lives in a separate UI with no version history.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does GitHub Actions implement approval gates for production deployments?"

**Hruday's answer:**
> GitHub Actions uses "Environments" for deployment protection. You create an Environment in the repository settings — for example, "production" — and configure "Required reviewers": one or more GitHub users or teams who must approve before the deployment can proceed.
>
> In the workflow YAML, the deploy job references the environment: `environment: production`. When that job starts, GitHub checks the environment's protection rules. If required reviewers are configured, the job pauses and GitHub sends a notification to the reviewers. The pipeline shows as "waiting for approval" in the UI. A reviewer opens the workflow run, reviews the changes (they can see what's being deployed — the commit, the test results), and clicks Approve or Reject.
>
> Upon approval, the job proceeds. Upon rejection with a comment, the job fails and the pipeline engineer gets an explanation.
>
> This is clean because the approval is integrated into the CI tooling and linked to the specific deployment run — there's no separate approval ticket system. The approval history is part of the GitHub Actions run log. For compliance, this creates an audit trail: who deployed what, when, and who approved it.

---

### Q3 — Trade-Off
**Interviewer asks:** "What are the trade-offs of using GitHub-hosted runners versus self-hosted runners?"

**Hruday's answer:**
> GitHub-hosted runners (ubuntu-latest, windows-latest) are the default and are very convenient: GitHub manages the VMs, upgrades the pre-installed tools, scales them automatically. You don't provision or maintain anything. For most use cases they're excellent.
>
> The downsides: first, internet egress cost — hosted runners download dependencies from the internet on every run; for a large Java project, this is hundreds of MB of Gradle dependencies per run; caching (`actions/cache`) mitigates this but doesn't eliminate it. Second, network access restrictions — hosted runners can't access services on your private VPC (private RDS, internal package mirrors, internal Kubernetes clusters); you need VPN tunneling or public access for these (both have security implications). Third, they don't have access to proprietary hardware (HSMs, internal GPUs).
>
> Self-hosted runners are VMs or containers you manage, registered to your GitHub account. They run inside your network — they can access private RDS, private EKS clusters, internal registries without any special networking. Dependencies can be pre-cached on the runner, making builds faster (no network download). The downside is operational overhead: you manage the runner fleet, update the runner binary, ensure enough runners for concurrent workflows, and handle runner failures.
>
> My approach: GitHub-hosted runners for everything that doesn't need private network access (lint, test, Docker build against public registries). Self-hosted runners for the deploy stages that need to communicate with private Kubernetes clusters or internal services.

---

### Q4 — Scenario
**Interviewer asks:** "Your GitHub Actions pipeline is taking 18 minutes. How do you optimise it?"

**Hruday's answer:**
> The first step is to understand where the time is spent. GitHub Actions workflow runs show per-step timing. I'd look for the three most common culprits.
>
> First, dependency downloads. If Gradle is downloading the Spring Boot BOM and all dependencies on every run — 2-4 minutes — adding `cache: gradle` to `actions/setup-java` or `actions/cache` with the Gradle cache key will eliminate this on non-dependency-change runs. Same for Python pip or npm.
>
> Second, sequential stages that could be parallel. If lint and test are running sequentially in one job, they can be split into separate parallel jobs. Lint runs in 90 seconds; test runs in 8 minutes. Running sequentially = 9.5 minutes. Running in parallel = 8 minutes (lint finishes inside the test window). Similarly, unit tests can run in parallel with static analysis.
>
> Third, Docker layer cache misses. If the Docker image dependencies layer is rebuilt on every push because the COPY instruction is ordered incorrectly (source code copied before the dependencies are installed), any code change triggers a full dependency layer rebuild. Fixing the Dockerfile order (COPY build files first, run dependency download, then COPY source) ensures the dependency layer is cached. Using `docker/build-push-action` with `cache-from: type=gha` caches layers in GitHub's cache.
>
> At SAP I took our pipeline from 14 to 8 minutes by combining Gradle cache, Docker layer caching, and separating lint into a parallel job. The key is measuring before optimising — don't guess where the time is.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "All jobs run in sequence" | "Let me list all the stages that run one after another" | Jobs run in parallel by default; only `needs` creates sequential dependencies; designing for maximum parallelism (lint + test in parallel, both needed before build) reduces total pipeline time |
| "Environments are just names" | "The environment field is just a label" | GitHub Environments can have protection rules — required reviewers, wait timers, deployment branches; these create manual approval gates directly in GitHub Actions without external tooling |
| "Secrets are fine to log" | "I can print secrets in the logs for debugging" | GitHub Actions automatically redacts values of secrets in logs, but only if you access them via `${{ secrets.NAME }}`; passing secrets through intermediate env vars or `run:` commands can expose them; never debug by printing secrets |
| "Matrix fails need rerun of all" | "If one matrix variant fails I have to rerun everything" | `fail-fast: false` keeps other matrix variants running when one fails; you can rerun only failed matrix jobs; the complete matrix failure state gives you information about all variants simultaneously |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I owned the GitHub Actions pipeline for our payment processing microservice. We had a monorepo with 4 services, and I implemented path filters so changes to `services/payment-service/**` only triggered the payment service pipeline — not all 4 pipelines. This reduced CI compute cost by 60% and eliminated false failures from unrelated services breaking.
>
> I also introduced Docker BuildKit layer caching using `docker/build-push-action` with `cache-from: type=gha`. Before caching, our Docker build took 6 minutes on every run because the Maven dependency layer was always rebuilt. After correctly ordering the Dockerfile COPY instructions (COPY pom.xml first, run `mvn dependency:go-offline`, THEN COPY src/) and enabling GHA cache, cache-hit builds dropped to 45 seconds.
>
> The most complex piece I built was the OIDC-based AWS authentication — replacing the stored `AWS_ACCESS_KEY_ID` with `role-to-assume` via the OIDC trust relationship. I configured the IAM role trust policy to only allow assumption from our specific repository and the `main` branch, so even if the OIDC issuer was somehow compromised, only one repository's main branch pipeline could assume the role."

---

## 8. Scale Evolution

**1,000 users/day →** Simple 3-job workflow: lint → test → deploy. GitHub-hosted runners sufficient. No matrix needed. Total pipeline time < 10 minutes.

**100,000 users/day →** Parallel lint + test, matrix builds for Java version compatibility, OIDC auth for AWS, Docker layer caching, environment-based approval gates for staging and production. Multiple services using reusable workflows to share pipeline logic.

**10 million users/day →** Self-hosted runners in the VPC for deploy stages (private cluster access). Workflow reuse at scale (composite actions for common steps). OpenTelemetry pipeline tracing (track P95 pipeline time over releases). SLSA supply chain security — artifact attestations, signed Docker images (Cosign). Dedicated pipeline performance engineering. Path-based triggers essential to avoid running 50 service pipelines per commit in a monorepo.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | GitHub Actions is the standard CI/CD for many fintech teams; approval gates for production deployments meet change management requirements; OIDC auth is a security best practice expected by security teams | Know the OIDC trust flow; explain approval gates via environments; discuss secret management |
| Swiggy / Meesho | High deploy frequency and many services = pipeline performance expertise valued; engineers who understand caching, parallelism, and reusable workflows are directly impactful | Explain Docker layer cache; parallelism model; matrix builds |
| Adobe / Microsoft | GitHub is Microsoft-owned; GitHub Actions is heavily used across Microsoft product teams; supply chain security (signed artifacts, provenance) is an active engineering area | Know SLSA; explain artifact provenance; discuss self-hosted runners |
| SAP Labs | SAP uses GitHub for most product development; GitHub Actions pipelines for AKS deployments are standard; direct experience with OIDC, path filters, and Docker caching | Direct pipeline ownership, optimization, and security hardening experience |

---

## 10. Related Topics — What to Study Next

- **Topic 190 — Pipeline Stages: Lint → Test → Build → Dockerize → Deploy** — the conceptual pipeline design that GitHub Actions implements; understanding why stages are ordered the way they are (fail fast, cheapest first) is the prerequisite for designing effective GitHub Actions workflows
- **Topic 192 — Jenkins Pipelines** — the enterprise alternative; GitHub Actions declarative YAML maps to Jenkins declarative pipeline syntax conceptually; if the interview is for a company using Jenkins (many SAP, Oracle, and older enterprise teams), this knowledge is directly needed
- **Topic 182 — Multi-Stage Docker Builds** — building the optimal Docker image is part of the Dockerize stage; a multi-stage Dockerfile reduces the final image size by 70-80%, reduces Docker build layer cache invalidation, and reduces the container image scan surface
- **Topic 197 — EKS: Kubernetes on AWS** — the deploy stages in GitHub Actions authenticate to AWS and deploy to EKS; the OIDC flow, the `aws eks update-kubeconfig` command, and IAM Roles for Service Accounts are all part of the GitHub Actions → EKS deployment chain

---

*Part 11 · GitHub Actions — Workflows, Jobs, Matrix Builds · Full Stack Interview Guide · Hruday D · 2026*
