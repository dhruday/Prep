# VPC, Security Groups, and IAM Basics
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **VPC (Virtual Private Cloud)**: logically isolated network within AWS; your resources (EC2, RDS, EKS nodes, Lambda) run inside it; CIDR block defines the IP address range (e.g., 10.0.0.0/16 = 65,536 addresses); nothing can enter your VPC unless you explicitly allow it via security groups / NACLs / internet gateway
- **Subnets**: subdivide the VPC CIDR across Availability Zones; **public subnets** have a route to an Internet Gateway (resources can have public IPs, receive internet traffic); **private subnets** have NO direct internet route (resources are unreachable from the internet — your RDS instance, EKS worker nodes, backend services); standard pattern: ALB in public subnets, everything else in private
- **NAT Gateway**: allows resources in private subnets to make OUTBOUND internet connections (pull Docker images, call external APIs) while remaining unreachable from the internet; sits in a public subnet; private subnet routes 0.0.0.0/0 → NAT Gateway; significant monthly cost (~$32/month/AZ + data processing charge)
- **Security Groups**: stateful firewalls attached to individual resources (EC2 instance, RDS instance, Lambda ENI); only ALLOW rules — no deny; return traffic is automatically allowed (stateful); chain security groups: ALB SG allows 443 from internet, App SG allows 8080 from ALB SG only, RDS SG allows 5432 from App SG only — this is the principle of least-privilege networking
- **IAM (Identity and Access Management)**: controls who/what can do what in AWS; Identities: users (humans), roles (services/machines), groups (collections of users); Permissions: policies (JSON documents defining Allow/Deny by Action, Resource, Condition); key principle: **least privilege** — grant only what is strictly needed; time-limited, resource-specific, condition-restricted
- **IRSA = IAM policy + Kubernetes ServiceAccount**: pod-level IAM role for EKS workloads (bridges Kubernetes identity to AWS IAM) — revisited from Topic 197
- 🆕 **Gap topic for Hruday**: "I understand VPC and IAM conceptually from SAP's AWS usage; I'm deepening my ability to design VPC topology and IAM policies for production systems"

---

## 1. One-Line Definition
VPC is your private, isolated network in AWS where all resources run; Security Groups are the stateful instance-level firewalls controlling traffic flow between resources within the VPC; and IAM is the identity and permissions system that controls which AWS principals (users, roles, services) can perform which API actions on which AWS resources.

---

## 2. The Problem It Solves

Public cloud without network isolation would mean every EC2 instance, every RDS database, every Lambda function is reachable from the public internet by default. A database exposed to 0.0.0.0/0 is a security catastrophe — scanners would find it within minutes and attempt credential attacks. VPC solves this by creating a private network boundary: nothing from the internet can reach your RDS instance in a private subnet, period, regardless of what credentials are used.

Security Groups solve the complementary problem within your VPC: just because two resources are in the same VPC doesn't mean they should talk to each other. The user service shouldn't be able to connect directly to the payment service's database. Security Groups enforce service-to-service network access patterns — the "who is allowed to talk to whom" rules within the VPC. A security group misconfiguration (too-permissive inbound rules) is one of the most common AWS security findings.

IAM solves the authentication and authorisation problem for AWS API access. Without IAM, any application that has network access to AWS API endpoints could do anything — create EC2 instances, delete S3 buckets, read other services' secrets. IAM ensures that each identity (user, service, application) has precisely the permissions it needs and nothing more. A compromised application with an overly permissive IAM role can exfiltrate data, spin up crypto mining instances, and delete backups. An application with a correctly scoped IAM role can only access the specific resources it legitimately needs.

---

## 3. How It Works Internally

### VPC Architecture for a Production Service

