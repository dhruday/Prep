# Pipeline Stages — Lint → Test → Build → Dockerize → Deploy
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **A CI/CD pipeline is an automated assembly line**: code pushed to git → series of stages run in sequence → working software deployed to production; every stage is a gate — if it fails, the pipeline stops and nothing is deployed
- **Standard stages**: Lint (code style, static analysis, security scan) → Test (unit, integration, contract tests) → Build (Maven/Gradle compile + package) → Dockerize (build Docker image, tag with Git SHA) → Push (Docker image to registry: ECR/GCR) → Deploy (update Kubernetes Deployment or Helm release)
- **Fail fast principle**: the cheapest stages run first; linting fails in seconds with no compute cost; unit tests run in 2 minutes; integration tests in 10 minutes; Docker builds in 5 minutes; deploy only happens after everything else passes
- **Image tagging strategy**: NEVER use `latest` as the production tag; tag images with the Git commit SHA (`git rev-parse --short HEAD`) — every image is traceable to an exact commit; rollbacks become precise (redeploy a specific SHA)
- **Environment promotion**: code deploys to dev automatically (on every push to main), promotes to staging after approval, promotes to production after approval; the SAME Docker image travels through environments — only the ConfigMap/environment variables differ
- **Gates and approvals**: staging-to-production promotion often requires a manual approval step (senior engineer or tech lead approves in the CI/CD tool) — not every commit is production-worthy even if tests pass
- ✅ **Hruday has real experience**: "I've built and maintained CI/CD pipelines at SAP using both GitHub Actions and Jenkins — these are production pipelines shipping Spring Boot services to Kubernetes"

---

## 1. One-Line Definition
A CI/CD pipeline is the automated workflow that takes a developer's git push and, through a series of quality gates, builds a verified container image and deploys it to the correct environment — making software delivery repeatable, reliable, and fast.

---

## 2. The Problem It Solves

Before CI/CD, software delivery was a manual process: a developer finishes a feature, runs tests locally (if they remembered), builds the JAR manually, copies it to a server, restarts the application, and declares it "deployed." This creates four major problems.

**Inconsistency**: "works on my machine" — the developer's laptop has Java 17 but the production server has Java 11; the build process varies between developers; different engineers deploy different ways.

**Human error**: manual steps are missed or done incorrectly; a developer forgets to run the security scan; a hotfix is deployed to production without running the full test suite because it was "just a one-line change."

**Slow feedback**: the developer doesn't know the tests are failing in the CI environment until hours or days after writing the code, at which point context is lost and fixing the issue is expensive.

**No audit trail**: there's no record of what was deployed, when, by whom, and what the artifact contained; a security audit asking "what code was running in production on March 15th?" can't be answered.

A CI/CD pipeline solves all four: every push goes through the same automated stages (consistency), no human steps between code and deploy (removes human error), fast failure signals appear within minutes (fast feedback), and every deployment is logged with artifact hash, timestamp, and triggering commit (audit trail).

---

## 3. How It Works Internally

### The Full Pipeline Flow

