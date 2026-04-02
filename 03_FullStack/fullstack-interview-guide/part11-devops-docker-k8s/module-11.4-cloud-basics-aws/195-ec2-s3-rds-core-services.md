# EC2, S3, RDS — Core AWS Services
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **EC2 (Elastic Compute Cloud)**: virtual machines in AWS; you pick instance type (compute family + size), AMI (OS image), and it runs in your VPC; the foundation for everything else — EKS worker nodes, RDS servers, and bastion hosts are all EC2 instances under the hood
- **S3 (Simple Storage Service)**: infinitely scalable object storage; buckets hold objects (files) identified by keys (paths); no file system hierarchy — just flat key-value; used for: static assets (images, JS bundles via CloudFront), application data exports, log archival, Docker build artifacts, Terraform state files
- **RDS (Relational Database Service)**: managed PostgreSQL/MySQL/Oracle/SQL Server; AWS handles patching, backups (automated, up to 35-day retention), minor version upgrades, storage scaling; you manage schema and instances; Multi-AZ = synchronous standby replica in another AZ — automatic failover in 60-120 seconds
- **RDS Read Replicas**: asynchronous replicas for read scaling; route read-heavy queries to replicas; Spring Boot: configure a separate `DataSource` pointing at the read replica endpoint; replicas can be promoted to standalone if the primary fails (not automatic — requires action)
- **Security fundamentals**: S3 objects are private by default (no public access without explicit policy); RDS should be in a private subnet (not internet-facing); EC2 instances accessed via IAM roles (no stored SSH keys in production); S3 server-side encryption enabled by default since 2023
- **Cost pattern**: EC2 On-Demand for variable workloads; Reserved Instances (1-3 year commitment) for steady-state base load (40-60% discount); Spot Instances for fault-tolerant batch/CI workloads (up to 90% discount but can be interrupted)
- 🆕 **Gap topic for Hruday**: "I've worked with S3 (static assets, file exports), RDS PostgreSQL (production databases at SAP on Aurora PostgreSQL), and understand EC2 through Kubernetes worker nodes on EKS. Building conceptual depth on instance types and Multi-AZ failover patterns"

---

## 1. One-Line Definition
EC2, S3, and RDS are AWS's foundational compute, storage, and database services — virtual machines, infinitely scalable object storage, and managed relational databases — that together form the infrastructure layer most backend applications run on or interact with.

---

## 2. The Problem Each Solves

**Before cloud (on-premise):** Provisioning a new server required buying hardware, racking it, cabling it, imaging the OS — weeks of lead time. Storage was constrained by physical disk capacity. Databases required DBA teams for backup, replication, and patching.

**EC2** replaces physical servers with virtual machines that can be started in 60 seconds, scaled from 1 to 1,000 within minutes, and terminated when no longer needed. You pay per second. No hardware procurement.

**S3** replaces file servers and NAS storage with infinitely scalable object storage. A file server maxes out at its disk capacity and requires manual expansion. S3 has no capacity limit — store 1 byte or 1 petabyte with the same API. It's also globally highly available (99.999999999% durability — 11 nines) and integrated with every other AWS service.

**RDS** replaces self-managed database servers with a managed service that handles the operational burden: automated backups, point-in-time recovery, Multi-AZ replication for high availability, automated minor version patching, and storage auto-scaling. A self-managed PostgreSQL requires a DBA team for replication setup, backup scripting, and failover procedures. RDS automates all of this.

---

## 3. How Each Works Internally

### EC2 — Instance Types and Lifecycle