```
AWS Region: ap-south-1 (Mumbai)
VPC: 10.0.0.0/16 (65,536 addresses)

Availability Zone a (ap-south-1a)      Availability Zone b (ap-south-1b)
┌─────────────────────┐                 ┌─────────────────────┐
│ Public Subnet       │                 │ Public Subnet       │
│ 10.0.1.0/24 (256)   │                 │ 10.0.2.0/24 (256)   │
│                     │                 │                     │
│ [NAT Gateway a]     │                 │ [NAT Gateway b]     │
│ [ALB nodes (auto)]  │                 │ [ALB nodes (auto)]  │
└──────────┬──────────┘                 └──────────┬──────────┘
           │                                       │
           │ Route: 0.0.0.0/0 → Internet Gateway  │
           │                                       │
┌──────────▼──────────┐                 ┌──────────▼──────────┐
│ Private Subnet      │                 │ Private Subnet      │
│ 10.0.10.0/24 (256)  │                 │ 10.0.11.0/24 (256)  │
│                     │                 │                     │
│ [EKS Node]          │                 │ [EKS Node]          │
│ [EKS Node]          │                 │ [EKS Node]          │
│ (Spring Boot pods)  │                 │ (Spring Boot pods)  │
└──────────┬──────────┘                 └──────────┬──────────┘
           │ Route: 0.0.0.0/0 → NAT Gateway a     │ Route: 0.0.0.0/0 → NAT Gateway b
           │                                       │
┌──────────▼──────────┐                 ┌──────────▼──────────┐
│ DB Subnet           │                 │ DB Subnet           │
│ 10.0.20.0/24        │                 │ 10.0.21.0/24        │
│                     │                 │                     │
│ [RDS Primary]       │                 │ [RDS Standby]       │
│ [ElastiCache]       │                 │                     │
└─────────────────────┘                 └─────────────────────┘

No route to internet from DB subnets — RDS cannot initiate or receive internet traffic

Internet Gateway: attached to VPC, enables internet traffic to/from public subnets
VPC endpoint (Gateway type): privately routes S3 and DynamoDB traffic within AWS backbone
                              (no NAT Gateway charges, no internet exposure for S3 access)
```

### Security Group Chain

```
Security Groups are stateful:
  You open a port inbound → the return traffic is automatically allowed
  You do NOT add an outbound rule for the return traffic
  
  Request: Client → ALB (port 443) → EC2/Pod (port 8080) → RDS (port 5432)
  Returns: RDS → EC2/Pod → ALB → Client
  
  All return paths are handled by stateful tracking, no extra rules needed

Security Group Rules for payment service:

ALB Security Group (alb-sg):
  Inbound:  Allow TCP 443 from 0.0.0.0/0 (internet HTTPS)
  Inbound:  Allow TCP 80  from 0.0.0.0/0 (redirect to HTTPS)
  Outbound: Allow All     to 0.0.0.0/0   (ALB needs to reach targets)
  
Payment App Security Group (payment-app-sg):
  Inbound:  Allow TCP 8080 from alb-sg (ONLY from ALB — not from internet, not from other services)
  Inbound:  Allow TCP 8080 from payment-app-sg (service calls itself — health checks from sibling pods)
  Outbound: Allow All to 0.0.0.0/0 (pods need to call AWS APIs, external services)
  Note: In strict environments, restrict outbound too:
        Allow TCP 5432 to rds-sg (PostgreSQL only)
        Allow TCP 443  to 0.0.0.0/0 (HTTPS to AWS services and external APIs)

RDS Security Group (rds-sg):
  Inbound:  Allow TCP 5432 from payment-app-sg (ONLY from payment service pods)
  Inbound:  Allow TCP 5432 from bastion-sg     (ONLY from bastion/jump host for DBA access)
  Outbound: Allow All to rds-sg                (RDS multi-AZ replication)
  
CRITICAL: Never put 0.0.0.0/0 on RDS inbound port — this is flagged by AWS Security Hub
          and is a critical finding in any security audit
```

### IAM Structure