```
Developer pushes to main branch (or merges a PR)
  │
  ▼
Webhook fires → CI system picks up the new commit
  │
  Stage 1: LINT (parallel — run all linters at once)
  │  ├── Checkstyle / Google Java Format (code style)
  │  ├── SpotBugs / PMD (static analysis — potential bugs)
  │  └── Trivy / Snyk (dependency security scan — CVE check)
  │  → Fast: 30-90 seconds
  │  → Fail fast: stop pipeline if any linter fails
  │
  Stage 2: TEST
  │  ├── Unit tests (JUnit 5, Mockito) — in-memory, no external dependencies
  │  ├── Integration tests (Testcontainers — real DB/Redis in Docker) — requires Docker
  │  └── Contract tests (Spring Cloud Contract / Pact) — verify API contracts with consumers
  │  → Slower: 3-10 minutes
  │  → Test reports published as artifacts
  │  → Code coverage check — fail if below 80%
  │
  Stage 3: BUILD
  │  ├── Gradle/Maven build: ./gradlew clean build -x test  (tests already ran in Stage 2)
  │  └── Produces: payment-service-1.0.0.jar
  │  → 1-3 minutes
  │
  Stage 4: DOCKERIZE
  │  ├── Calculate image tag: GIT_SHA=$(git rev-parse --short HEAD) → e.g. a3f9c12
  │  ├── docker build -t payment-service:a3f9c12 .
  │  ├── Multi-stage Dockerfile (Topic 182): build stage + lean JRE runtime stage
  │  └── Run container image security scan: Trivy on the built image
  │  → 2-5 minutes
  │
  Stage 5: PUSH
  │  ├── docker tag payment-service:a3f9c12 123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:a3f9c12
  │  └── docker push (authenticates via OIDC or IAM role — no stored registry passwords)
  │  → 1-3 minutes depending on image size
  │
  Stage 6: DEPLOY (to dev — automatic)
  │  ├── kubectl set image deployment/payment-service payment-service=payment-service:a3f9c12 -n dev
  │  └── kubectl rollout status deployment/payment-service -n dev (wait for rollout to complete)
  │  → Success → pipeline green ✓ Developer sees their feature in the dev environment
  │
  ▼
Manual approval gate (staging promotion)
  │
  Stage 7: DEPLOY (to staging — after approval)
  │  ├── Same image (a3f9c12) deployed to staging namespace/cluster
  │  └── Same kubectl commands — image tag is the only difference
  │
  ▼
Manual approval gate (production promotion)
  │
  Stage 8: DEPLOY (to production — after approval)
     └── Same image (a3f9c12) deployed to production cluster
         The SAME Docker image has traveled through dev → staging → prod
         Only the Kubernetes ConfigMaps differ per environment
```

### Why the Same Image Across Environments

```
The cardinal rule of CI/CD:
  Build the artifact ONCE, promote it through environments

Why NOT build per environment:
  "Build for staging" → docker build → staging image
  "Build for production" → docker build → production image
  
  These builds are NOT identical!
  - Build timestamp differs
  - Dependencies could have different versions (if not locked)
  - Any non-determinism in the build produces different artifacts
  - You're testing a different artifact in staging than what goes to production
  - This defeats the purpose of a staging environment

What should differ per environment:
  - ConfigMap values (Spring profile, log level, URL endpoints)
  - Secrets (different DB passwords per environment)
  - Resource requests/limits (production gets more CPU/memory)
  - Replica count (production has more replicas)
  
  The image SHA (a3f9c12) is IDENTICAL across all environments
  If it works in staging, the same binary runs in production
```

---

## 4. The Code

### Wrong Way — Manual Deployment Without a Pipeline
```bash
# ❌ WRONG — developer manually deploys to production

# "I'll just build and push from my laptop..."
cd payment-service
mvn clean package                   # Build with my local Maven settings
docker build -t payment-service .   # Latest tag — which version is this?
docker tag payment-service:latest registry.company.com/payment-service:latest
docker push registry.company.com/payment-service:latest   # Overwrites 'latest'

# Deploy to production
kubectl set image deployment/payment-service payment-service=registry.company.com/payment-service:latest

# Problems:
# 1. No tests ran — developer's IDE test run is different from a clean CI environment
# 2. "latest" tag means the image is untraceable — what commit is in this image?
# 3. My local Maven cache may have different dependency versions than the lock file
# 4. No code review, no security scan, no approval gate
# 5. Next developer also pushes "latest" → previous deployment is overwritten with no trace
# 6. Production incident → what was deployed? When? Who approved? → No answer
```

> **Why this kills production:** The identity of a deployed artifact is fundamental to incident response and rollback. Without immutable image tags tied to git commits, you cannot answer "What code is running?" or "How do I roll back to last week?" Using `latest` means rollback is "push the previous latest build" — which might have been overwritten. Security scans are skipped. Test coverage is whatever the developer remembered to run. This pattern has caused production security breaches (shipping a dependency with a known CVE) and extended incidents (inability to identify the breaking change).

### Right Way — Full CI/CD Pipeline (GitHub Actions syntax)
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline — payment-service

on:
  push:
    branches: [main]            # Full pipeline on main branch merge
  pull_request:
    branches: [main]            # Lint + Test only on PRs (no deploy for PRs)

