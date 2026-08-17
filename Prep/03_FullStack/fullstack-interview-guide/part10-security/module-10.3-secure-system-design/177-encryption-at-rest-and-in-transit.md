# Encryption at Rest and in Transit
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Two surfaces**: in transit (data moving across a network — must use TLS 1.2+) and at rest (data stored on disk — must use AES-256 or platform encryption)
- **In transit**: every channel encrypted — HTTP APIs (TLS via HTTPS), Kafka messages (`security.protocol=SSL`), database connections (`?sslmode=require`), inter-service gRPC (TLS) — no plaintext channels in production
- **At rest — DB level**: PostgreSQL/MySQL transparent data encryption (TDE) — the entire data file on disk is encrypted; enabled at DB engine level; transparent to the application — your SQL queries work identically
- **At rest — column level**: `@Converter` (`AttributeConverter<String, String>`) in JPA — encrypt on save, decrypt on load; use AES-256-GCM; for PII fields (SSN, card numbers, health data) where you want field-level control even if DB-level TDE is enabled or if you have read replicas exposed to analytics
- **At rest — S3**: SSE-S3 (S3 manages keys), SSE-KMS (customer-managed keys in AWS KMS — recommended for compliance), SSE-C (customer provides key per request); enforce via bucket policy denying `PutObject` without server-side encryption
- **Envelope encryption**: the pattern used by Vault, AWS KMS, Google Cloud KMS — data is encrypted with a data encryption key (DEK); the DEK is encrypted with a key encryption key (KEK) stored in the KMS; only the encrypted DEK is stored with the data; rotating the KEK does not require re-encrypting all data
- **Hruday's production experience** (✅): RDS PostgreSQL with encryption at rest enabled + SSL connections from all Spring Boot services; S3 bucket policies enforced SSE-KMS for all document uploads; Kafka with SSL enabled for all consumer/producer connections

---

## 1. One-Line Definition
Encryption at rest protects stored data from physical or storage-level breach; encryption in transit protects data from network interception; together they ensure confidentiality across the entire data lifecycle — from the moment data enters the system to the moment it is permanently deleted.

---

## 2. The Problem It Solves

A Java developer builds a payment platform. HTTPS is on (that part is obvious). But:
- The database stores card holder data in plaintext columns — if someone gets DB access (a rogue DBA, a SQL injection, a stolen backup), they read the card data directly
- The Kafka messages between services carry order details including names and partial card info — if someone mirrors the network, they read the messages in plaintext
- S3 stores invoices as PDFs — if the bucket permissions are misconfigured (extremely common, many major breaches), the PDFs are readable by anyone
- Inter-service calls use HTTP (not HTTPS) inside the K8s cluster — "it's inside the cluster, it's safe" — east-west traffic is not automatically trusted

The regulatory consequences are direct: PCI-DSS requires encryption of cardholder data in transit (TLS) and at rest. GDPR requires appropriate technical measures to secure personal data. SOC 2 Type II includes encryption controls in the Trust Services Criteria. A failed audit for any of these means fines or loss of certification.

The practical consequence: the breach model that regulators care about is "data was accessed by an unauthorized party." Encryption at rest means that even if the storage medium is stolen or the DB backup is leaked, the data is unreadable without the key. Encryption in transit means even a full network capture yields only ciphertext.

For a senior engineer: encryption is not a nice-to-have — it's a baseline. Knowing where to apply it (which transport channels, which storage, which fields) and being able to implement it in Spring Boot and Spring Kafka is a production competency.

---

## 3. How It Works Internally

### Encryption In Transit — TLS Recap and Spring Kafka

TLS was covered in depth in Topic 175. The key point for this topic: TLS must be enforced on ALL transport channels, not just client-facing HTTPS:

