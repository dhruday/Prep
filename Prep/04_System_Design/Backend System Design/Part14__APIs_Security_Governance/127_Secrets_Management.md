# 127. Secrets Management

## 📌 Overview

**Secrets**: Sensitive data that must be protected (passwords, API keys, certificates, encryption keys)

**Why needed**:
- Prevent unauthorized access
- Compliance (SOC 2, ISO 27001, PCI DSS)
- Auditability (who accessed what, when)
- Rotation (periodic key changes)

**❌ Don't**:
```python
# Hardcoded in code
API_KEY = "sk_live_1234567890abcdef"  ❌

# Committed to Git
config.json: {"password": "secret123"}  ❌

# Stored in plaintext
database: api_keys table with plaintext keys  ❌
```

---

## 🎯 12-Factor App: Configuration in Environment

### **Environment Variables**

```python
import os

# Load from environment
DATABASE_URL = os.environ['DATABASE_URL']
API_KEY = os.environ['API_KEY']
SECRET_KEY = os.environ['SECRET_KEY']
```

**Set environment variables**:

```bash
# Linux/macOS
export DATABASE_URL="postgresql://user:pass@localhost/db"
export API_KEY="sk_live_abc123"

# Windows
set DATABASE_URL=postgresql://user:pass@localhost/db
set API_KEY=sk_live_abc123
```

**Docker**:

```yaml
# docker-compose.yml
version: '3'
services:
  app:
    image: myapp
    environment:
      DATABASE_URL: postgresql://user:pass@localhost/db
      API_KEY: sk_live_abc123
```

**Kubernetes**:

```yaml
# deployment.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    env:
    - name: DATABASE_URL
      value: postgresql://user:pass@localhost/db
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: api-credentials
          key: api-key
```

---

### **.env Files** (Development Only)

```bash
# .env file
DATABASE_URL=postgresql://localhost/dev_db
API_KEY=sk_test_abc123
SECRET_KEY=dev-secret-key
```

**Load with python-dotenv**:

```python
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

# Access variables
DATABASE_URL = os.getenv('DATABASE_URL')
API_KEY = os.getenv('API_KEY')
```

**⚠️ NEVER commit .env to Git**:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

---

## 🎯 AWS Secrets Manager

**Purpose**: Centralized secrets storage with rotation, auditing, access control

### **Store Secret**

```python
import boto3
import json

secrets = boto3.client('secretsmanager', region_name='us-east-1')

# Create secret
secrets.create_secret(
    Name='prod/database/credentials',
    Description='PostgreSQL production database credentials',
    SecretString=json.dumps({
        'username': 'admin',
        'password': 'SuperSecretPass123!',
        'host': 'db.example.com',
        'port': 5432,
        'database': 'prod_db'
    })
)
```

### **Retrieve Secret**

```python
def get_database_credentials():
    secret_name = 'prod/database/credentials'
    
    try:
        response = secrets.get_secret_value(SecretId=secret_name)
    except Exception as e:
        raise Exception(f'Error retrieving secret: {e}')
    
    # Parse JSON
    secret = json.loads(response['SecretString'])
    return secret

# Usage
creds = get_database_credentials()
DATABASE_URL = f"postgresql://{creds['username']}:{creds['password']}@{creds['host']}/{creds['database']}"
```

### **Automatic Rotation**

**Lambda function** rotates password:

```python
import boto3
import psycopg2

def lambda_handler(event, context):
    # Get current secret
    secrets = boto3.client('secretsmanager')
    response = secrets.get_secret_value(SecretId='prod/database/credentials')
    current_secret = json.loads(response['SecretString'])
    
    # Generate new password
    new_password = generate_random_password()
    
    # Update database password
    conn = psycopg2.connect(
        host=current_secret['host'],
        user=current_secret['username'],
        password=current_secret['password'],
        database=current_secret['database']
    )
    cursor = conn.cursor()
    cursor.execute(f"ALTER USER {current_secret['username']} PASSWORD '{new_password}'")
    conn.commit()
    
    # Update secret
    new_secret = current_secret.copy()
    new_secret['password'] = new_password
    
    secrets.put_secret_value(
        SecretId='prod/database/credentials',
        SecretString=json.dumps(new_secret)
    )
    
    return {'status': 'success'}

def generate_random_password():
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return ''.join(secrets.choice(alphabet) for _ in range(32))
```

**Enable automatic rotation**:

```python
# Rotate every 30 days
secrets.rotate_secret(
    SecretId='prod/database/credentials',
    RotationLambdaARN='arn:aws:lambda:us-east-1:123456789012:function:rotate-secret',
    RotationRules={'AutomaticallyAfterDays': 30}
)
```