env:
  AWS_REGION: ap-south-1
  ECR_REPOSITORY: payment-service
  K8S_NAMESPACE_DEV: payment-dev
  K8S_NAMESPACE_STAGING: payment-staging

jobs:
  # ─────────────────────────────────────────────────────────────────
  # STAGE 1: LINT — run all linters in parallel
  # ─────────────────────────────────────────────────────────────────
  lint:
    name: Lint and Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Cache Gradle dependencies
        uses: actions/cache@v4
        with:
          path: ~/.gradle/caches
          key: gradle-${{ hashFiles('**/*.gradle.kts', '**/gradle-wrapper.properties') }}
      
      - name: Checkstyle (code style)
        run: ./gradlew checkstyleMain checkstyleTest
      
      - name: SpotBugs (static analysis)
        run: ./gradlew spotbugsMain
      
      - name: OWASP Dependency Check (security vulnerabilities in dependencies)
        run: ./gradlew dependencyCheckAnalyze
      
      - name: Upload Checkstyle report
        if: failure()                   # Only upload if lint failed (for debugging)
        uses: actions/upload-artifact@v4
        with:
          name: checkstyle-report
          path: build/reports/checkstyle/

  # ─────────────────────────────────────────────────────────────────
  # STAGE 2: TEST
  # ─────────────────────────────────────────────────────────────────
  test:
    name: Unit and Integration Tests
    runs-on: ubuntu-latest
    needs: lint                   # Don't run tests if linting failed
    
    services:                     # Side-car services for integration tests
      postgres:                   # Alternative to Testcontainers for CI
        image: postgres:15
        env:
          POSTGRES_DB: payment_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: ~/.gradle/caches
          key: gradle-${{ hashFiles('**/*.gradle.kts') }}
      
      - name: Run unit tests
        run: ./gradlew test
      
      - name: Run integration tests
        run: ./gradlew integrationTest
        env:
          SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/payment_test
          SPRING_DATASOURCE_USERNAME: test_user
          SPRING_DATASOURCE_PASSWORD: test_password
      
      - name: Check code coverage (minimum 80%)
        run: ./gradlew jacocoTestCoverageVerification
      
      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Test Results
          path: 'build/test-results/**/*.xml'
          reporter: java-junit

  # ─────────────────────────────────────────────────────────────────
  # STAGE 3+4+5: BUILD, DOCKERIZE, PUSH
  # ─────────────────────────────────────────────────────────────────
  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'    # Only on main branch pushes (not PRs)
    
    outputs:
      image-tag: ${{ steps.meta.outputs.sha-short }}   # Share tag with deploy jobs
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: ~/.gradle/caches
          key: gradle-${{ hashFiles('**/*.gradle.kts') }}
      
      - name: Build Spring Boot JAR
        run: ./gradlew clean build -x test     # Tests already ran in the test job
      
      - name: Get short SHA for image tag
        id: meta
        run: echo "sha-short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      
      - name: Configure AWS credentials (via OIDC — no stored secrets!)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-ecr-role
          aws-region: ${{ env.AWS_REGION }}
          # OIDC trust — no AWS access keys stored in GitHub Secrets
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build Docker image
        run: |
          docker build \
            --build-arg BUILD_VERSION=${{ steps.meta.outputs.sha-short }} \
            --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
            -t ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ steps.meta.outputs.sha-short }} \
            -t ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:latest \
            .
      
      - name: Run Trivy container image scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ steps.meta.outputs.sha-short }}
          format: 'sarif'
          exit-code: '1'                # Fail the pipeline on HIGH/CRITICAL CVEs
          severity: 'HIGH,CRITICAL'
      
      - name: Push Docker image to ECR
        run: |
          docker push ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ steps.meta.outputs.sha-short }}
          docker push ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:latest

  # ─────────────────────────────────────────────────────────────────
  # STAGE 6: DEPLOY TO DEV (automatic)
  # ─────────────────────────────────────────────────────────────────
  deploy-dev:
    name: Deploy to Dev
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: development          # GitHub Environment (for tracking, not approval)
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-k8s-role
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update kubeconfig for EKS
        run: aws eks update-kubeconfig --region ${{ env.AWS_REGION }} --name payment-dev-cluster
      
      - name: Deploy to dev namespace
        run: |
          IMAGE_TAG=${{ needs.build-and-push.outputs.image-tag }}
          ECR_IMAGE=123456789.dkr.ecr.ap-south-1.amazonaws.com/${{ env.ECR_REPOSITORY }}:${IMAGE_TAG}
          
          kubectl set image deployment/payment-service \
            payment-service=${ECR_IMAGE} \
            -n ${{ env.K8S_NAMESPACE_DEV }}
          
          kubectl rollout status deployment/payment-service \
            -n ${{ env.K8S_NAMESPACE_DEV }} \
            --timeout=5m               # Fail pipeline if rollout takes >5 minutes

  # ─────────────────────────────────────────────────────────────────
  # STAGE 7: DEPLOY TO STAGING (after manual approval)
  # ─────────────────────────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: deploy-dev
    environment: staging              # GitHub Environment with required reviewers
    # ↑ This creates a manual approval gate — a designated reviewer must approve in GitHub UI
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-k8s-role
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update kubeconfig for staging EKS cluster
        run: aws eks update-kubeconfig --region ${{ env.AWS_REGION }} --name payment-staging-cluster
      
      - name: Deploy to staging namespace
        run: |
          IMAGE_TAG=${{ needs.build-and-push.outputs.image-tag }}
          ECR_IMAGE=123456789.dkr.ecr.ap-south-1.amazonaws.com/${{ env.ECR_REPOSITORY }}:${IMAGE_TAG}
          
          kubectl set image deployment/payment-service \
            payment-service=${ECR_IMAGE} \
            -n ${{ env.K8S_NAMESPACE_STAGING }}
          
          kubectl rollout status deployment/payment-service \
            -n ${{ env.K8S_NAMESPACE_STAGING }} \
            --timeout=5m