```
Transport channels requiring TLS:
┌─────────────────────────────────────────────────────────────┐
│ Channel                    │ TLS Config                      │
│────────────────────────────│─────────────────────────────────│
│ Client → API Gateway       │ HTTPS (TLS termination at LB)   │
│ API Gateway → Spring Boot  │ mTLS or HTTP inside trusted VPC │
│ Spring Boot → PostgreSQL   │ sslmode=require in JDBC URL      │
│ Spring Boot → Redis        │ ssl=true in Lettuce config       │
│ Spring Boot → Kafka        │ security.protocol=SSL           │
│ Spring Boot → S3/AWS APIs  │ HTTPS (AWS SDK enforces by def) │
│ Spring Boot → Spring Boot  │ HTTPS or mTLS via service mesh  │
└─────────────────────────────────────────────────────────────┘
```

### Encryption At Rest — How AES-256-GCM Works

AES-256-GCM is the canonical modern choice. Understanding it at concept level:

```
Symmetric encryption (AES-256-GCM):
  Key: 256-bit random value — stored in KMS, never in application code
  IV/Nonce: unique random 96-bit value generated for EVERY encryption operation
            (critical: reusing the same nonce with the same key breaks GCM security)
  
  Encrypt:
    ciphertext + auth_tag = AES_GCM_Encrypt(key, nonce, plaintext)
    stored_value = nonce || ciphertext || auth_tag  // nonce stored with ciphertext

  Decrypt:
    extract nonce from stored_value (first 12 bytes)
    plaintext = AES_GCM_Decrypt(key, nonce, ciphertext, auth_tag)
    // if auth_tag doesn't verify, data has been tampered — GCM provides integrity

  Why GCM over CBC:
    GCM provides authenticated encryption — detects tampering
    CBC only provides confidentiality — an attacker can flip bits undetected
    AWS KMS, Vault, and Google KMS all use AES-256-GCM internally
```

### Database Transparent Data Encryption (TDE)

```
Database-level encryption — transparent to the application:

PostgreSQL (AWS RDS with encryption enabled):
  Storage layer: EBS volume encrypted with AWS KMS key
  Process: DB engine writes data to EBS → EBS driver encrypts with KMS key → stored on disk
           DB engine reads from EBS → EBS driver decrypts → returns plaintext to engine
  SQL queries: completely unchanged — Spring Boot doesn't know encryption is happening
  Backup: RDS snapshots are also encrypted automatically — same KMS key

MySQL InnoDB transparent encryption (file-per-table):
  Each InnoDB data file (.ibd) is encrypted with a tablespace key
  Tablespace key is encrypted with the master encryption key (stored in MySQL keyring)
  Individual tables can be encrypted/decrypted independently:
  ALTER TABLE payments ENCRYPTION='Y';

PostgreSQL column encryption (pgcrypto extension):
  SELECT pgp_sym_encrypt('plaintext', 'key') → bytea column
  SELECT pgp_sym_decrypt(encrypted_col, 'key') → text
  Key management complexity: where is 'key' coming from? 
  Better handled at application level (JPA converter) than in SQL
```

### Application-Level Column Encryption — JPA AttributeConverter

```
When to use column-level encryption (even with DB-wide TDE):
├── Highly sensitive fields: SSN, payment card numbers, biometric data
├── Read replicas: analytics DB might not have same encryption controls
├── Multi-tenant: different tenants might use different encryption keys
└── Compliance: PCI-DSS DSS Req 3.5 mandates specific encryption for PAN (card numbers)

JPA AttributeConverter: encrypts at the Java layer before data reaches the JDBC driver
  Application writes: plaintext → AttributeConverter.convertToDatabaseColumn() → AES-256-GCM ciphertext → stored in DB
  Application reads:  ciphertext → AttributeConverter.convertToEntityAttribute() → AES-256-GCM decrypt → plaintext in Java entity
```

### S3 Server-Side Encryption Options