```
IAM Hierarchy:
  
  Identities:
    Users: long-lived credentials for humans; MFA required for console access
           Access keys (key ID + secret) for programmatic access — rotate every 90 days
           Best practice: don't create long-term access keys; use SSO + temporary creds
    
    Roles: temporary credentials (1-12 hours); assumed by services, EC2, Lambda, EKS pods
           No long-lived credentials; credentials auto-rotate via STS (Security Token Service)
           Best choice for any machine/application identity
    
    Groups: collections of users; attach policies to the group, users inherit
            PaymentTeam-DevGroup: ReadOnly to payment-dev AWS account
            PaymentTeam-ProdGroup: ReadOnly to payment-prod (no direct prod access)

  Policies (JSON documents):
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",            // Allow or Deny
          "Action": [                   // What API calls
            "s3:GetObject",
            "s3:PutObject"
          ],
          "Resource": [                 // Which specific resources (ARNs)
            "arn:aws:s3:::payment-documents-prod/*"
          ],
          "Condition": {                // Additional restrictions
            "StringEquals": {
              "aws:RequestedRegion": "ap-south-1"  // Only from ap-south-1 region
            }
          }
        }
      ]
    }
  
  Policy types:
    Managed policies: reusable across multiple identities; maintained separately
    Inline policies: attached directly to one identity; not reusable
    Service-linked roles: created by AWS services (e.g., EKS creates its own roles)

  IAM Evaluation logic:
    1. Default deny (nothing allowed unless explicitly permitted)
    2. Explicit deny always wins (even if another Allow exists)
    3. Allow statements grant access
    4. Resource policies (S3 bucket policies, KMS key policies) evaluated alongside identity policies
```

---

## 4. The Code

### Wrong Way — No Network Isolation, Overly Permissive IAM
```hcl
# ❌ WRONG — RDS database in public subnet with open access
resource "aws_db_instance" "payment_db" {
  instance_class         = "db.t3.medium"
  publicly_accessible    = true   # ❌ RDS has a public IP — reachable from internet
  
  # No VPC security group specified = AWS default SG
  # Default SG has all outbound allowed and all same-SG inbound allowed
  # But publicly_accessible + no restrictive ingress = internet-facing database
}

# ❌ WRONG — Lambda with admin-level IAM policy
resource "aws_iam_role_policy" "lambda_policy" {
  role = aws_iam_role.lambda_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["*"]           # ❌ All AWS API actions — full admin access
      Resource = ["*"]           # ❌ All resources in the account
    }]
  })
}
```

> **Why this fails:** A publicly accessible RDS instance is exposed to automated internet scanners within minutes of creation. Credential brute-force attacks and known CVE exploits target any open database port. There is NO valid production reason for a database to have a public IP. Similarly, `Action: ["*"]` with `Resource: ["*"]` gives this Lambda function complete admin access to your AWS account — it could create backdoor IAM users, delete all S3 buckets, read all Secrets Manager secrets, provision EC2 instances for crypto mining. Any vulnerability in the Lambda code becomes a full account compromise.

### Right Way — Private Subnets, Security Group Chain, Least-Privilege IAM
```hcl
# Terraform — complete production VPC setup

# VPC
resource "aws_vpc" "payment_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true   # Required for RDS endpoint resolution
  enable_dns_support   = true
  
  tags = {
    Name        = "payment-platform-prod"
    Environment = "production"
  }
}

# Public subnets (for ALB only)
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.payment_vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  map_public_ip_on_launch = false   # Explicit opt-in for resources needing public IPs
  
  tags = { Name = "payment-public-${count.index + 1}" }
}

# Private subnets (for EKS nodes, Spring Boot pods)
resource "aws_subnet" "private_app" {
  count             = 2
  vpc_id            = aws_vpc.payment_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = { Name = "payment-private-app-${count.index + 1}" }
}

# DB subnets (no internet route, tightest isolation)
resource "aws_subnet" "private_db" {
  count             = 2
  vpc_id            = aws_vpc.payment_vpc.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = { Name = "payment-private-db-${count.index + 1}" }
}

# Internet Gateway — for public subnets only
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.payment_vpc.id
}

# NAT Gateways — one per AZ for HA; allows private subnet outbound internet
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.igw]
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.payment_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id   # Public → Internet Gateway
  }
}

resource "aws_route_table" "private_app" {
  count  = 2
  vpc_id = aws_vpc.payment_vpc.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id   # Private → NAT Gateway (outbound only)
  }
}
# DB subnets have NO route table entry for 0.0.0.0/0 — fully isolated from internet

# VPC Endpoint for S3 (free — avoids NAT Gateway charges for S3 traffic)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.payment_vpc.id
  service_name = "com.amazonaws.ap-south-1.s3"
  route_table_ids = concat(
    [aws_route_table.public.id],
    aws_route_table.private_app[*].id
  )
}
```