```
EC2 Instance Type taxonomy:
  [Family][Generation][Size]
  t3.medium   → t=burstable, 3=gen 3, medium
  m6i.xlarge  → m=general purpose, 6=gen 6, i=Intel, xlarge
  c6g.2xlarge → c=compute optimised, 6=gen 6, g=Graviton (ARM), 2xlarge

Key families:
  t-series  Burstable general purpose  → dev/test, small workloads
  m-series  Balanced general purpose   → most web/app servers
  c-series  Compute optimised          → CPU-bound: payments, gaming
  r-series  Memory optimised           → in-memory databases, Elasticsearch
  i-series  Storage optimised          → databases with high IOPS requirements

Instance lifecycle:
  Pending → Running → Stopping → Stopped → Terminated
  Running: billed by the second
  Stopped: NOT billed for compute (charged for EBS storage)
  Terminated: instance and ephemeral storage deleted permanently

Pricing models:
  On-Demand  Pay per second, no commitment → variable workloads
  Reserved   1-3 year commitment → 40-60% cheaper, for baseline capacity
  Spot        Spare AWS capacity → up to 90% cheaper, but CAN BE INTERRUPTED
               2-minute warning before termination
               Use for: batch jobs, CI/CD workers, stateless services with checkpointing

EBS (Elastic Block Store) — persistent disk for EC2:
  Stays attached to the instance; survives reboots; NOT survived by termination (by default)
  Types: gp3 (general purpose SSD), io2 (high IOPS provisioned)
  gp3: 3,000 IOPS baseline; up to 16,000 IOPS if you need more
```

### S3 — Object Storage Model

```
S3 structure:
  Bucket (globally unique name) → Objects (files, up to 5TB each)
  Key = the full "path" of the object: "uploads/user-123/profile-photo.jpg"
  No real directories — just keys with "/" characters that the console displays as folders

Storage classes (automatically tiered by lifecycle rules):
  Standard          → Hot data; frequent access; lowest latency
  Standard-IA       → Infrequent access; lower cost but retrieval fee; 30-day minimum
  Intelligent-Tiering → AWS automatically moves between hot/cold tiers based on access
  Glacier Instant   → Archives with millisecond retrieval (rare access)
  Glacier Flexible  → Archives with 1-5 hour retrieval
  Deep Archive      → 12-hour retrieval; cheapest; compliance archival

S3 security model:
  Objects PRIVATE by default
  "Block Public Access" account-level setting prevents public buckets
  Access via: IAM policies (who can call S3 API), bucket policies (resource-based),
              pre-signed URLs (time-limited URL for unauthenticated download), ACLs (deprecated)
  Encryption: AWS SSE-S3 (AES-256) enabled by default for all new objects (since Jan 2023)
              SSE-KMS for fine-grained key management and audit trail

Common patterns:
  Static website hosting → S3 + CloudFront CDN
  Application file uploads → Pre-signed URLs (frontend uploads directly to S3, not through your server)
  Application exports → Write files to S3; user downloads via pre-signed URL; no server file I/O
  Log archival → CloudWatch → S3 export; Athena for SQL queries on the logs
```

### RDS — Managed Database Internals

```
RDS deployment options:
  Single-AZ:    One instance, one AZ — no HA; use for dev/test only
  Multi-AZ:     Primary + synchronous standby in another AZ
                Writes go to primary; standby receives synchronous replication
                Automatic failover in 60-120 seconds if primary fails
                Standby is NOT accessible for reads (it's a hot standby, not a read replica)
  Multi-AZ Cluster (new): primary + 2 readable standby instances; faster failover

RDS failover sequence (Multi-AZ):
  Primary RDS fails (hardware, OS, AZ outage)
    → AWS detects failure (~30 seconds)
    → Promotes standby to new primary (30-60 seconds)
    → DNS CNAME record for the DB endpoint is updated
    → New connections go to the new primary
    → Your application reconnects (connection pool detects broken connections)
  Total impact window: ~60-120 seconds of database unavailability

Aurora PostgreSQL vs RDS PostgreSQL:
  Aurora: distributed storage layer (6 copies across 3 AZs), faster failover (~30s),
          separate reader endpoint for read-replicas, up to 15 replicas
  RDS PostgreSQL: standard PostgreSQL, simpler, more portable (easy to migrate off AWS)
  At SAP: Aurora PostgreSQL for production (better failover, auto-scaling storage)

Spring Boot connection to RDS Multi-AZ:
  Always connect to the RDS endpoint DNS name (not the IP address!)
  RDS endpoint: payment-db.cluster-abc123.ap-south-1.rds.amazonaws.com
  During failover, the DNS record is updated — if you connect to an IP, it breaks after failover
  HikariCP (Spring Boot default pool): set minimum-idle to handle brief disconnections during failover
```