```
SSE-S3 (AES256):
  AWS manages the keys entirely
  Each object encrypted with a unique key
  Unique key encrypted with a master key AWS rotates periodically
  Enabled: PutObject with x-amz-server-side-encryption: AES256
  Limitation: no customer access to the key; cannot enforce with customer-managed key policy

SSE-KMS (aws:kms):
  Customer creates a KMS CMK (Customer Managed Key) with explicit key policy
  Object encrypted with a data key; data key encrypted with the CMK
  IAM permission required both to write and read: kms:GenerateDataKey and kms:Decrypt
  Audit trail: every encryption and decryption logged in AWS CloudTrail
  Recommended for compliance workloads (PCI-DSS, HIPAA)

SSE-C (customer-provided keys):
  Customer provides the encryption key with every API request
  S3 encrypts the object, then deletes the key immediately
  Customer must store and provide the key for every read
  Rarely used — high operational overhead; use SSE-KMS unless you have a specific reason

Client-side encryption:
  Application encrypts before sending to S3; S3 holds only ciphertext
  AWS Encryption SDK or S3 Encryption Client (Java) handles key management + envelope encryption
  Used when: you don't trust AWS with plaintext; regulated industries (financial, healthcare)
```

### Envelope Encryption — The Universal Pattern

```
Problem with simple symmetric encryption at scale:
  If you use one key to encrypt all data, rotating that key means re-encrypting everything
  If the key is compromised, all data is exposed

Solution — Envelope Encryption:

  DEK (Data Encryption Key):
    - Unique random AES-256 key generated for each piece of data (or per-record, per-file)
    - Used to encrypt the actual data
    - Short-lived; can be rotated frequently per-record without KMS involvement

  KEK (Key Encryption Key = Master Key):
    - Stored in KMS (AWS KMS, HashiCorp Vault, HSM)
    - Never leaves the KMS — encryption/decryption happens inside the KMS hardware
    - Used to encrypt the DEK

  Storage pattern per record:
    { 
      "encrypted_dek": "base64...",    // DEK encrypted with KEK via KMS
      "encrypted_data": "base64...",   // Data encrypted with DEK (AES-256-GCM)
      "dek_key_id": "arn:aws:kms:..."  // Which KMS key was used for the DEK
    }

  On decrypt:
    1. Call KMS: decrypt(encrypted_dek, kms_key_id) → DEK
       (KMS checks IAM permissions, logs this call in CloudTrail)
    2. Decrypt data locally: AES_GCM_Decrypt(DEK, encrypted_data) → plaintext
    3. IAM-controlled: only services with kms:Decrypt permission on that CMK can decrypt

  Key rotation:
    Rotate KEK in KMS → only need to re-encrypt the small DEKs, not all the data
    Much more efficient than re-encrypting terabytes of data
```

---

## 4. The Code

### Wrong Way — Missing Encryption Channels
```yaml
# application.yml — MISSING encryption in multiple channels
spring:
  datasource:
    # No SSL for DB connection — plaintext traffic between app and database
    url: jdbc:postgresql://prod-db.company.com:5432/payments
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    
  data:
    redis:
      # No SSL for Redis — cache contains sensitive session data in plaintext transit
      host: redis.company.com
      port: 6379
      # ssl: true is missing

# Entity with sensitive data — stored in plaintext in DB
@Entity
public class Customer {
    private String nationalId;        // SSN/Aadhar — plaintext in DB
    private String paymentCardToken;  // tokenized card — plaintext in DB
    private String emailAddress;      // PII — plaintext in DB
    // No @Convert → no column-level encryption
}
```

```java
// Kafka producer — no SSL, plaintext messages on the network
@Configuration
public class KafkaConfig {
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka-broker:9092");
        // security.protocol is PLAINTEXT by default — no SSL
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        return new DefaultKafkaProducerFactory<>(config);
    }
}
```

> **Why this fails in production:** DB traffic between the app container and the RDS instance travels through the VPC — still potentially sniffable by other services in the same VPC that have compromised network access; without SSL, every heartbeat query, every SELECT with PII, every INSERT with sensitive data is plaintext on the wire; a misconfigured security group that allows broad intra-VPC traffic means a compromised service in the same VPC can packet-capture your DB queries.

### Right Way — Production Quality Encryption