```hcl
# Security Groups with minimum-necessary inbound rules

resource "aws_security_group" "alb" {
  name   = "payment-alb-sg"
  vpc_id = aws_vpc.payment_vpc.id
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]   # Internet HTTPS — ALB is the only public-facing resource
  }
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]   # HTTP — redirected to HTTPS by ALB listener rule
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]   # ALB needs to reach targets (pods on 8080)
  }
}

resource "aws_security_group" "payment_app" {
  name   = "payment-app-sg"
  vpc_id = aws_vpc.payment_vpc.id
  
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]   # ONLY from ALB — not 0.0.0.0/0
  }
  
  # Allow pods to call AWS internal services (Secrets Manager, CloudWatch, ECR, etc.)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Allow database connection (explicit outbound to RDS SG)
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }
}

resource "aws_security_group" "rds" {
  name   = "payment-rds-sg"
  vpc_id = aws_vpc.payment_vpc.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.payment_app.id]   # ONLY from app — never 0.0.0.0/0
  }
  
  # No general outbound from RDS — RDS doesn't initiate external connections
}
```

```hcl
# IAM policies — least privilege for payment service

# Payment service IAM policy (used with IRSA on EKS)
resource "aws_iam_policy" "payment_service" {
  name = "PaymentServicePolicy"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject"]
        Resource = "arn:aws:s3:::payment-documents-prod/*"
        # Only PutObject and GetObject — not DeleteObject, not ListBucket (different permission)
        # Only payment-documents-prod bucket — not all S3 buckets in the account
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:ap-south-1:123456789012:secret:payment/prod/*"
        # Only payment/prod/* secrets — not all secrets, not other services' secrets
      },
      {
        Effect = "Allow"
        Action = ["kms:Decrypt"]
        Resource = aws_kms_key.payment_secrets.arn
        # Required to decrypt KMS-encrypted secrets from Secrets Manager
        Condition = {
          "ForAnyValue:StringLike" = {
            "kms:ViaService" = "secretsmanager.ap-south-1.amazonaws.com"
            # Only allowed when called via Secrets Manager — not arbitrary KMS decrypt calls
          }
        }
      }
    ]
  })
}

# Explicit deny for sensitive operations — protects even if other policies accidentally Allow
resource "aws_iam_policy" "payment_guardrails" {
  name = "PaymentServiceGuardrails"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Deny"
        Action   = [
          "iam:CreateUser",
          "iam:CreateRole",
          "iam:AttachRolePolicy",
          "ec2:RunInstances",    # Can't spin up EC2 instances
          "s3:DeleteBucket"      # Can't delete S3 buckets
        ]
        Resource = "*"
        # Explicit deny ALWAYS wins — even if some assume-role grants these, this guardrail blocks
      }
    ]
  })
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain the difference between a public subnet and a private subnet."

**Hruday's answer:**
> A public subnet has a route to an Internet Gateway in its route table — resources in it can receive direct inbound connections from the internet if they also have a public IP address. A private subnet has no route to an Internet Gateway — resources in it are unreachable from the internet, period, regardless of what IP address they have.
>
> The standard production topology: Application Load Balancers go in public subnets because they need to receive HTTPS traffic from the internet. EKS worker nodes, Spring Boot pods, and RDS databases go in private subnets — there's no reason for anyone on the internet to initiate a connection directly to them. The ALB acts as the single entry point, and it forwards valid requests to the pods in private subnets through the security group chain.
>
> Private subnets still need to make outbound connections — EC2 and EKS nodes need to pull Docker images from ECR, call AWS APIs (CloudWatch, Secrets Manager), and sometimes call external third-party APIs. This outbound internet access goes through a NAT Gateway in a public subnet. The private resource initiates the connection → hits the NAT Gateway → NAT Gateway forwards with its own public IP → external service responds → NAT Gateway forwards back → private resource receives it. Inbound connections to the private resource initiated from outside are still blocked.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do Security Groups differ from NACLs, and when would you use each?"

**Hruday's answer:**
> Security Groups are stateful firewalls applied at the resource level (EC2 instance, RDS instance, Lambda ENI). Stateful means when an inbound connection is allowed, the corresponding return traffic is automatically permitted without an explicit outbound rule. Security Groups only have Allow rules — there are no Deny rules. The combination of all Allow rules across all Security Groups attached to a resource defines what traffic is permitted.
>
> NACLs (Network Access Control Lists) are stateless firewalls applied at the subnet level. Stateless means both directions of a connection must be explicitly allowed — if you allow inbound TCP on port 80, you must also allow outbound TCP on the ephemeral port range (1024-65535) for the return traffic. NACLs have both Allow and Deny rules, evaluated in order by rule number (lower number = higher priority).
>
> In practice: Security Groups handle 99% of network access control for application infrastructure. They're simpler to reason about, stateful so return traffic is automatic, and resource-scoped so the "inbound to this pod from ALB" rule is clear and targeted.
>
> NACLs are used for subnet-level blanket rules — typically to explicitly DENY specific IP ranges (blocking a known malicious IP range from reaching ANY resource in the subnet, not just specific services), or for compliance requirements that mandate a subnet-level network control layer in addition to instance-level security groups. NACLs are evaluated before Security Groups, so an NACL DENY blocks traffic before the Security Group even sees it.
>
> My recommendation: use Security Groups as your primary access control; add NACLs only when there's a specific compliance requirement or need for subnet-level deny rules.

---

### Q3 — Scenario
**Interviewer asks:** "Your Spring Boot service is running on an EKS pod in a private subnet. It needs to call the Stripe payment API (external HTTPS) and also read from Secrets Manager. Describe the network and IAM configuration."

**Hruday's answer:**
> Two separate concerns: network connectivity and IAM permissions.
>
> For network connectivity:
> The pod is in a private subnet with no direct internet route. To call Stripe (external), the traffic routes via the private subnet's route table: `0.0.0.0/0 → NAT Gateway`. The NAT Gateway (in a public subnet) forwards the request to Stripe with its elastic IP. The pod's security group outbound rules must allow TCP 443 to 0.0.0.0/0, otherwise the NAT Gateway route is irrelevant.
>
> For Secrets Manager: since Secrets Manager is an AWS service with a regional endpoint, I'd use a **VPC Endpoint** (Interface type) for Secrets Manager in the private subnets. Traffic to `secretsmanager.ap-south-1.amazonaws.com` routes through the VPC endpoint (private AWS network, no NAT Gateway, lower latency, no data transfer cost). The pod's security group needs outbound TCP 443 to the Secrets Manager VPC endpoint security group.
>
> For IAM permissions:
> The pod uses IRSA — the Spring Boot Deployment references a Kubernetes ServiceAccount annotated with an IAM Role ARN. That IAM Role has a policy with `secretsmanager:GetSecretValue` allowed on `arn:aws:secretsmanager:ap-south-1:*:secret:payment/prod/*`. The AWS SDK in the Spring Boot app calls `SecretsManagerClient.build()` without explicit credentials — it auto-detects the IRSA token injected by Kubernetes.
>
> No IAM permissions needed for Stripe — that's an outbound HTTPS call using Stripe's API key stored in Secrets Manager. IAM only controls what AWS API calls can be made, not outbound internet connections.

---

### Q4 — Trade-off
**Interviewer asks:** "What's the risk of overly permissive IAM policies, and how do you right-size them?"

**Hruday's answer:**
> Overly permissive IAM means a compromised application can cause disproportionate damage. A payment service with `s3:*` on `arn:aws:s3:::*` can delete all S3 objects in the account, exfiltrate all data across all buckets. A service with `iam:*` can create backdoor admin users. A service with `ec2:*` can provision hundreds of instances for crypto mining and leave you with a six-figure AWS bill overnight. Overly permissive IAM is an amplifier of every vulnerability in your code.
>
> Right-sizing approach: start by defining what the service actually needs. Payment service reads and writes to payment-documents bucket, reads from payment/prod/* secrets, and publishes metrics to CloudWatch. Write exactly that policy — nothing more. Use the AWS policy simulator to verify it grants what you intend.
>
> For existing services with unclear permissions, AWS IAM Access Analyzer generates a policy from the actual CloudTrail API call history. It shows "in the last 90 days, this role called GetObject on payment-documents-prod/* and GetSecretValue on payment/prod/db-password" — generate a tight policy from that real usage. This is the most practical approach for right-sizing existing roles.
>
> Enforce least privilege at the organisation level using Service Control Policies (SCPs) in AWS Organisations — SCPs are explicit denies that apply across the entire account regardless of individual IAM policies; use them to deny any IAM actions that no service should ever call in a production account (CreateUser, AttachAdminPolicy).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Security Groups are stateless like NACLs" | Confuse Security Group and NACL statefulness | Security Groups are STATEFUL — return traffic is automatic, no outbound rule needed for a return packet; NACLs are STATELESS — both directions need explicit rules; this distinction drives whether you need to open outbound ports on Security Groups (generally no for web services — the ALB-to-pod inbound allow is sufficient) |
| "Put RDS in a public subnet for developer access" | "We put the database in a public subnet so developers can connect from their laptops" | NEVER put databases in public subnets; for developer access, use an SSH bastion host (small EC2 in a public subnet) with its own security group that allows SSH from corporate IP range; developers SSH to the bastion, then connect to RDS from there; or use AWS Session Manager (zero open SSH ports) + RDS tunnel through SSM |
| "IAM roles are complex, use access keys instead" | "We create IAM users with access keys for our services — it's simpler" | Long-lived IAM access keys are the most common source of AWS credential leaks (committed to Git, logged in error messages, stored in config files); IAM roles produce temporary credentials (1-12 hours) via STS, auto-rotated, if leaked they expire quickly; for EKS use IRSA, for EC2 use instance profiles, for Lambda use execution roles — NEVER long-lived access keys for machine identities |
| "One VPC per environment is enough" | "We have one VPC for dev and prod with different subnets" | Separate AWS accounts per environment is the secure pattern (AWS Organisations); production and development sharing a single AWS account means a developer mistake in dev can affect production IAM resources, S3 data, and security group rules; at minimum, use separate VPCs; best practice is separate AWS accounts per environment with IAM cross-account roles for deployment |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I worked on services deployed in Azure where the equivalent concepts are Azure Virtual Networks (VNets), Network Security Groups (NSGs), and Azure Managed Identities. The mental model is identical: private subnets (Azure private VNet) for services, public subnets for load balancers, NSG rules chaining load balancer → app → database, and managed identity (equivalent of IAM Role + IRSA) for pod-level Azure resource access without stored credentials.
>
> The specific incident I've seen: a security audit flag because an Azure SQL database had no NSG restriction on who could reach its port — it relied entirely on password authentication. The recommendation was to add an NSG rule allowing port 1433 only from the application tier NSG, making network isolation the FIRST layer of defence and password authentication the SECOND. Defence in depth: the attacker would need to breach both the network isolation AND the credentials, rather than just the credentials.
>
> That principle — network perimeter as the first control, not the only control — is what I apply to VPC/Security Group design. Even if credentials leak, a correctly configured Security Group chain means only the authorized network path can use them."

---

## 8. Scale Evolution

**Single team, single service →** One VPC, 2 AZs, public/private/DB subnet per AZ, 3 security groups (ALB, app, database), one IAM role per service (via IRSA), managed node group for EKS. This pattern handles 99% of single-service setups.

**Multiple teams, 10+ services →** Separate VPC per environment (dev/staging/prod); VPC peering or AWS Transit Gateway for inter-VPC communication if needed; Security Groups reference groups (not CIDR ranges) for dynamic membership; IAM roles per service (not per application — one role for all instances of payment-service, not per pod); AWS Config rules enforcing "deny 0.0.0.0/0 on port 22/3306/5432" auto-remediation.

**Multi-account (AWS Organisations) enterprise →** Separate AWS account per environment; SCPs (Service Control Policies) at the Organisations level enforce guardrails across all accounts; centralised networking via Transit Gateway Hub & Spoke; shared services account for ECR, Route 53, centralised logging; different account for security tooling (CloudTrail aggregation, GuardDuty); IAM Identity Center (SSO) for human access — no long-term IAM users.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | PCI-DSS compliance requires cardholder data in a network segment with no direct internet access; Security Groups as first-layer controls; explicit DENY on any 0.0.0.0/0 database access; quarterly access review for all IAM roles | Know PCI-DSS network isolation requirements; demonstrate security group chain for payment data security |
| Swiggy / Meesho | Multi-region VPCs for geographic coverage; Transit Gateway for inter-region service mesh; IAM cross-account roles for centralised image registry (ECR) to multiple environment accounts | Multi-VPC networking; cross-account IAM patterns; VPC Lattice for service-to-service auth |
| Adobe / Microsoft | Strict IAM governance for enterprise SaaS; Service Control Policies preventing actions violating compliance; Private Link for partner integrations; zero-trust network model inside VPC | Advanced IAM: SCPs, permission boundaries, IAM Access Analyzer; PrivateLink patterns |
| SAP Labs | SAP AWS environments follow strict controls from ABAC (attribute-based access control) policies; VPC topology maps to SAP BTP network zones; familiar from Azure equivalent concepts | Map Azure VNet/NSG/Managed Identity → AWS VPC/Security Groups/IAM Role; apply familiar principles to AWS specifics |

---

## 10. Related Topics — What to Study Next

- **Topic 197 — EKS: Kubernetes on AWS** — EKS worker nodes live in VPC private subnets; IRSA bridges Kubernetes pod identity to VPC-scoped IAM roles; EKS security groups for pods (pod-level SG instead of node-level) is a newer feature for fine-grained pod network security; the EKS cluster API endpoint can be private (only accessible from within the VPC) for maximum security
- **Topic 195 — EC2, S3, RDS Core Services** — VPC is the foundational infrastructure where EC2 and RDS live; RDS requires a DB subnet group (collection of subnets in ≥2 AZs from different AZs); EC2 instance profiles are the IAM equivalents of IRSA for EC2; S3 bucket policies interact with IAM policies as a second layer of access control
- **Topic 196 — API Gateway + Lambda** — Lambda functions can run within a VPC (for RDS/ElastiCache access) or outside the VPC (default, for internet-accessible APIs); Lambda inside VPC has a higher cold start due to ENI creation; Lambda needs a VPC interface endpoint or NAT Gateway for outbound internet access when VPC-attached; Lambda execution role is an IAM Role
- **Topic 198 — CloudWatch Logs, Metrics, Alarms** — CloudWatch endpoints are AWS service endpoints reachable via VPC Interface Endpoints (avoids NAT Gateway charges for log publishing); CloudTrail (sibling to CloudWatch) logs all IAM API calls — essential for auditing who did what in your AWS account; GuardDuty uses CloudTrail + VPC flow logs to detect anomalous API calls (potential IAM compromise)

---

*Part 11 · VPC, Security Groups, and IAM Basics · Full Stack Interview Guide · Hruday D · 2026*