---

## 🎯 HashiCorp Vault

**Purpose**: Centralized secrets management with dynamic secrets

### **Store/Retrieve Secrets**

```python
import hvac

# Connect to Vault
client = hvac.Client(url='https://vault.example.com:8200')

# Authenticate (token, AppRole, AWS IAM, etc.)
client.token = 'vault-token'

# Store secret
client.secrets.kv.v2.create_or_update_secret(
    path='database/prod',
    secret={
        'username': 'admin',
        'password': 'SuperSecretPass123!'
    }
)

# Retrieve secret
response = client.secrets.kv.v2.read_secret_version(path='database/prod')
secret = response['data']['data']
username = secret['username']
password = secret['password']
```

### **Dynamic Secrets** ⭐

**Purpose**: Generate short-lived credentials on-demand

**Example: PostgreSQL credentials**

```python
# Configure PostgreSQL database
client.secrets.database.configure(
    name='postgresql',
    plugin_name='postgresql-database-plugin',
    allowed_roles=['readonly', 'readwrite'],
    connection_url='postgresql://{{username}}:{{password}}@localhost:5432/mydb',
    username='vault_admin',
    password='vault_admin_password'
)

# Create role (generates credentials with specific permissions)
client.secrets.database.create_role(
    name='readonly',
    db_name='postgresql',
    creation_statements=[
        "CREATE USER '{{name}}' WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
        "GRANT SELECT ON ALL TABLES IN SCHEMA public TO '{{name}}';"
    ],
    default_ttl='1h',  # Credentials expire after 1 hour
    max_ttl='24h'
)

# Request credentials
response = client.secrets.database.generate_credentials(name='readonly')
username = response['data']['username']  # vault-token-abc123
password = response['data']['password']  # generated-password
lease_duration = response['lease_duration']  # 3600 seconds

# Use credentials (expires after 1 hour) ✓
conn = psycopg2.connect(
    host='localhost',
    user=username,
    password=password,
    database='mydb'
)

# After 1 hour, Vault automatically revokes user ✓
```

**Benefits**:
- **Short-lived**: Credentials expire automatically (reduced blast radius)
- **Audit trail**: All credential access logged
- **No rotation needed**: New credentials each time

---

### **AppRole Authentication** (Applications)

```python
# 1. Configure AppRole
client.sys.enable_auth_method(method_type='approle')

client.auth.approle.create_or_update_approle(
    role_name='myapp',
    token_policies=['database-read'],
    token_ttl='1h',
    token_max_ttl='24h'
)

# 2. Get Role ID (stored in app config)
role_id = client.auth.approle.read_role_id(role_name='myapp')['data']['role_id']

# 3. Generate Secret ID (delivered securely to app at deploy time)
secret_id = client.auth.approle.generate_secret_id(role_name='myapp')['data']['secret_id']

# 4. Application authenticates with Role ID + Secret ID
client = hvac.Client(url='https://vault.example.com:8200')
client.auth.approle.login(role_id=role_id, secret_id=secret_id)

# 5. Access secrets
response = client.secrets.kv.v2.read_secret_version(path='database/prod')
```

---

## 🎯 Azure Key Vault

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# Connect to Key Vault
credential = DefaultAzureCredential()
client = SecretClient(vault_url='https://mykeyvault.vault.azure.net/', credential=credential)

# Store secret
client.set_secret('database-password', 'SuperSecretPass123!')

# Retrieve secret
secret = client.get_secret('database-password')
password = secret.value
```

---

## 🎯 Google Secret Manager

```python
from google.cloud import secretmanager

# Create client
client = secretmanager.SecretManagerServiceClient()

# Create secret
parent = 'projects/my-project'
secret = client.create_secret(
    request={
        'parent': parent,
        'secret_id': 'database-password',
        'secret': {'replication': {'automatic': {}}}
    }
)

# Add secret version
payload = 'SuperSecretPass123!'.encode('UTF-8')
client.add_secret_version(
    request={
        'parent': secret.name,
        'payload': {'data': payload}
    }
)

# Access secret
name = f'projects/my-project/secrets/database-password/versions/latest'
response = client.access_secret_version(request={'name': name})
password = response.payload.data.decode('UTF-8')
```

---

## 🎯 Kubernetes Secrets

### **Create Secret**

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
type: Opaque
data:
  username: YWRtaW4=  # base64 encoded "admin"
  password: c3VwZXJzZWNyZXQ=  # base64 encoded "supersecret"
```

```bash
# Or create from command line
kubectl create secret generic database-credentials \
  --from-literal=username=admin \
  --from-literal=password=supersecret
```