**Spring Boot + PostgreSQL with SSL (mandatory):**
```yaml
# application.yml — full SSL configuration
spring:
  datasource:
    # sslmode=require: TLS encrypted connection; rejects if DB doesn't support SSL
    # sslmode=verify-full: TLS encrypted + validates server certificate CN to hostname (best)
    url: jdbc:postgresql://prod-db.company.com:5432/payments?sslmode=require
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      # HikariCP connection pool SSL props
      connection-init-sql: "SET application_name = 'payment-service'"
      # For verify-full, point to the RDS CA bundle:
      # connection-init-sql: needs sslrootcert in JDBC URL
      # url: jdbc:postgresql://...?sslmode=verify-full&sslrootcert=/etc/ssl/rds-ca-2019-root.pem
      
  data:
    redis:
      ssl:
        enabled: true                    # Lettuce will use TLS
      host: redis.company.com
      port: 6380                         # TLS port (typically 6380 for AWS ElastiCache)
```

**JDBC URL with full SSL verification (most secure):**
```java
// Programmatic datasource with SSL cert validation
@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource(
            @Value("${DB_HOST}") String host,
            @Value("${DB_PORT:5432}") int port,
            @Value("${DB_NAME}") String dbName,
            @Value("${DB_USERNAME}") String username,
            @Value("${DB_PASSWORD}") String password) {

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(String.format(
            "jdbc:postgresql://%s:%d/%s?sslmode=verify-full&sslrootcert=/etc/ssl/certs/rds-ca.pem",
            host, port, dbName
        ));
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTestQuery("SELECT 1");

        return new HikariDataSource(config);
    }
}
```

**JPA AttributeConverter for column-level encryption (AES-256-GCM):**
```java
// EncryptionService — wraps KMS or a local key (in production, use KMS)
@Service
public class EncryptionService {

    // In production: this key comes from AWS KMS or Vault, never from application.yml
    // For this example: loaded from Secrets Manager at startup
    @Value("${encryption.field-key}")
    private String base64FieldKey;

    public String encrypt(String plaintext) {
        if (plaintext == null) return null;

        try {
            byte[] key = Base64.getDecoder().decode(base64FieldKey);
            SecretKeySpec secretKey = new SecretKeySpec(key, "AES");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");

            // Generate a unique nonce for EVERY encryption operation
            byte[] nonce = new byte[12];  // 96-bit nonce for GCM
            new SecureRandom().nextBytes(nonce);

            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(128, nonce));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Prepend nonce to ciphertext — nonce is not secret, needed for decryption
            byte[] combined = new byte[nonce.length + ciphertext.length];
            System.arraycopy(nonce, 0, combined, 0, nonce.length);
            System.arraycopy(ciphertext, 0, combined, nonce.length, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new EncryptionException("Encryption failed", e);
        }
    }

    public String decrypt(String encryptedBase64) {
        if (encryptedBase64 == null) return null;

        try {
            byte[] combined = Base64.getDecoder().decode(encryptedBase64);
            byte[] key = Base64.getDecoder().decode(base64FieldKey);

            // Extract nonce (first 12 bytes)
            byte[] nonce = new byte[12];
            System.arraycopy(combined, 0, nonce, 0, 12);

            // Extract ciphertext (remaining bytes)
            byte[] ciphertext = new byte[combined.length - 12];
            System.arraycopy(combined, 12, ciphertext, 0, ciphertext.length);

            SecretKeySpec secretKey = new SecretKeySpec(key, "AES");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(128, nonce));

            // GCM automatically verifies the auth tag — throws exception if data was tampered
            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (AEADBadTagException e) {
            // GCM auth tag failed — data was tampered with or key is wrong
            throw new DataIntegrityException("Encrypted data integrity check failed", e);
        } catch (Exception e) {
            throw new EncryptionException("Decryption failed", e);
        }
    }
}

// AttributeConverter — applied to JPA entity fields
@Component
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private final EncryptionService encryptionService;

    public EncryptedStringConverter(EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }

    @Override
    public String convertToDatabaseColumn(String plaintext) {
        return encryptionService.encrypt(plaintext);
    }

    @Override
    public String convertToEntityAttribute(String dbEncrypted) {
        return encryptionService.decrypt(dbEncrypted);
    }
}

// Entity — annotate sensitive fields
@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue
    private UUID id;

    // Not encrypted — not PII in isolation
    private String displayName;

    // Encrypted — PII; requires field-level protection beyond DB TDE
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "national_id", length = 500)   // Encrypted value is longer than plaintext
    private String nationalId;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "email_address", length = 500)
    private String emailAddress;

    // IMPORTANT: You CANNOT query on encrypted columns with SQL equality
    // SELECT * FROM customers WHERE email_address = ? → won't work (comparing ciphertexts)
    // Design around this: use a separate HMAC/hash for lookup, keep encrypted for storage
    // OR use PostgreSQL pgcrypto with deterministic encryption (not GCM — lower security)
}
```