```

> **Key decisions here:**
> - OIDC trust for AWS authentication — GitHub Actions' OIDC provider allows action runners to assume an IAM role without any stored AWS credentials; the alternative (storing `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub Secrets) creates long-lived credential exposure risk; OIDC tokens are rotated automatically and tied to the specific repository and branch
> - Git SHA as image tag — every image is uniquely identified by the commit that built it; an incident response question "what's running in production" is answered by looking at the deployed image tag and running `git show a3f9c12`; tooling like Renovate or Dependabot can open PRs to update to newer commit SHAs
> - `needs: lint` on test job — tests don't run if linting fails; expresses the dependency explicitly and saves compute cost by not running expensive test infrastructure if cheap linting already failed

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between CI and CD?"

**Hruday's answer:**
> CI — Continuous Integration — is the practice of integrating code changes frequently and automatically verifying them. Every push to the main branch triggers an automated pipeline: lint, test, build. The goal is to detect integration issues early, when they're cheap to fix, rather than at the end of a sprint when merging large divergent branches is painful.
>
> CD has two interpretations: Continuous Delivery means every successful CI pipeline produces a deployable artifact and deploys it automatically to at least a pre-production environment — the artifact is always ready to ship to production, but the actual production deployment may require manual approval. Continuous Deployment goes one step further: every successful build is automatically deployed all the way to production with no human gate.
>
> Most mature engineering teams practice Continuous Delivery rather than Continuous Deployment — they want automated quality gates but retain a human review step before production, particularly for infrastructure-heavy changes or high-risk features. At SAP, we had automated deployment to dev and staging, and a manual approval gate for production — Continuous Delivery, not full Continuous Deployment.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why should you use Git SHA for image tags instead of semantic version numbers?"