---

## 4. The Code

### Wrong Way — No HA, Public Access, Unencrypted
```hcl
# ❌ WRONG — Terraform example of insecure, fragile AWS setup
resource "aws_db_instance" "payment_db" {
  identifier        = "payment-db"
  engine            = "postgres"
  instance_class    = "db.t3.medium"
  
  # WRONG: Single-AZ — RDS instance goes down during maintenance or failure, no auto-recovery
  multi_az          = false
  
  # WRONG: Public access to the database from the internet
  publicly_accessible = true
  
  # WRONG: No encryption at rest
  storage_encrypted = false
  
  # WRONG: Database in default VPC (which is publicly accessible by default)
  db_subnet_group_name = "default"
  
  # WRONG: Security group allowing all inbound traffic (0.0.0.0/0 on port 5432)
  vpc_security_group_ids = ["sg-allow-all"]
  
  username = "admin"
  password = "hardcoded_password_123"    # Hardcoded secret — OWASP A02
  db_name  = "payments"
}

resource "aws_s3_bucket" "uploads" {
  bucket = "company-uploads"
  
  # WRONG: Public bucket — all uploaded files readable by anyone
  acl = "public-read-write"
}
```

> **Why this is a security emergency:** A publicly accessible PostgreSQL database with a hardcoded password and no encryption is the most common way AWS accounts are breached. Public S3 buckets have repeatedly caused major data breaches (hundreds of millions of records exposed). This configuration fails OWASP A02 (Cryptographic failures — no encryption), A01 (Broken access control — public database), and A05 (Security misconfiguration — public bucket, no network isolation). AWS sends automated alerts for this configuration and may suspend the account.

### Right Way — Private, Encrypted, HA Infrastructure
```hcl
# rds.tf — production RDS configuration

# Subnet group: RDS instances in PRIVATE subnets only (no internet route)
resource "aws_db_subnet_group" "payment_db" {
  name       = "payment-db-subnet-group"
  subnet_ids = var.private_subnet_ids    # Subnets with no route to internet gateway
  
  tags = {
    Name = "payment-db-subnet-group"
  }
}

# Security group: only allow PostgreSQL from within the VPC (application subnets)
resource "aws_security_group" "rds_sg" {
  name        = "payment-rds-sg"
  description = "Allow PostgreSQL from app subnet only"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]  # Only from application security group
    # NOT cidr_blocks = ["0.0.0.0/0"] — not open to internet
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS Aurora PostgreSQL cluster — production-grade HA
resource "aws_rds_cluster" "payment_db" {
  cluster_identifier      = "payment-db-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  
  # Credentials from AWS Secrets Manager — NOT hardcoded
  master_username         = "payment_admin"
  manage_master_user_password = true          # AWS manages rotation in Secrets Manager
  
  database_name           = "payments"
  
  db_subnet_group_name    = aws_db_subnet_group.payment_db.name
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
  
  # Encryption at rest (mandatory for any data with PII)
  storage_encrypted       = true
  kms_key_id              = var.kms_key_arn   # Customer-managed KMS key for audit trail
  
  # Backup retention (35 days = maximum for Aurora)
  backup_retention_period = 7                 # 7 days for most services
  preferred_backup_window = "03:00-04:00"     # Off-peak backup window
  
  # Deletion protection — cannot be deleted via console or CLI without explicitly disabling
  deletion_protection     = true
  
  # Enable enhanced monitoring and Performance Insights
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  tags = {
    Environment = "production"
    Service     = "payment"
    DataClass   = "confidential"
  }
}

# Aurora writer (primary) and reader instances
resource "aws_rds_cluster_instance" "payment_db_primary" {
  count              = 1
  identifier         = "payment-db-primary"
  cluster_identifier = aws_rds_cluster.payment_db.id
  instance_class     = "db.r6g.xlarge"       # Memory-optimised Graviton — good for databases
  engine             = aws_rds_cluster.payment_db.engine
  engine_version     = aws_rds_cluster.payment_db.engine_version
  
  publicly_accessible = false                 # NEVER true for production
  
  performance_insights_enabled = true         # Query performance monitoring
  monitoring_interval          = 60           # Enhanced monitoring every 60 seconds
}

resource "aws_rds_cluster_instance" "payment_db_reader" {
  count              = 2                      # 2 read replicas for scaling reads
  identifier         = "payment-db-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.payment_db.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.payment_db.engine
  engine_version     = aws_rds_cluster.payment_db.engine_version
  publicly_accessible = false
}
```