### **Use Secret in Pod**

**As environment variables**:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    env:
    - name: DATABASE_USERNAME
      valueFrom:
        secretKeyRef:
          name: database-credentials
          key: username
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: database-credentials
          key: password
```

**As mounted volume**:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    volumeMounts:
    - name: secrets
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: secrets
    secret:
      secretName: database-credentials

# Secrets available as files:
# /etc/secrets/username
# /etc/secrets/password
```

**⚠️ Kubernetes Secrets are base64 encoded, NOT encrypted**

**Use External Secrets Operator** (syncs from Vault, AWS Secrets Manager):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-credentials
  data:
  - secretKey: username
    remoteRef:
      key: database/prod
      property: username
  - secretKey: password
    remoteRef:
      key: database/prod
      property: password
```

---

## 🎯 Rotation Policies

### **Why Rotate?**
- Limit damage if secret compromised
- Compliance requirements (PCI DSS, SOC 2)
- Best practice (quarterly, annual)

### **Rotation Strategies**

#### **1. Manual Rotation**

```python
# 1. Generate new secret
new_api_key = generate_api_key()

# 2. Update application with new key
# (deploy new version with updated config)

# 3. Test new key works

# 4. Invalidate old key
db.revoke_api_key(old_api_key)
```

#### **2. Automatic Rotation** (AWS Secrets Manager)

```python
# Lambda function rotates secret every 30 days
# Application always fetches latest from Secrets Manager

def get_database_password():
    # Always retrieves current version
    response = secrets.get_secret_value(SecretId='database-password')
    return json.loads(response['SecretString'])['password']
```

#### **3. Dual-Write Period** (Zero-Downtime)

```python
# Phase 1: Add new key (both keys valid)
old_key = 'key_v1'
new_key = 'key_v2'
valid_keys = [old_key, new_key]

# Phase 2: Deploy app with new key (some instances use old, some use new)
API_KEY = new_key

# Phase 3: Wait for all instances updated (monitor logs)

# Phase 4: Revoke old key
valid_keys = [new_key]
```

---

## 🎯 Least Privilege

### **Principle**: Grant minimal permissions needed

**Example: IAM Policy** (AWS Secrets Manager)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/database/*"
    }
  ]
}
```

**✓ Can**: Retrieve secrets in `prod/database/*`

**❌ Can't**: Create, delete, or list secrets

---

## 🎯 Audit Logging

### **AWS CloudTrail**

```python
# All Secrets Manager API calls logged to CloudTrail

# Example log entry:
{
  "eventName": "GetSecretValue",
  "eventTime": "2024-01-15T10:00:00Z",
  "userIdentity": {
    "principalId": "AIDAI...",
    "arn": "arn:aws:iam::123456789012:user/john"
  },
  "requestParameters": {
    "secretId": "prod/database/credentials"
  },
  "sourceIPAddress": "203.0.113.1"
}
```

**Alert on suspicious activity**:
```python
# CloudWatch Alarm
# Alert if >100 GetSecretValue calls in 5 minutes from single IP
```

### **Vault Audit Log**

```bash
# Enable audit logging
vault audit enable file file_path=/var/log/vault/audit.log

# Log entry (JSON)
{
  "time": "2024-01-15T10:00:00Z",
  "type": "request",
  "auth": {
    "client_token": "hmac-sha256:abc123...",
    "display_name": "myapp"
  },
  "request": {
    "operation": "read",
    "path": "secret/database/prod"
  },
  "remote_address": "203.0.113.1"
}
```

---

## 🎯 Real-World Examples

### **1. AWS Secrets Manager + Lambda**

```python
import boto3
import json

secrets = boto3.client('secretsmanager')

def lambda_handler(event, context):
    # Retrieve database credentials
    response = secrets.get_secret_value(SecretId='prod/database')
    creds = json.loads(response['SecretString'])
    
    # Connect to database
    conn = psycopg2.connect(
        host=creds['host'],
        user=creds['username'],
        password=creds['password'],
        database=creds['database']
    )
    
    # Execute query
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users')
    return cursor.fetchall()
```

### **2. Vault Dynamic Secrets + Application**

```python
import hvac
import psycopg2

# Authenticate with Vault
client = hvac.Client(url='https://vault.example.com:8200')
client.auth.approle.login(role_id=ROLE_ID, secret_id=SECRET_ID)

# Request short-lived database credentials
response = client.secrets.database.generate_credentials(name='readonly')
db_username = response['data']['username']
db_password = response['data']['password']
lease_duration = response['lease_duration']  # 3600 seconds

# Connect to database (credentials expire after 1 hour)
conn = psycopg2.connect(
    host='localhost',
    user=db_username,
    password=db_password,
    database='mydb'
)

# Execute queries
# After 1 hour, credentials automatically revoked ✓
```

