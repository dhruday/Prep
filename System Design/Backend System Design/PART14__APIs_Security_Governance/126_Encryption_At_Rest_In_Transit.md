# 126. Encryption (At Rest & In Transit)

## 📌 Overview

**Encryption at rest**: Data encrypted on disk (databases, file storage)

**Encryption in transit**: Data encrypted during transmission (HTTPS, TLS)

**Why needed**:
- Confidentiality (prevent unauthorized access)
- Compliance (GDPR, HIPAA, PCI DSS)
- Data breach mitigation (stolen data is useless without decryption key)

---

## 🎯 Encryption In Transit

### **Purpose**: Protect data during transmission (prevent MITM attacks)

### **TLS/SSL (HTTPS)**

**TLS 1.3** (latest version):
- Improved security (removed weak ciphers)
- Faster handshake (1-RTT)
- Forward secrecy (past sessions can't be decrypted)

**Handshake process**:

```
Client                                Server
  │                                     │
  │─── ClientHello ──────────────────→ │
  │                                     │
  │←── ServerHello + Certificate ───── │
  │     (Public Key)                    │
  │                                     │
  │─── Key Exchange ─────────────────→ │
  │     (Encrypted with server pubkey)  │
  │                                     │
  │←────────────────────────────────── │
  │     ✓ Encrypted Communication       │
  │                                     │
```

**Flask with TLS**:

```python
if __name__ == '__main__':
    # Self-signed certificate (development)
    app.run(ssl_context=('cert.pem', 'key.pem'))
    
    # Or use adhoc (generates temporary cert)
    app.run(ssl_context='adhoc')
```

**Generate self-signed certificate**:

```bash
# OpenSSL
openssl req -x509 -newkey rsa:4096 -nodes \
    -keyout key.pem -out cert.pem -days 365 \
    -subj "/CN=localhost"
```

**Production: Use reverse proxy (Nginx, Caddy)**

```nginx
# Nginx with Let's Encrypt
server {
    listen 443 ssl http2;
    server_name api.example.com;
    
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    
    # TLS 1.3 only
    ssl_protocols TLSv1.3;
    
    # Strong ciphers
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384';
    
    # HSTS (force HTTPS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}
```

---

### **Certificate Management**

**Let's Encrypt** (Free, automated):

```bash
# Certbot
sudo certbot certonly --standalone -d api.example.com

# Certificates stored in:
# /etc/letsencrypt/live/api.example.com/fullchain.pem
# /etc/letsencrypt/live/api.example.com/privkey.pem

# Auto-renewal (cron)
0 0 * * * certbot renew --quiet
```

**AWS ACM** (AWS Certificate Manager):

```python
# Managed certificates for Load Balancer, CloudFront
# Auto-renewal, free

# Request certificate
aws acm request-certificate \
    --domain-name api.example.com \
    --validation-method DNS
```

**Certificate chain**:

```
Root CA (trusted by browser)
  ├── Intermediate CA
  │     └── Your Certificate
```

---

### **Mutual TLS (mTLS)**

**Purpose**: Both client and server authenticate with certificates

**Use case**: Server-to-server communication

```python
import requests

# Client presents certificate
response = requests.get('https://api.example.com/data',
                       cert=('client-cert.pem', 'client-key.pem'),
                       verify='server-ca.pem')
```

**Server validates client certificate**:

```nginx
server {
    listen 443 ssl;
    
    ssl_certificate /path/to/server-cert.pem;
    ssl_certificate_key /path/to/server-key.pem;
    
    # Require client certificate
    ssl_client_certificate /path/to/ca.pem;
    ssl_verify_client on;
}
```

---

## 🎯 Encryption At Rest

### **Purpose**: Protect data stored on disk

### **Symmetric Encryption (AES-256)**

**AES-256**: Advanced Encryption Standard with 256-bit key

**Python implementation**:

```python
from cryptography.fernet import Fernet

# Generate key (store securely!)
key = Fernet.generate_key()
# Example: b'vQd7xT5gE8...'

cipher = Fernet(key)

# Encrypt
plaintext = b"Sensitive data"
ciphertext = cipher.encrypt(plaintext)
# Example: b'gAAAAABf...'

# Decrypt
decrypted = cipher.decrypt(ciphertext)
# Result: b"Sensitive data"
```

**Store key securely** (NOT in code):

```python
import os

# Environment variable
key = os.environ['ENCRYPTION_KEY'].encode()

# Or: AWS Secrets Manager, HashiCorp Vault (see next topic)
```

---

### **Database Encryption**

#### **1. Full Database Encryption (TDE)**

**PostgreSQL** (pgcrypto extension):

```sql
-- Enable extension
CREATE EXTENSION pgcrypto;

-- Encrypt column
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    ssn BYTEA  -- Encrypted field
);

-- Insert encrypted data
INSERT INTO users (email, ssn)
VALUES ('user@example.com', pgp_sym_encrypt('123-45-6789', 'encryption_key'));

-- Query encrypted data
SELECT email, pgp_sym_decrypt(ssn, 'encryption_key') AS ssn
FROM users;
```

**MySQL** (TDE - Transparent Data Encryption):

```sql
-- Enable TDE (encrypts entire tablespace)
ALTER INSTANCE ROTATE INNODB MASTER KEY;

CREATE TABLESPACE secure_space ENCRYPTION='Y';

CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255),
    ssn VARCHAR(20)
) TABLESPACE=secure_space;
```

**MongoDB** (Encrypted Storage Engine):

```javascript
// Enable encryption
mongod --enableEncryption \
       --encryptionKeyFile /path/to/keyfile

// All data encrypted at rest
```

#### **2. Column-Level Encryption**

**SQLAlchemy with Fernet**:

```python
from sqlalchemy import Column, String, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from cryptography.fernet import Fernet

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255))
    ssn_encrypted = Column(LargeBinary)  # Encrypted SSN
    
    @property
    def ssn(self):
        # Decrypt when accessed
        cipher = Fernet(get_encryption_key())
        return cipher.decrypt(self.ssn_encrypted).decode()
    
    @ssn.setter
    def ssn(self, value):
        # Encrypt when set
        cipher = Fernet(get_encryption_key())
        self.ssn_encrypted = cipher.encrypt(value.encode())

# Usage
user = User()
user.email = 'user@example.com'
user.ssn = '123-45-6789'  # Automatically encrypted
db.session.add(user)
db.session.commit()

# Retrieve
user = User.query.first()
print(user.ssn)  # Automatically decrypted
```

---

### **File Storage Encryption**

#### **1. AWS S3 Server-Side Encryption**

**SSE-S3** (AWS-managed keys):

```python
import boto3

s3 = boto3.client('s3')

# Upload with encryption
s3.put_object(
    Bucket='my-bucket',
    Key='file.txt',
    Body=b'Sensitive data',
    ServerSideEncryption='AES256'  # SSE-S3
)
```

**SSE-KMS** (Customer-managed keys):

```python
# Upload with KMS key
s3.put_object(
    Bucket='my-bucket',
    Key='file.txt',
    Body=b'Sensitive data',
    ServerSideEncryption='aws:kms',
    SSEKMSKeyId='arn:aws:kms:us-east-1:123456789012:key/abc-123'
)
```

**SSE-C** (Customer-provided keys):

```python
import hashlib
import base64

# Your encryption key
key = b'your-32-byte-encryption-key!'
key_md5 = base64.b64encode(hashlib.md5(key).digest()).decode()

# Upload
s3.put_object(
    Bucket='my-bucket',
    Key='file.txt',
    Body=b'Sensitive data',
    SSECustomerAlgorithm='AES256',
    SSECustomerKey=base64.b64encode(key).decode(),
    SSECustomerKeyMD5=key_md5
)

# Download (must provide same key)
response = s3.get_object(
    Bucket='my-bucket',
    Key='file.txt',
    SSECustomerAlgorithm='AES256',
    SSECustomerKey=base64.b64encode(key).decode(),
    SSECustomerKeyMD5=key_md5
)
```

#### **2. Client-Side Encryption**

```python
from cryptography.fernet import Fernet

# Encrypt before uploading
cipher = Fernet(encryption_key)
plaintext = b'Sensitive data'
ciphertext = cipher.encrypt(plaintext)

# Upload encrypted data
s3.put_object(Bucket='my-bucket', Key='file.txt', Body=ciphertext)

# Download and decrypt
response = s3.get_object(Bucket='my-bucket', Key='file.txt')
ciphertext = response['Body'].read()
plaintext = cipher.decrypt(ciphertext)
```

---

### **Full Disk Encryption**

**Linux** (LUKS - dm-crypt):

```bash
# Encrypt partition
sudo cryptsetup luksFormat /dev/sdb1

# Open encrypted partition
sudo cryptsetup luksOpen /dev/sdb1 encrypted_partition

# Mount
sudo mount /dev/mapper/encrypted_partition /mnt/secure
```

**Windows**: BitLocker

**macOS**: FileVault

---

## 🎯 Key Management

### **Challenge**: Where to store encryption keys?

**❌ Don't**:
- Hardcode in code
- Store in Git repository
- Store in same database as encrypted data

**✓ Do**:
- Use Key Management Service (KMS)
- Environment variables (for less sensitive)
- Hardware Security Module (HSM)

---

### **AWS KMS (Key Management Service)**

**Envelope Encryption**: Data key encrypts data, master key encrypts data key

```python
import boto3
import base64

kms = boto3.client('kms')

# 1. Generate data key
response = kms.generate_data_key(
    KeyId='arn:aws:kms:us-east-1:123456789012:key/abc-123',
    KeySpec='AES_256'
)

plaintext_key = response['Plaintext']
encrypted_key = response['CiphertextBlob']

# 2. Encrypt data with plaintext key
from cryptography.fernet import Fernet
cipher = Fernet(base64.urlsafe_b64encode(plaintext_key))
ciphertext_data = cipher.encrypt(b'Sensitive data')

# 3. Store encrypted data + encrypted key
db.store({
    'data': ciphertext_data,
    'encrypted_key': encrypted_key
})

# 4. Decrypt (later)
# Decrypt data key
response = kms.decrypt(CiphertextBlob=encrypted_key)
plaintext_key = response['Plaintext']

# Decrypt data
cipher = Fernet(base64.urlsafe_b64encode(plaintext_key))
plaintext_data = cipher.decrypt(ciphertext_data)
```

**Benefits**:
- Master key never leaves KMS (secure)
- Audit trail (CloudTrail logs)
- Key rotation (automatic)
- Access control (IAM policies)

---

### **HashiCorp Vault**

```python
import hvac

# Connect to Vault
client = hvac.Client(url='https://vault.example.com:8200')
client.token = 'vault-token'

# Store secret
client.secrets.kv.v2.create_or_update_secret(
    path='database/config',
    secret={
        'username': 'admin',
        'password': 'secret123',
        'encryption_key': 'encryption-key-value'
    }
)

# Retrieve secret
response = client.secrets.kv.v2.read_secret_version(path='database/config')
encryption_key = response['data']['data']['encryption_key']
```

---

### **Key Rotation**

**Why**: Limit damage if key compromised

**Strategy**:

```python
# Store key version with encrypted data
encrypted_data = {
    'ciphertext': b'...',
    'key_version': 2
}

# Decrypt with correct key version
def decrypt(encrypted_data):
    key_version = encrypted_data['key_version']
    key = get_key_by_version(key_version)
    cipher = Fernet(key)
    return cipher.decrypt(encrypted_data['ciphertext'])

# Re-encrypt with new key
def rotate_encryption():
    old_key = get_key_by_version(1)
    new_key = get_key_by_version(2)
    
    for record in db.get_all_encrypted_records():
        # Decrypt with old key
        old_cipher = Fernet(old_key)
        plaintext = old_cipher.decrypt(record['ciphertext'])
        
        # Encrypt with new key
        new_cipher = Fernet(new_key)
        new_ciphertext = new_cipher.encrypt(plaintext)
        
        # Update database
        db.update(record['id'], {
            'ciphertext': new_ciphertext,
            'key_version': 2
        })
```

---

## 🎯 End-to-End Encryption (E2EE)

**Purpose**: Only sender and receiver can decrypt (server can't read)

**Use case**: Messaging (Signal, WhatsApp), file sharing

**Signal Protocol** (simplified):

```python
# Alice and Bob exchange public keys
alice_private_key, alice_public_key = generate_key_pair()
bob_private_key, bob_public_key = generate_key_pair()

# Alice encrypts message to Bob
shared_secret = derive_shared_secret(alice_private_key, bob_public_key)
ciphertext = encrypt(message, shared_secret)

# Server stores ciphertext (can't decrypt) ✓

# Bob decrypts message
shared_secret = derive_shared_secret(bob_private_key, alice_public_key)
plaintext = decrypt(ciphertext, shared_secret)
```

**Python implementation** (simplified):

```python
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.fernet import Fernet
import base64

# Generate key pairs
def generate_key_pair():
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    return private_key, public_key

# Derive shared secret (ECDH)
def derive_shared_secret(private_key, peer_public_key):
    shared_key = private_key.exchange(ec.ECDH(), peer_public_key)
    
    # Derive symmetric key
    derived_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'handshake data'
    ).derive(shared_key)
    
    return base64.urlsafe_b64encode(derived_key)

# Alice encrypts
alice_private, alice_public = generate_key_pair()
bob_private, bob_public = generate_key_pair()

alice_shared = derive_shared_secret(alice_private, bob_public)
cipher = Fernet(alice_shared)
ciphertext = cipher.encrypt(b'Hello Bob!')

# Bob decrypts
bob_shared = derive_shared_secret(bob_private, alice_public)
cipher = Fernet(bob_shared)
plaintext = cipher.decrypt(ciphertext)
# Result: b'Hello Bob!'
```

---

## 🎯 Real-World Examples

### **1. AWS S3 Encryption**

**Default encryption** (bucket-level):

```python
# Enable default encryption
s3.put_bucket_encryption(
    Bucket='my-bucket',
    ServerSideEncryptionConfiguration={
        'Rules': [{
            'ApplyServerSideEncryptionByDefault': {
                'SSEAlgorithm': 'AES256'  # or 'aws:kms'
            }
        }]
    }
)

# All objects automatically encrypted ✓
```

### **2. RDS Encrypted At Rest**

```python
# Enable encryption (must be done at creation)
rds.create_db_instance(
    DBInstanceIdentifier='mydb',
    DBInstanceClass='db.t3.micro',
    Engine='postgres',
    MasterUsername='admin',
    MasterUserPassword='password123',
    StorageEncrypted=True,  # Encrypt at rest
    KmsKeyId='arn:aws:kms:us-east-1:123456789012:key/abc-123'
)
```

### **3. WhatsApp (End-to-End Encryption)**

- Uses Signal Protocol
- Messages encrypted on sender's device
- Server only stores ciphertext
- Only recipient can decrypt

---

## ✅ Best Practices

### **Encryption In Transit**:
1. **TLS 1.3** only (disable older versions)
2. **HSTS header** (force HTTPS)
3. **Certificate management** (Let's Encrypt, auto-renewal)
4. **mTLS** for server-to-server

### **Encryption At Rest**:
1. **AES-256** (industry standard)
2. **Database encryption** (TDE or column-level)
3. **S3 encryption** (SSE-S3 or SSE-KMS)
4. **Full disk encryption** (LUKS, BitLocker)

### **Key Management**:
1. **Never hardcode keys** (use KMS, Vault)
2. **Envelope encryption** (separate data key + master key)
3. **Key rotation** (periodic, automatic)
4. **Least privilege** (IAM policies for key access)
5. **Audit logging** (CloudTrail, Vault audit)

---

## 🎓 Interview Tips

**Q: "What's the difference between encryption at rest and in transit?"**

A: "**Encryption at rest**: Data encrypted on disk (storage, databases)
- Example: S3 objects encrypted with AES-256
- Protects: Stolen hard drives, unauthorized file access

**Encryption in transit**: Data encrypted during transmission (network)
- Example: HTTPS (TLS/SSL) encrypts data between client and server
- Protects: Man-in-the-middle attacks, network sniffing

**Best practice**: Use both!
- TLS 1.3 for transit
- AES-256 for rest (S3, RDS, disk encryption)"

**Q: "How does AWS KMS work?"**

A: "AWS KMS is a managed key management service:

**Envelope encryption**:
1. **Data key** encrypts actual data (AES-256)
2. **Master key** (in KMS) encrypts data key
3. Store encrypted data + encrypted data key

**Benefits**:
- Master key never leaves KMS (HSM-backed)
- Audit trail (CloudTrail logs all key usage)
- Automatic key rotation
- Access control (IAM policies)

**Example**:
```python
# Generate data key
kms.generate_data_key(KeyId='master-key-arn')
# Returns: plaintext_key + encrypted_key

# Encrypt data with plaintext_key
ciphertext = encrypt(data, plaintext_key)

# Store encrypted data + encrypted_key
# To decrypt: call kms.decrypt(encrypted_key) to get plaintext_key
```

Real-world: S3, RDS, Lambda environment variables use KMS"

**Q: "What is end-to-end encryption?"**

A: "End-to-end encryption (E2EE): Only sender and receiver can decrypt, server can't read

**How it works**:
1. Alice and Bob exchange **public keys**
2. Alice encrypts message with **Bob's public key**
3. Server stores **ciphertext** (can't decrypt ✓)
4. Bob decrypts with **his private key**

**Use cases**:
- Messaging: Signal, WhatsApp, iMessage
- File sharing: Tresorit, SpiderOak
- Video calls: FaceTime, Signal calls

**Benefits**:
- Server compromise doesn't expose data
- Compliance (GDPR, HIPAA)
- User trust

**Trade-offs**:
- Can't search/index server-side
- Lost key = lost data
- Harder to implement"

---

## 📚 Summary

**Encryption In Transit**: TLS 1.3 (HTTPS), mTLS (server-to-server), HSTS header

**Encryption At Rest**: AES-256 (database, S3, disk), Column-level vs Full database

**Key Management**: AWS KMS (envelope encryption), HashiCorp Vault, Never hardcode keys

**Envelope Encryption**: Data key encrypts data, Master key encrypts data key

**End-to-End**: Only sender/receiver decrypt (Signal Protocol, WhatsApp)

**Best Practice**: TLS 1.3 + AES-256 + KMS + Key rotation 🚀