```hcl
# s3.tf — secure S3 bucket with encryption and access controls
resource "aws_s3_bucket" "payment_exports" {
  bucket = "sap-payment-exports-production-${var.account_id}"  # Globally unique with account ID
  
  tags = {
    Environment = "production"
    DataClass   = "internal"
  }
}

# Block all public access — no S3 object is ever public
resource "aws_s3_bucket_public_access_block" "payment_exports" {
  bucket = aws_s3_bucket.payment_exports.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enforce encryption for all objects
resource "aws_s3_bucket_server_side_encryption_configuration" "payment_exports" {
  bucket = aws_s3_bucket.payment_exports.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true              # Reduces KMS API call cost
  }
}

# Lifecycle rules: automatic tier migration and expiration
resource "aws_s3_bucket_lifecycle_configuration" "payment_exports" {
  bucket = aws_s3_bucket.payment_exports.id
  
  rule {
    id     = "export-lifecycle"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"   # Move to infrequent access after 30 days
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"       # Archive after 90 days
    }
    
    expiration {
      days = 365                       # Delete after 1 year
    }
  }
}
```

```java
// Spring Boot — RDS configuration with HikariCP (connection pool resilient to Multi-AZ failover)
// application-production.yml
spring:
  datasource:
    # ALWAYS use the Aurora cluster endpoint (DNS) — not IP
    url: jdbc:postgresql://payment-db-cluster.cluster-abc123.ap-south-1.rds.amazonaws.com:5432/payments
    username: ${DB_USERNAME}        # Injected from Kubernetes Secret / External Secrets Operator
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
    
    hikari:
      minimum-idle: 5               # Keep 5 connections warm at all times
      maximum-pool-size: 20         # Maximum 20 connections per pod
      idle-timeout: 300000          # Remove idle connections after 5 min
      connection-timeout: 30000     # Fail fast if can't get connection in 30s
      max-lifetime: 1800000         # Recycle connections after 30 min (shorter than RDS idle timeout)
      
      # Critical for Multi-AZ failover recovery (RDS brief disconnect)
      connection-test-query: SELECT 1    # Test connection is valid before using from pool
      validation-timeout: 5000           # Validation must complete in 5s
      keepalive-time: 60000              # Send keepalive every 60s to detect broken connections

  # Read replica routing for read queries (Spring Data JPA with multiple datasources)
  # Optional: configure a read-only DataSource for read replicas
  # Read replica endpoint: payment-db-cluster.cluster-ro-abc123.ap-south-1.rds.amazonaws.com
```

**S3 pre-signed URL pattern (Spring Boot):**
```java
// PaymentExportService.java
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.time.Duration;

@Service
public class PaymentExportService {
    
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    
    @Value("${aws.s3.exports-bucket}")
    private String exportsBucket;
    
    public PaymentExportService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }
    
    // Generate a monthly payment export and return a limited-time download URL
    public String generateExportAndGetDownloadUrl(String tenantId, YearMonth month) {
        String key = String.format("exports/%s/%s/payment-report.csv", tenantId, month);
        
        // 1. Write the export data to S3 (server-side — no temp file on server)
        byte[] exportData = generateCsvData(tenantId, month);
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(exportsBucket)
                .key(key)
                .contentType("text/csv")
                .build(),
            software.amazon.awssdk.core.sync.RequestBody.fromBytes(exportData)
        );
        
        // 2. Generate a pre-signed URL valid for 15 minutes
        // The client downloads directly from S3 — doesn't stream through your server
        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(
            GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(r -> r
                    .bucket(exportsBucket)
                    .key(key))
                .build()
        );
        
        return presignedRequest.url().toString();
        // The URL includes auth credentials as query parameters — valid for 15 minutes only
        // The bucket remains private — only this URL can download the object
    }
}
```

