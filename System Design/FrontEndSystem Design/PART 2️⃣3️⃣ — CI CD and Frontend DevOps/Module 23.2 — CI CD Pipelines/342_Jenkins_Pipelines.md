# 342 – Jenkins Pipelines – Declarative Syntax

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Jenkins uses **Jenkinsfile** for pipeline-as-code. **Declarative pipelines** (structured syntax) are preferred over scripted. Key concepts: `pipeline → agent → stages → steps`. Jenkins is widely used in enterprise (SAP, Bosch) despite GitHub Actions being preferred for newer projects.

## 2. 🔬 DEEP-DIVE EXPLANATION

```groovy
// Jenkinsfile (Declarative)
pipeline {
    agent { docker { image 'node:20-alpine' } }
    
    environment {
        CI = 'true'
        NODE_ENV = 'production'
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Quality Gates') {
            parallel {
                stage('Lint') {
                    steps { sh 'npm run lint' }
                }
                stage('Type Check') {
                    steps { sh 'npm run type-check' }
                }
                stage('Unit Tests') {
                    steps {
                        sh 'npm test -- --coverage'
                        junit 'coverage/junit.xml'
                        publishHTML(target: [
                            reportDir: 'coverage/lcov-report',
                            reportFiles: 'index.html',
                            reportName: 'Coverage Report'
                        ])
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }
        
        stage('Deploy') {
            when { branch 'main' }
            input { message 'Deploy to production?' }
            steps {
                sh './deploy.sh'
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            slackSend channel: '#deploys', message: "✅ Build ${env.BUILD_NUMBER} passed"
        }
        failure {
            slackSend channel: '#deploys', message: "❌ Build ${env.BUILD_NUMBER} failed"
        }
    }
}
```

### Jenkins vs GitHub Actions
| Feature | Jenkins | GitHub Actions |
|---|---|---|
| **Hosting** | Self-hosted | Cloud (GitHub) |
| **Config** | Jenkinsfile (Groovy) | YAML |
| **Plugins** | 1800+ plugins | Marketplace actions |
| **Scaling** | Manual agent management | Auto-scaling runners |
| **Cost** | Infrastructure cost | Free for public repos |
| **Best for** | Enterprise, on-prem, legacy | Modern projects, GitHub repos |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I've used Jenkins extensively at SAP and Bosch. Declarative pipelines with parallel quality gates (lint, type-check, tests), artifact archiving, and post-build Slack notifications. For new projects, I prefer GitHub Actions for its simpler YAML and managed infrastructure."*

## 4. 🧠 MEMORY AID
**"Jenkins: pipeline → agent → stages → steps. parallel {} for concurrent stages. when {} for conditions. post {} for always/success/failure."**

## 5. 🎯 KEY INSIGHT
Jenkins excels in enterprise with complex approval workflows (input steps), integration with enterprise tools (JIRA, SonarQube), and on-premise security requirements.