**Hruday's answer:**
> Semantic versions (1.2.3) are meaningful to humans but they require someone to decide what version number to assign and when. More importantly, they don't trace an artifact back to a specific commit automatically — you can have version 1.2.3 built at different times from different states of the repository.
>
> A Git SHA tag is automatically derived from the exact state of the code. No human decision is needed — the CI pipeline runs `git rev-parse --short HEAD` and that's the tag. `payment-service:a3f9c12` means "the image built from commit a3f9c12 in this repository." During an incident, `kubectl get deployment payment-service -o yaml` gives you the image tag, `git show a3f9c12` gives you the exact code, `git log a3f9c12` gives you the commit message and PR link, and you can compare to the current HEAD to see exactly what changed.
>
> Rollback becomes precise: `kubectl set image deployment/payment-service payment-service=payment-service:d8b2f11` deploys the specific previous commit's image. With `latest` or semantic versions, you'd need to find what image corresponded to the last known good state.
>
> In practice, I also push the `latest` tag alongside the SHA tag — `latest` is convenient for `docker pull` by developers locally, but production deployments always use the SHA tag.

---

### Q3 — Trade-Off
**Interviewer asks:** "What are the trade-offs of fully automated deployment to production versus a manual approval gate?"

**Hruday's answer:**
> Fully automated production deployment (true Continuous Deployment) has real benefits: faster time to market, smaller changes per deployment which means smaller blast radius when something goes wrong, no human bottleneck delaying features. Teams that do it well deploy to production tens or hundreds of times per day and have extremely mature automated testing.
>
> The prerequisites for safe Continuous Deployment are demanding: very high test coverage, comprehensive integration and contract tests, feature flags to decouple deployments from feature releases, automated canary deployments with automatic rollback on error rate increases, and mature observability so you detect problems within seconds of deployment. Without these, Continuous Deployment means broken code reaches production automatically.
>
> For most enterprise and financial services teams (SAP, Razorpay, etc.), a manual approval gate before production reflects that automated tests don't catch everything — particularly edge cases in business logic, performance regressions under real production load, and regulatory compliance checks. The manual gate is a human quality filter.
>
> My position: invest in the test infrastructure and canary deployment automation needed for Continuous Deployment, but start with a manual gate. Remove the gate as confidence in the pipeline grows. Removing a gate is easy; restoring production from a bad automated deployment is not.

---

### Q4 — Scenario
**Interviewer asks:** "A critical security vulnerability (CVE) is discovered in one of your Spring Boot service dependencies. How does your CI/CD pipeline help?"

**Hruday's answer:**
> This is exactly the scenario where a mature CI/CD pipeline pays for itself.
>
> First, the discovery: if you have `./gradlew dependencyCheckAnalyze` or `trivy image` as pipeline stages, the CVE check runs automatically on every build. When Snyk or OWASP Dependency Check publishes the CVE, the next pipeline run fails the security stage — the PR author sees it immediately and can't merge until it's fixed.
>
> Second, patching: update the dependency version in `build.gradle`, push, the pipeline builds a new image tagged with the new commit SHA. Trivy verifies the new image is clean.
>
> Third, deployment: the patched image follows the normal promotion path — dev, staging (automatic or after approval), production (after approval). No special emergency process needed.
>
> Fourth, verification: you can point to the specific image SHA in production and verify it was built from the commit that includes the dependency update. If a security auditor asks "has CVE-2024-XXXX been patched in production?", you answer with the deployment timestamp and image SHA.
>
> Without a pipeline, this process is manual: someone must remember to scan dependencies, figure out which services are affected, coordinate manual rebuilds and deployments for each service, and document the remediation. With a pipeline and automated CVE scanning, the detection and remediation process is systematic and fully auditable.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "latest tag in production" | "We tag everything as latest and pull latest in production" | `latest` is untraceable and mutable — a `docker push :latest` overwrites the previous image; rollback to 'latest' goes to whatever the last pushed image was; always use immutable tags (git SHA) in production |
| "Build different images per environment" | "We build a dev image and a separate prod image" | Build once, promote the artifact; if different builds go to staging vs production, you're testing a different artifact in staging than what runs in production; only config (ConfigMap/Secret) should differ |
| "CI and CD are the same" | "CI/CD is just automated testing" | CI = automated build and test on every push; CD = automated deployment to at least a pre-production environment; both together = CI/CD; many teams have CI without CD (tests pass but deployment is still manual) |
| "Pipeline stages can run in any order" | "Test and build can be parallelized" | Lint must be fast and first (fail fast, cheapest); tests should fail before a Docker build wastes 5 minutes; deploy must be last; the sequence expresses the dependency and cost hierarchy |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I maintained the GitHub Actions CI/CD pipeline for our Spring Boot microservices deployed to Azure Kubernetes Service. The pipeline ran Checkstyle, Gradle tests with Testcontainers, a Docker build using our multi-stage Dockerfile, a container scan with Trivy, and then deployed to AKS using `kubectl set image` with Git SHA tags. One recurring issue was the pipeline taking 12-15 minutes — too slow for developer feedback. I analysed the stages and found that Testcontainers was pulling PostgreSQL and Kafka images on every run, wasting 2-3 minutes cold. I introduced GitHub Actions `services` (pre-started side-car containers) for PostgreSQL and used GitHub's Docker layer cache for the Docker build. This cut the pipeline to under 8 minutes. I also introduced the approval gate for production deployments after a brief incident where a regression made it through to production — the gate gives the team a final review moment."