> **Key decisions here:**
> - Aurora PostgreSQL instead of standard RDS PostgreSQL for production — Aurora's distributed storage (6 copies across 3 AZs) provides faster failover (~30s vs 60-120s for Multi-AZ RDS), auto-scaling storage (no more `modify-db-instance --allocated-storage` operations during peaks), and separate reader endpoint for read replicas
> - `max-lifetime: 1800000` (30 minutes) on HikariCP — keeps connection recycling shorter than RDS's `wait_timeout`; if HikariCP holds a connection longer than the RDS idle timeout, RDS closes the connection from its end; HikariCP tries to use it, gets a broken pipe, and the query fails; recycling at 30 minutes is safely below the RDS default timeout
> - Pre-signed URLs for S3 downloads — the object stays private; a time-limited URL grants access; no credentials in the URL except the built-in signature; after 15 minutes the URL expires and the object is again inaccessible without a new signed URL

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between EBS and S3 in AWS?"

**Hruday's answer:**
> EBS (Elastic Block Store) is persistent block storage that attaches to an EC2 instance like a physical disk drive — it presents a file system to the OS. You read and write files to it using normal file I/O. It's scoped to a single AZ and can only be attached to one EC2 instance at a time (with some exceptions). Think of it as a hard drive for your VM.
>
> S3 is object storage — you interact with it via HTTP API (PUT, GET, DELETE) using a bucket name and key (the "path" of the object). There's no file system — it's a flat key-value store. Objects can be of any size up to 5TB. It's globally available (not AZ-scoped), highly durable (11 nines), and infinitely scalable.
>
> When to use each: EBS for the database data files (RDS uses EBS under the hood), application server ephemeral data, and anything that needs file system semantics with low latency. S3 for static assets, user uploads, application exports, log archival, Terraform state, Docker layer storage (ECR also uses S3 internally) — anything that's a blob of data accessed via a key, doesn't need POSIX file system semantics, and needs to be shareable across multiple instances.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain RDS Multi-AZ and how it handles failover."

**Hruday's answer:**
> RDS Multi-AZ maintains two database instances in separate Availability Zones within the same AWS region. The primary instance handles all read and write traffic. AWS maintains a synchronous standby replica in a different AZ — every transaction written to the primary is synchronously replicated to the standby before the write is acknowledged to the application. This means the standby always has an up-to-date copy of the primary's data.
>
> When the primary fails — hardware issue, AZ failure, or instance OS crash — AWS detects the failure in about 30 seconds. It then promotes the standby to become the new primary, which takes another 30-60 seconds. AWS updates the DNS CNAME record for the RDS endpoint to point to the new primary's IP address.
>
> The key point for applications: they must connect using the RDS endpoint DNS name, not the IP address. During failover, the IP changes but the DNS name (like `payment-db.cluster-abc123.ap-south-1.rds.amazonaws.com`) is updated automatically. Applications using IP addresses will fail permanently after a Multi-AZ failover.
>
> The application's connection pool will detect broken connections after the failover and reconnect to the DNS name, now resolving to the new primary. With HikariCP, `connection-test-query: SELECT 1` ensures that broken connections from before the failover are detected before being given to a request. Total application-visible downtime: 60-120 seconds, during which database operations that hit broken connections will fail with exceptions.

---

### Q3 — Trade-Off
**Interviewer asks:** "When would you use RDS Read Replicas versus adding more application caching?"