**Note on searching encrypted fields:**
```java
// The "lookup problem" with encrypted columns:
// You can't do: WHERE email = 'user@example.com' if the column stores AES-GCM ciphertext
//   (each encryption of the same plaintext produces different ciphertext with random nonce)
// Solution: store a separate deterministic HMAC alongside the encrypted field for lookup

@Entity
public class Customer {

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "email_encrypted", length = 500)
    private String email;                   // AES-GCM encrypted — for storage and display

    @Column(name = "email_lookup_hash", length = 64)
    private String emailLookupHash;         // HMAC-SHA256 of email — for WHERE queries
                                            // deterministic but not reversible
    
    // Service sets both fields on save:
    // customer.setEmail(email);
    // customer.setEmailLookupHash(hmacSha256(email, lookupHmacKey));
    // Then query: WHERE email_lookup_hash = hmacSha256(searchEmail, lookupHmacKey)
}
```

**Spring Kafka with SSL:**
```java
// Kafka producer configuration with SSL
@Configuration
public class KafkaProducerConfig {

    @Bean
    public ProducerFactory<String, Object> producerFactory(
            @Value("${kafka.bootstrap-servers}") String bootstrapServers,
            @Value("${kafka.ssl.truststore-location}") String truststoreLocation,
            @Value("${kafka.ssl.truststore-password}") String truststorePassword,
            @Value("${kafka.ssl.keystore-location}") String keystoreLocation,
            @Value("${kafka.ssl.keystore-password}") String keystorePassword) {

        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);

        // SSL configuration
        config.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, "SSL");
        config.put(SslConfigs.SSL_TRUSTSTORE_LOCATION_CONFIG, truststoreLocation);
        config.put(SslConfigs.SSL_TRUSTSTORE_PASSWORD_CONFIG, truststorePassword);
        config.put(SslConfigs.SSL_KEYSTORE_LOCATION_CONFIG, keystoreLocation);     // For mTLS
        config.put(SslConfigs.SSL_KEYSTORE_PASSWORD_CONFIG, keystorePassword);
        config.put(SslConfigs.SSL_KEY_PASSWORD_CONFIG, keystorePassword);
        config.put(SslConfigs.SSL_ENDPOINT_IDENTIFICATION_ALGORITHM_CONFIG, "https"); // Verify broker hostname

        return new DefaultKafkaProducerFactory<>(config);
    }
}
```

```yaml
# application.yml — Kafka SSL (Spring Kafka approach)
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS}
    properties:
      security.protocol: SSL
      ssl.truststore.location: /etc/kafka/ssl/kafka.client.truststore.jks
      ssl.truststore.password: ${KAFKA_TRUSTSTORE_PASSWORD}
      ssl.keystore.location: /etc/kafka/ssl/kafka.client.keystore.jks
      ssl.keystore.password: ${KAFKA_KEYSTORE_PASSWORD}
      ssl.key.password: ${KAFKA_KEY_PASSWORD}
      ssl.endpoint.identification.algorithm: https
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
    consumer:
      group-id: payment-service
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
```

**S3 with SSE-KMS enforced:**
```java
// S3 client configured to enforce SSE-KMS on all uploads
@Configuration
public class S3Config {

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
            .region(Region.AP_SOUTH_1)
            .credentialsProvider(DefaultCredentialsProvider.create())  // IAM role from EKS
            .build();
    }
}

@Service
public class DocumentStorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.kms.document-key-id}")
    private String documentKmsKeyId;

    public String uploadDocument(String fileName, byte[] content, String contentType) {
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucketName)
            .key("documents/" + fileName)
            .contentType(contentType)
            .serverSideEncryption(ServerSideEncryption.AWS_KMS)   // SSE-KMS
            .ssekmsKeyId(documentKmsKeyId)                         // Customer-managed CMK
            // This means: S3 encrypts this object using the customer KMS key
            // Only a principal with kms:Decrypt on this CMK can download the object
            .build();

        s3Client.putObject(request, RequestBody.fromBytes(content));
        return String.format("s3://%s/documents/%s", bucketName, fileName);
    }
}
```