---

## 8. Scale Evolution

**1,000 users/day →** A simple pipeline: test → build → push to Docker Hub → `kubectl apply`. No approval gates needed at this scale. A few minutes end-to-end. Deploy to a single environment.

**100,000 users/day →** Multi-environment pipeline: dev (automatic), staging (automatic or with approval), production (with approval). Security scanning added (Trivy, OWASP). OIDC-based cloud auth (no stored credentials). Canary deployment to production using Argo Rollouts or Helm. Pipeline time measured and optimised (target: <10 minutes).

**10 million users/day →** Sophisticated pipeline: matrix builds (test on Java 17 and 21), multiple parallel test suites (unit, integration, contract, performance), automated canary with Prometheus-based auto-rollback, Progressive Delivery with Argo Rollouts or Flagger, pipeline as code reviewed in PRs like application code, SLSA provenance attestation for supply chain security, signed Docker images (Cosign), deployment records automatically synced to JIRA/PagerDuty.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial services have strict change management and audit requirements; pipeline stages produce the evidence (test results, security scan results, approved deployment) that meets compliance; engineers expected to design pipelines, not just use them | Explain how pipeline stages meet PCI-DSS change management requirements; discuss approval gates |
| Swiggy / Meesho | High deployment frequency (many teams, many services, many times per day) requires efficient, fast pipelines; pipeline optimization (caching, parallelisation) is an active engineering concern | Discuss pipeline performance optimization; know caching strategies for Gradle and Docker layers |
| Adobe / Microsoft | Software supply chain security (SLSA, image signing, CVE scanning) is a senior engineering concern; the pipeline is the security control point for all deployed software | Know security stages: dependency scanning, container scanning, SBOM generation |
| SAP Labs | SAP BTP deployments require strict quality gates; SAP maintains internal platform guidelines for deployment practices; direct pipeline ownership is expected for senior engineers | Direct pipeline maintenance and optimisation experience at SAP |

---

## 10. Related Topics — What to Study Next

- **Topic 191 — GitHub Actions: Workflows, Jobs, Matrix Builds** — the implementation of this pipeline lifecycle in the most widely adopted CI/CD platform today; YAML syntax, job dependencies, secrets, OIDC with cloud providers — all the mechanics of building the pipeline described here
- **Topic 192 — Jenkins Pipelines: Declarative Syntax** — the alternative implementation using the industry-standard CI/CD server, especially in enterprise environments (SAP, Oracle, large banks); same concepts, different YAML/Groovy syntax
- **Topic 186 — Deployments, ReplicaSets, Services** — the deploy stage of the pipeline outputs a `kubectl set image` command; understanding what happens inside Kubernetes after that command is issued (rolling update, readiness probe gating, endpoint controller updates) completes the full picture from code push to traffic served
- **Topic 193 — Blue-Green Deployment** and **Topic 194 — Canary Releases** — advanced deployment strategies that the pipeline orchestrates; instead of a simple `kubectl set image`, the deploy stage uses Argo Rollouts or Helm hooks to implement canary traffic splitting or instant blue-green switchover

---

*Part 11 · Pipeline Stages — Lint → Test → Build → Dockerize → Deploy · Full Stack Interview Guide · Hruday D · 2026*