### **3. Kubernetes + External Secrets Operator**

```yaml
# Sync secrets from AWS Secrets Manager to Kubernetes

# SecretStore (connection to AWS)
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets

---
# ExternalSecret (sync specific secret)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 1h  # Sync every hour
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-credentials  # K8s Secret name
  data:
  - secretKey: username
    remoteRef:
      key: prod/database/credentials
      property: username
  - secretKey: password
    remoteRef:
      key: prod/database/credentials
      property: password
```

---

## ✅ Best Practices

1. **Never hardcode secrets** in code or commit to Git
2. **Environment variables** for development (.env file in .gitignore)
3. **Secrets Manager** for production (AWS, Vault, Azure Key Vault)
4. **Dynamic secrets** when possible (Vault, short-lived credentials)
5. **Rotate regularly** (automatic rotation every 30-90 days)
6. **Least privilege** (minimal IAM permissions)
7. **Audit logging** (CloudTrail, Vault audit log)
8. **Encrypt at rest** (KMS encryption for Secrets Manager)
9. **Access control** (MFA for sensitive secrets)
10. **Emergency rotation** (immediate rotation if compromised)

---

## 🎓 Interview Tips

**Q: "How do you manage secrets in production?"**

A: "Use centralized secrets management:

**AWS Secrets Manager**:
- Store secrets encrypted (KMS)
- Automatic rotation (Lambda function)
- Audit logging (CloudTrail)
- IAM access control

**HashiCorp Vault**:
- Dynamic secrets (short-lived credentials)
- Audit logging
- Multiple auth methods (AppRole, AWS IAM)

**Best practices**:
- Never hardcode or commit to Git
- Use environment variables (12-factor app)
- Rotate regularly (30-90 days)
- Least privilege (minimal permissions)
- Audit all access (who, what, when)

**Example**:
```python
# Retrieve from Secrets Manager
secrets = boto3.client('secretsmanager')
response = secrets.get_secret_value(SecretId='prod/database')
creds = json.loads(response['SecretString'])
```

Real-world: Netflix uses Vault, AWS Lambda uses Secrets Manager"

**Q: "What are dynamic secrets and why use them?"**

A: "Dynamic secrets: Generated on-demand, short-lived, automatically revoked

**How Vault works**:
1. App requests database credentials
2. Vault generates PostgreSQL user with TTL (1 hour)
3. App uses credentials
4. After 1 hour, Vault automatically drops user ✓

**Benefits**:
- **Short-lived**: Reduced blast radius if compromised
- **Unique**: Each request gets different credentials
- **No rotation needed**: New credentials each time
- **Audit trail**: Know exactly who accessed what, when

**Use cases**:
- Database credentials (PostgreSQL, MySQL, MongoDB)
- Cloud credentials (AWS IAM, GCP service accounts)
- SSH certificates (short-lived SSH access)

**Trade-off**: More complex than static secrets (need Vault infrastructure)

Real-world: Vault dynamic AWS credentials TTL 15 minutes for CI/CD pipelines"

**Q: "How do you rotate secrets without downtime?"**

A: "**Dual-write period strategy**:

**Phase 1**: Create new secret (keep old valid)
```python
valid_keys = ['old_key', 'new_key']  # Both work
```

**Phase 2**: Deploy app with new key
- Rolling deployment (gradual rollout)
- Some instances use old, some use new
- Both keys valid ✓

**Phase 3**: Monitor logs (wait for all instances updated)
```python
# Check CloudWatch metrics
# Ensure 0 requests using old key
```

**Phase 4**: Revoke old key
```python
valid_keys = ['new_key']  # Old key invalid
```

**Automatic rotation** (AWS Secrets Manager):
- Lambda rotates password every 30 days
- Apps always fetch latest version
- Zero manual work

Real-world: AWS RDS automatic rotation creates new password, updates both RDS and Secrets Manager atomically"

---

## 📚 Summary

**Secrets Management**: Protect sensitive data (passwords, API keys, certificates)

**Solutions**: AWS Secrets Manager (automatic rotation), HashiCorp Vault (dynamic secrets), Azure Key Vault, Google Secret Manager

**Dynamic Secrets**: Short-lived credentials generated on-demand (Vault)

**Best Practices**: Never hardcode, use Secrets Manager, rotate regularly, least privilege, audit logging

**Rotation**: Automatic (AWS Lambda), Dual-write period (zero-downtime)

**Kubernetes**: External Secrets Operator (sync from Vault/AWS) 🚀