```json
// S3 bucket policy — deny any upload that is not SSE-KMS encrypted
// Prevents developers from accidentally uploading plaintext objects
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-documents-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyWrongKMSKey",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-documents-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption-aws-kms-key-id":
            "arn:aws:kms:ap-south-1:123456:key/my-document-key"
        }
      }
    }
  ]
}
```

> **Key decisions here:**
> - AES-256-GCM over AES-256-CBC — GCM provides authenticated encryption (integrity + confidentiality); CBC provides only confidentiality; always prefer AEAD (Authenticated Encryption with Associated Data) ciphers
> - Unique nonce per encryption — critical for GCM security; nonce reuse with the same key completely breaks GCM; use `SecureRandom` to generate per-operation nonces; never use a counter or timestamp as a nonce
> - Column-level encryption doesn't replace DB-level TDE — they address different threat models; TDE: physical disk theft, stolen backup files; column encryption: authorized DB users or DBAs who can run queries but shouldn't see PII; use both for regulated data
> - The HMAC lookup pattern for searching encrypted fields is the production-standard approach; doing deterministic encryption (same plaintext → same ciphertext) for searchability removes the nonce and degrades security — use HMAC instead

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between encryption at rest and encryption in transit?"

**Hruday's answer:**
> Encryption in transit protects data while it is moving across a network — from a browser to a web server, from a Spring Boot service to a database, between microservices, through a message queue. The standard is TLS 1.2 or 1.3. Without it, an attacker on the network can read the data. The attacker doesn't need to compromise either endpoint — just the network path between them.
>
> Encryption at rest protects data while it is stored — the bytes on a database server's disk, in an S3 object, in a Redis cache, in an Elasticsearch index. The standard is AES-256. Without it, physical access to the storage (a stolen server, a leaked database backup, a misconfigured S3 bucket) exposes the raw data.
>
> They address different threat models. In transit: man-in-the-middle, network interception. At rest: physical access, backup leaks, misconfigured access controls. A robust system needs both — a burglar who steals your hard drive shouldn't get the data, and someone who taps your network cable shouldn't either.
>
> In a Spring Boot application, in-transit means TLS on every channel: JDBC URL with `sslmode=require`, Redis with `ssl.enabled=true`, Kafka with `security.protocol=SSL`, and HTTPS for all API endpoints. At-rest means enabling RDS encryption, S3 SSE-KMS, and for PII fields, JPA `AttributeConverter` with AES-256-GCM for column-level encryption.

---

### Q2 — Deep Dive
**Interviewer asks:** "How would you implement field-level encryption in a JPA entity, and what is the lookup problem with encrypted columns?"

**Hruday's answer:**
> JPA provides `AttributeConverter<T, DB>` which lets you intercept the conversion between the Java type and the database type. For field-level encryption, I implement `AttributeConverter<String, String>`, override `convertToDatabaseColumn()` to encrypt and `convertToEntityAttribute()` to decrypt. I annotate the sensitive fields in the entity with `@Convert(converter = EncryptedStringConverter.class)`. The database then stores ciphertext; the entity exposes plaintext. This is transparent to the rest of the service code.
>
> Encryption algorithm: AES-256-GCM. Critically, generate a unique 96-bit nonce with `SecureRandom` for every encryption operation and prepend it to the ciphertext. GCM requires nonce uniqueness for security — if the same nonce is reused with the same key, the entire encryption scheme is compromised. GCM also provides authentication — it detects if the ciphertext was tampered with.
>
> The lookup problem: AES-256-GCM is probabilistic — the same plaintext encrypted twice produces different ciphertext each time, because of the random nonce. So you can't do `WHERE email = ?` because the stored value is ciphertext, not the email. Comparing ciphertexts doesn't work — they'll never match.
>
> The production solution is the HMAC lookup pattern. Store two columns: an AES-GCM encrypted column for secure storage and a deterministic HMAC-SHA256 column for lookup. HMAC with a separate secret key is deterministic — the same plaintext always produces the same HMAC — but not reversible. Index the HMAC column. Query: compute HMAC of the search email, then `WHERE email_hmac = ?`. This gives you indexed lookup without exposing the plaintext. The encryption key and the HMAC key must be different — both stored in AWS Secrets Manager, never in source code.