**Hruday's answer:**
> Read replicas and caching solve the read scalability problem from different angles.
>
> Add caching (Redis/Memcached) when: you're reading the same data repeatedly (same product details, same user profile), reads are significantly more than writes, the data is reasonably static or has acceptable stale tolerance, and you're experiencing database CPU/IOPS contention. Caching reduces database load dramatically for cacheable data — a cache hit costs microseconds and zero database IOPS.
>
> Add read replicas when: your queries are too complex or dynamic to cache effectively (ad-hoc reporting queries, analytical queries), the data is too volatile for caching, you need strong consistency (read your own writes), or you're running reporting/analytics workloads that would starve the primary's resources.
>
> The problem with read replicas for application read scaling: Aurora read replicas have ~10-100ms replication lag. If a user writes data and immediately reads it back (add item to cart, show cart), they might see stale data from the replica. This "read-your-own-writes" consistency requires either routing that user's subsequent reads to the primary (sticky reads), checking the replica lag, or accepting eventual consistency for that use case.
>
> At SAP, we used Redis for frequently read (but rarely changed) reference data (currencies, country codes, product categories) — 99% of read load never touched the database. RDS read replicas handled our reporting and data export queries that weren't cacheable. This reduced primary database CPU from 60% to under 20% during peak.

---

### Q4 — Scenario
**Interviewer asks:** "How do you allow your Spring Boot application on EKS to write to an S3 bucket without storing AWS credentials anywhere?"

**Hruday's answer:**
> This is the IAM Roles for Service Accounts (IRSA) pattern on EKS — the correct answer for any "how does my K8s app access AWS services without credentials" question.
>
> The setup: create an IAM role with the S3 write permissions needed (specific bucket only, specific key prefix). Configure the IAM trust policy to allow the role to be assumed by a Kubernetes Service Account in a specific namespace, using EKS's OIDC provider. Annotate the Kubernetes Service Account with the IAM role ARN.
>
> When the pod using that Service Account makes an AWS SDK call (S3Client.putObject()), the SDK checks for the `AWS_WEB_IDENTITY_TOKEN_FILE` and `AWS_ROLE_ARN` environment variables — which EKS injects into pods using IRSA-annotated service accounts. The SDK presents the web identity token to AWS STS, which verifies it against the OIDC provider, and issues temporary credentials (valid 1 hour, auto-renewed).
>
> The result: short-lived temporary credentials derived from the pod's identity, scoped to exactly the permissions the application needs, automatically rotated. No long-lived access keys stored anywhere — not in environment variables, not in Kubernetes Secrets, not in the application configuration.
>
> The IAM policy should follow least privilege: only `s3:PutObject` on `arn:aws:s3:::sap-payment-exports-production/*`/exports/${tenantId}/ — not wildcard bucket access.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "S3 has directories" | "I created a /uploads directory in S3" | S3 is flat key-value — there are no directories; "uploads/user-123/photo.jpg" is a key that contains slashes; the console renders this as folder-like, but the SDK and API see it as a single key; this matters for operations like "list all files for user-123" (prefix filtering, not directory listing) |
| "Multi-AZ standby is readable" | "Use the Multi-AZ standby for reads to reduce primary load" | The Multi-AZ standby is a WARM STANDBY — it's not accessible for reads; it exists only for failover; use Aurora read replicas or standard RDS read replicas for read scaling; get these confused in an interview and the interviewer will notice |
| "Connect to RDS IP after failover" | "Connect to the RDS IP to avoid DNS resolution overhead" | After Multi-AZ failover, the old IP no longer responds; you MUST use the DNS endpoint name; the DNS TTL is intentionally short (5s) to enable fast reconnection; connecting to IP causes permanent failure after failover |
| "S3 is public by default" | "S3 objects are accessible if you know the URL" | S3 objects are private by default; you need an IAM policy, bucket policy, or pre-signed URL to access them; "Block Public Access" account-level setting prevents any accidental public access even if you create a bucket policy that allows it |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our primary database was Aurora PostgreSQL on AWS, connected from services running on AKS. I configured the Spring Boot HikariCP settings specifically for Aurora's ~30-second failover window — setting `max-lifetime` to 1,800,000 ms (30 minutes) to prevent HikariCP holding connections past Aurora's idle connection timeout, and `connection-test-query: SELECT 1` to efficiently detect stale connections after a failover event.
>
> I also implemented the S3 pre-signed URL pattern for our SAP Document Management export feature — customers could export their payment transaction history as CSV files directly to S3, and the download link was a 15-minute pre-signed URL. This removed a previous implementation where we streamed the file through the Spring Boot server (causing memory pressure for large exports during peak) and replaced it with direct-to-S3 writes from the server and pre-signed URL delivery to the client.
>
> For authentication, I used IRSA (IAM Roles for Service Accounts) to give the payment-service pods an IAM role with S3 write permissions — no stored AWS credentials anywhere in the application or Kubernetes configuration."