---

### Q3 — Production Context
**Interviewer asks:** "What encryption controls have you implemented in your production Spring Boot services?"

**Hruday's answer:**
> At SAP, encryption was implemented across all transport channels. For the database layer, RDS PostgreSQL had encryption at rest enabled — the EBS volume is encrypted with a KMS CMK; all Spring Boot services connected with `sslmode=require` in the JDBC URL, enforcing TLS between the app container and the database instance. For S3 document storage, we enforced SSE-KMS through a bucket policy that outright denied any `PutObject` request without the correct KMS key in the header — this prevented accidental plaintext uploads even if a developer forgot to set the encryption header.
>
> For Kafka, all producer and consumer configurations used `security.protocol=SSL` with the broker's truststore. For PII fields in our customer data, we implemented a JPA `AttributeConverter` with AES-256-GCM for SSN and email fields — these were fields that our compliance team required column-level protection for, beyond what the DB-level TDE provided.
>
> One thing I improved specifically: I audited the internal service-to-service calls that were using HTTP inside the cluster when we migrated to Kubernetes. I updated all WebClient configurations to use HTTPS with the internal TLS certificates, so east-west traffic was also encrypted. This mattered because our K8s cluster had multiple teams' services in it — we own our pod network but not all pods.

---

### Q4 — Scenario
**Interviewer asks:** "A compliance audit reveals that customer PII is stored in plaintext in your PostgreSQL database. What do you do?"

**Hruday's answer:**
> Immediate response: assess the scope — how many records, which PII fields, what regulations apply. If it's GDPR-regulated data or payment card data, this might require breach notification assessment. Loop in legal and privacy teams.
>
> Short-term mitigation: enable RDS encryption at rest if not already enabled. This requires creating an encrypted snapshot and restoring — a brief maintenance window, or it can be done on a replica. This addresses the "stolen backup" threat model.
>
> For column-level encryption in the existing data: write a migration that reads each record, encrypts the PII fields, and writes them back. Use a Flyway migration script that calls a Java service to do the encryption. This must be done as a dark launch — read the old column, write to a new encrypted column, validate, then cut over. Don't encrypt in-place in a single migration — too risky if something goes wrong.
>
> Going forward: add JPA `AttributeConverter` for the PII fields so all new writes are encrypted automatically. Add `detect-pii-in-migration` lint rules to the CI pipeline to flag migrations that add new plaintext columns that might be PII. Update the data classification policy — PII fields are automatically marked as requiring column-level encryption when a new table is designed.
>
> Prevention: I'd also add a data classification layer to the entity model — annotations like `@PIIField` that generate an automated audit report of all fields requiring encryption, making it easy to identify gaps before a compliance audit finds them.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "HTTPS is enough" | "We use HTTPS so encryption in transit is covered" | HTTPS covers client-to-server; DB connections, inter-service calls, Kafka, Redis — all also need encryption; check every channel, not just the browser-facing one |
| Nonce reuse vulnerability | Don't mention nonces at all | AES-GCM with reused nonce completely breaks the encryption — you can recover the key; always generate a unique `SecureRandom` nonce per encryption operation; this is one of the most common implementation mistakes |
| TDE replaces column encryption | "Database encryption is sufficient for all compliance" | TDE protects against stolen disk / backup leak; a DBA with query access reads plaintext even with TDE; PCI-DSS and GDPR often require column-level encryption for specific fields in addition to TDE |
| Base64 as encryption | "We encode sensitive fields in Base64" | Base64 is encoding — trivially reversible by anyone; it's not encryption and provides no security; this answer shows fundamental misunderstanding and is an immediate red flag in interviews |

---

## 7. Hruday's Real Experience Hook
> "At SAP, encryption was a mandatory baseline across our platform, not an afterthought. I led the implementation of SSL enforcement for all database connections after our compliance team flagged that some older Spring Boot services were connecting to PostgreSQL without `sslmode=require`. I updated all JDBC URLs and coordinated with the DBA team to ensure the RDS parameter group had `ssl=1` enforced. For document storage, I implemented the S3 SSE-KMS bucket policy that blocked unencrypted uploads — this was triggered by an infrastructure audit that found one S3 bucket accepting plaintext objects. For our customer data service, I implemented `AttributeConverter` with AES-256-GCM for the three PII fields the DPA identified as needing field-level protection beyond DB-wide TDE. I also migrated the Kafka configurations to use SSL across all our microservices — we had been running with `PLAINTEXT` protocol inside the VPC, which was flagged as a control gap. End result: every transport channel and every sensitive field at rest now had explicit cryptographic protection."

---

## 8. Scale Evolution

**1,000 users/day →** TLS on all network connections (HTTPS, DB with SSL, Redis with TLS). RDS encryption at rest enabled from day one. S3 SSE-S3 at minimum. These are defaults to enable, not custom code.

**100,000 users/day →** SSE-KMS rather than SSE-S3 for important document buckets. JPA `AttributeConverter` for PII fields. Kafka with SSL. Per-environment KMS keys — production has its own CMK, dev and staging cannot decrypt production data.

**10 million users/day →** Envelope encryption for per-customer data encryption keys — different customers' data encrypted with different DEKs; a compromised key exposes one customer's data, not all. HMAC-based search tokens for encrypted columns. Database activity monitoring (AWS RDS Audit Logs, PostgreSQL `pgaudit`) — who queried which sensitive fields and when. Hardware Security Modules (HSM) if in a regulated industry. Zero-trust network model — service-to-service mTLS everywhere, no implicit trust within the cluster.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | PCI-DSS compliance: Requirement 3 (protect stored cardholder data) and Requirement 4 (encrypt transmission over open networks) are direct encryption requirements; failing these means losing the payment license | Know PCI-DSS Req 3 and 4; column-level encryption for PANs; TLS on all channels |
| Swiggy / Meesho | GDPR/PDPB compliance for large user PII datasets; encryption at rest and in transit is part of the technical and organizational measures required by law | Know the HMAC lookup pattern; data classification for PII; AWS KMS for at-rest key management |
| Adobe / Microsoft | Enterprise compliance (SOC 2, ISO 27001); auditors specifically check encryption for data at rest and in transit; these companies sell to enterprises that require encryption certifications | Know envelope encryption and key management hierarchy; CloudTrail audit trails for KMS key usage |
| SAP Labs | SAP's products are used by enterprises with high data security requirements; SAP has its own security certification (SAP Security Baseline); encryption is a mandatory baseline for all customer-facing products | Know RDS encryption + SSL connections; Spring Boot implementation patterns; S3 SSE-KMS bucket policies |

---

## 10. Related Topics — What to Study Next

- **Topic 176 — Secrets Management** — the encryption keys (AES-256 field keys, KMS CMK IDs) are themselves secrets that must be managed through Vault or AWS SM; topic 176 covers this; they are tightly coupled — you cannot do column-level encryption well without a proper secrets management strategy for the keys
- **Topic 175 — HTTPS/TLS** — the in-transit side of this topic in depth; TLS cipher suite selection, certificate pinning, mTLS for service-to-service; Topic 175 covers all of this
- **Topic 169 — OWASP Top 10** — A02 is Cryptographic Failures; this entire topic is the technical implementation of A02 controls; understanding both together makes for a complete answer
- **Topic 178 — CSP Implementation** — a complementary control that prevents client-side exfiltration of decrypted data via XSS even when server-side data reaches the browser
- **Practice**: run `openssl s_client -connect your-db-host:5432` — can you connect without specifying `starttls`? If you can, the server might be accepting plaintext; this verifies TLS is actually working end-to-end on DB connections

---

*Part 10 · Encryption at Rest and in Transit · Full Stack Interview Guide · Hruday D · 2026*