---

## 8. Scale Evolution

**1,000 users/day →** Single-AZ RDS (acceptable for early stage — cost conscious), one S3 bucket, a few EC2 t3.medium instances or ECS tasks. Manual backups to S3. Point-in-time recovery not configured.

**100,000 users/day →** Aurora PostgreSQL Multi-AZ with 1 read replica. S3 with lifecycle rules. EC2 Auto Scaling Groups for application tier (or EKS). Automated backups (7-day retention). CloudWatch alarms for RDS CPU, storage, connections.

**10 million users/day →** Aurora Global Database (multi-region) for disaster recovery and read latency reduction for international users. S3 Replication (CRR) to secondary region for compliance. Provisioned IOPS storage for databases with guaranteed IOPS. RDS Proxy for connection pooling at scale (thousands of Lambda functions or pods connecting to RDS via proxy pool). S3 Transfer Acceleration for global file uploads.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | All financial data on RDS/Aurora in private subnets; S3 for transaction logs and compliance exports; EC2 (via EKS) for all compute; AWS architecture knowledge expected at senior level | Know Multi-AZ failover exactly; explain IRSA; know S3 security model |
| Swiggy / Meesho | Multi-region RDS for customer-facing databases; S3 for product image storage (CDN-backed); Aurora read replicas for order history queries; high read:write ratio workloads | Explain read replica use cases; Aurora vs RDS trade-off; S3 lifecycle for cost |
| Adobe / Microsoft | Enterprise cloud compliance (SOC2, ISO 27001) requires encrypted storage, private subnets, audit trails; specific RDS KMS key configurations for compliance | Encryption at rest/transit; KMS key management; VPC isolation |
| SAP Labs | SAP BTP services on AWS (Aurora PostgreSQL, S3 for document storage); IRSA for pod-to-AWS access; direct experience connecting AKS services to AWS RDS via authentication | Direct production experience with Aurora, S3 pre-signed URLs, IRSA |

---

## 10. Related Topics — What to Study Next

- **Topic 197 — EKS: Kubernetes on AWS** — the EKS worker nodes are EC2 instances; IRSA (IAM Roles for Service Accounts) enables pods to access S3 and RDS without stored credentials; the VPC configuration for EKS determines whether pods can reach RDS in private subnets
- **Topic 199 — VPC, Security Groups, IAM** — the foundational networking and access control for all three services; RDS in a private subnet with a restrictive security group; S3 access via IAM policies; EC2 access via security groups; the complete security posture requires understanding VPC topology
- **Topic 198 — CloudWatch Logs, Metrics, Alarms** — RDS Enhanced Monitoring, CloudWatch metrics for RDS (CPUUtilization, FreeStorageSpace, DatabaseConnections), S3 access logs — these feed the observability stack for the data layer
- **Topic 187 — ConfigMaps and Secrets** — the RDS connection credentials (username, password) flow from AWS Secrets Manager through External Secrets Operator into Kubernetes Secrets into the pod environment variables; the complete credentials lifecycle connects Topics 187, 195, and 199

---

*Part 11 · EC2, S3, RDS — Core AWS Services · Full Stack Interview Guide · Hruday D · 2026*
