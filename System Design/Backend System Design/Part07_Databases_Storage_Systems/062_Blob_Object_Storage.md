# 62. Blob / Object Storage

## Table of Contents
1. [High-Level Overview](#1-high-level-overview)
2. [Deep-Dive (Senior/Staff Level)](#2-deep-dive-seniorstaff-level)
3. [Capacity Planning & Estimation](#3-capacity-planning--estimation)
4. [Data & Storage Design](#4-data--storage-design)
5. [Scalability & Reliability](#5-scalability--reliability)
6. [Security & API Design](#6-security--api-design)
7. [Real-World Examples](#7-real-world-examples)
8. [Interview Q&A](#8-interview-qa)
9. [Key Takeaways](#9-key-takeaways)
10. [Executive Summary](#10-executive-summary)

---

## 1. High-Level Overview

### What is Object Storage?

**Object Storage** is a data storage architecture that manages data as **objects** rather than file hierarchies (file storage) or blocks (block storage). Each object contains:
- **Data**: The actual file content (blob)
- **Metadata**: Descriptive information (content-type, timestamps, custom tags)
- **Unique Identifier**: Global key/ID for retrieval

### Core Characteristics

```
┌─────────────────────────────────────────────────────────┐
│           OBJECT STORAGE CHARACTERISTICS                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Flat Namespace (no directory hierarchy)             │
│  ✓ HTTP/REST API access                                │
│  ✓ Unlimited scalability                               │
│  ✓ High durability (11 9s = 99.999999999%)             │
│  ✓ Metadata-rich                                        │
│  ✓ Eventually consistent (typically)                    │
│  ✓ Cost-effective for large-scale storage              │
│  ✓ Optimized for read-heavy workloads                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Storage Types Comparison

| Feature | Block Storage | File Storage | Object Storage |
|---------|--------------|--------------|----------------|
| **Structure** | Raw blocks | Hierarchical files | Flat objects |
| **Access** | SCSI, iSCSI | NFS, SMB | HTTP REST API |
| **Performance** | Very High | Medium-High | Medium |
| **Scalability** | Limited | Limited | Unlimited |
| **Use Case** | Databases, VMs | Shared files | Media, backups, archives |
| **Cost** | High | Medium | Low |
| **Metadata** | Minimal | Limited | Rich |
| **Consistency** | Strong | Strong | Eventual |

### Key Players

**AWS S3** (Simple Storage Service)
- Industry standard (launched 2006)
- 280+ trillion objects stored globally
- 11 9s durability, 99.99% availability

**Azure Blob Storage**
- Hot, Cool, Archive tiers
- Integrated with Microsoft ecosystem
- Strong enterprise adoption

**Google Cloud Storage (GCS)**
- Unified API across storage classes
- Strong ML/AI integration
- Multi-regional by default

**MinIO**
- Open-source S3-compatible
- Self-hosted option
- High performance

### Common Use Cases

```
┌─────────────────────────────────────────────────────────┐
│                   USE CASES                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Media Storage (Netflix, YouTube)                    │
│     • Video files, thumbnails, images                   │
│     • CDN origin server                                 │
│                                                          │
│  2. Backup & Archival (Dropbox, iCloud)                │
│     • Long-term data retention                          │
│     • Disaster recovery                                 │
│                                                          │
│  3. Data Lakes (Uber, Airbnb)                           │
│     • Raw analytics data                                │
│     • ML training datasets                              │
│                                                          │
│  4. Static Web Hosting                                  │
│     • HTML, CSS, JS files                               │
│     • SPA deployments                                   │
│                                                          │
│  5. Log Storage (Splunk, ELK)                           │
│     • Application logs                                  │
│     • Audit trails                                      │
│                                                          │
│  6. User-Generated Content (Instagram, Twitter)         │
│     • Profile pictures                                  │
│     • Uploaded photos/videos                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Deep-Dive (Senior/Staff Level)

### AWS S3 Architecture Internals

#### Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS S3 ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Client Request (PUT /bucket/key)                              │
│         │                                                        │
│         ▼                                                        │
│   ┌──────────────┐                                              │
│   │ API Frontend │ ← CloudFront (optional)                      │
│   │ (Load Balanced)                                             │
│   └──────┬───────┘                                              │
│          │                                                       │
│          ▼                                                       │
│   ┌──────────────┐                                              │
│   │ Request      │ • Authentication (SigV4)                     │
│   │ Router       │ • Authorization (IAM/Bucket Policy)          │
│   └──────┬───────┘                                              │
│          │                                                       │
│          ▼                                                       │
│   ┌──────────────────────────────────────┐                     │
│   │     Metadata Store (Distributed)     │                     │
│   │  • Bucket → Region mapping            │                     │
│   │  • Object location (partition keys)  │                     │
│   │  • Version IDs, ETags                │                     │
│   └──────────┬───────────────────────────┘                     │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────────────────────────────┐              │
│   │         Storage Nodes (Thousands)           │              │
│   │  ┌────────┐  ┌────────┐  ┌────────┐        │              │
│   │  │ Node 1 │  │ Node 2 │  │ Node N │  ...   │              │
│   │  │ AZ-1   │  │ AZ-2   │  │ AZ-3   │        │              │
│   │  └────────┘  └────────┘  └────────┘        │              │
│   │                                              │              │
│   │  Each object replicated to 3+ AZs           │              │
│   │  Erasure coding for durability              │              │
│   └─────────────────────────────────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Object Key Structure

S3 uses a **flat namespace**, but key prefixes affect performance:

```
bucket-name/
  user-photos/
    2024/
      01/
        user123_abc123.jpg    ← Key: "user-photos/2024/01/user123_abc123.jpg"
        user456_def456.jpg
    02/
      ...
```

**Partitioning Strategy (Pre-2018)**:
- First few characters of key determined partition
- Hot keys caused throttling
- Solution: Add random prefix

**Modern S3 (Post-2018)**:
- Automatic request partitioning
- 3,500 PUT/s and 5,500 GET/s per prefix
- No need for random prefixes

#### Durability & Availability

**Durability Calculation** (11 9s):

```
Durability = 99.999999999%
Annual loss rate = 0.000000001% = 1 in 100 billion objects

For 10 million objects:
Expected loss = 10,000,000 / 100,000,000,000 = 0.0001 objects/year
Time to expect 1 loss = 10,000 years
```

**Implementation**:
1. **Replication**: 3+ copies across AZs
2. **Erasure Coding**: Data split into chunks with parity
3. **Background Verification**: Continuous integrity checks
4. **Automated Repair**: Detects and fixes bit rot

**Availability**: 99.99% (Standard) = 52 minutes downtime/year

### Consistency Models

#### AWS S3 Strong Consistency (Since Dec 2020)

```
┌─────────────────────────────────────────────────────────┐
│              STRONG CONSISTENCY MODEL                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  PUT /bucket/photo.jpg  ────┐                           │
│                             │                           │
│                             ▼                           │
│                       ┌──────────┐                      │
│                       │  Write   │                      │
│                       │ Complete │                      │
│                       └──────────┘                      │
│                             │                           │
│  GET /bucket/photo.jpg  ◄───┘                           │
│  Returns: Latest version                                │
│                                                          │
│  ✓ Read-after-write consistency                         │
│  ✓ Read-after-delete consistency                        │
│  ✓ List consistency                                     │
│  ✓ No additional cost                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Storage Classes

| Class | Use Case | Durability | Availability | Retrieval | Cost (per GB/month) |
|-------|----------|------------|--------------|-----------|---------------------|
| **S3 Standard** | Frequently accessed | 11 9s | 99.99% | Instant | $0.023 |
| **S3 Intelligent-Tiering** | Unknown patterns | 11 9s | 99.9% | Instant | $0.023 + monitoring |
| **S3 Standard-IA** | Infrequent access | 11 9s | 99.9% | Instant | $0.0125 + retrieval |
| **S3 One Zone-IA** | Non-critical, recreatable | 11 9s | 99.5% | Instant | $0.01 + retrieval |
| **S3 Glacier Instant** | Archive, instant access | 11 9s | 99.9% | Instant | $0.004 + retrieval |
| **S3 Glacier Flexible** | Archive, rare access | 11 9s | 99.99% | Minutes-Hours | $0.0036 + retrieval |
| **S3 Glacier Deep Archive** | Long-term archive | 11 9s | 99.99% | 12-48 hours | $0.00099 + retrieval |

### Multipart Upload

For files **> 100 MB**, use multipart upload:

```
┌─────────────────────────────────────────────────────────────┐
│              MULTIPART UPLOAD PROCESS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Initiate Multipart Upload                               │
│     POST /bucket/large-video.mp4?uploads                    │
│     Response: { uploadId: "abc123..." }                     │
│                                                              │
│  2. Upload Parts (parallel)                                 │
│     PUT /bucket/large-video.mp4?partNumber=1&uploadId=...   │
│     PUT /bucket/large-video.mp4?partNumber=2&uploadId=...   │
│     PUT /bucket/large-video.mp4?partNumber=N&uploadId=...   │
│                                                              │
│     Each part: 5 MB - 5 GB                                  │
│     Max parts: 10,000                                       │
│     Max object size: 5 TB                                   │
│                                                              │
│  3. Complete Multipart Upload                               │
│     POST /bucket/large-video.mp4?uploadId=abc123...         │
│     Body: List of { partNumber, ETag } pairs                │
│                                                              │
│  4. S3 assembles parts into single object                   │
│                                                              │
│  Benefits:                                                   │
│  • Parallel uploads (faster)                                │
│  • Resume from failure                                      │
│  • Upload before knowing total size                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Node.js Example**:

```javascript
const AWS = require('aws-sdk');
const fs = require('fs');
const s3 = new AWS.S3();

async function multipartUpload(bucket, key, filePath) {
  const fileSize = fs.statSync(filePath).size;
  const partSize = 5 * 1024 * 1024; // 5 MB
  const numParts = Math.ceil(fileSize / partSize);
  
  // 1. Initiate
  const { UploadId } = await s3.createMultipartUpload({
    Bucket: bucket,
    Key: key,
    ContentType: 'video/mp4',
    ServerSideEncryption: 'AES256'
  }).promise();
  
  console.log(`Initiated upload: ${UploadId}`);
  
  // 2. Upload parts in parallel
  const uploadPromises = [];
  for (let i = 0; i < numParts; i++) {
    const start = i * partSize;
    const end = Math.min(start + partSize, fileSize);
    
    const partParams = {
      Bucket: bucket,
      Key: key,
      PartNumber: i + 1,
      UploadId: UploadId,
      Body: fs.createReadStream(filePath, { start, end: end - 1 })
    };
    
    uploadPromises.push(
      s3.uploadPart(partParams).promise()
        .then(data => ({
          ETag: data.ETag,
          PartNumber: i + 1
        }))
    );
  }
  
  const parts = await Promise.all(uploadPromises);
  console.log(`Uploaded ${parts.length} parts`);
  
  // 3. Complete
  await s3.completeMultipartUpload({
    Bucket: bucket,
    Key: key,
    UploadId: UploadId,
    MultipartUpload: { Parts: parts }
  }).promise();
  
  console.log('Upload complete');
}

// Usage
multipartUpload('my-bucket', 'videos/large-file.mp4', '/tmp/video.mp4');
```

### Versioning

**Enable versioning** to keep multiple variants of an object:

```
┌─────────────────────────────────────────────────────────┐
│                 VERSIONING EXAMPLE                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  PUT /bucket/doc.txt (v1)                               │
│    VersionId: "abc123"                                  │
│                                                          │
│  PUT /bucket/doc.txt (v2)                               │
│    VersionId: "def456"  ← Current version               │
│                                                          │
│  DELETE /bucket/doc.txt                                 │
│    Creates "delete marker" (versionId: "ghi789")        │
│    Object appears deleted, but versions preserved       │
│                                                          │
│  GET /bucket/doc.txt                                    │
│    Returns: 404 (delete marker)                         │
│                                                          │
│  GET /bucket/doc.txt?versionId=def456                   │
│    Returns: v2 content                                  │
│                                                          │
│  DELETE /bucket/doc.txt?versionId=ghi789                │
│    Removes delete marker → doc.txt visible again        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Use Cases**:
- Accidental deletion recovery
- Compliance requirements
- Audit trails

**Cost Impact**:
- Each version stored separately
- Use lifecycle policies to expire old versions

### Lifecycle Policies

Automatically transition or delete objects:

```json
{
  "Rules": [
    {
      "Id": "Archive old logs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    },
    {
      "Id": "Delete old versions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

**Transition Flow**:
```
Standard → Standard-IA (30 days) → Glacier (90 days) → Delete (365 days)
$0.023/GB     $0.0125/GB           $0.0036/GB        Free
```

### Replication

#### Cross-Region Replication (CRR)

```
┌─────────────────────────────────────────────────────────┐
│           CROSS-REGION REPLICATION                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Source Bucket (us-east-1)                              │
│       │                                                  │
│       │ Async replication                               │
│       ▼                                                  │
│  Destination Bucket (eu-west-1)                         │
│                                                          │
│  • Compliance (data residency)                          │
│  • Lower latency access                                 │
│  • Disaster recovery                                    │
│                                                          │
│  Replication Time: Typically < 15 minutes               │
│  Replication Time Control (RTC): 99.99% in 15 min       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Same-Region Replication (SRR)

- Aggregate logs from multiple accounts
- Live replication between prod and test
- Data sovereignty within region

**Configuration**:

```json
{
  "Role": "arn:aws:iam::123456789:role/replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": "documents/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        }
      }
    }
  ]
}
```

### Event Notifications

Trigger actions on S3 events:

```
┌─────────────────────────────────────────────────────────┐
│               EVENT NOTIFICATIONS                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  S3 Bucket                                              │
│      │                                                   │
│      │ Events:                                           │
│      │  • s3:ObjectCreated:*                            │
│      │  • s3:ObjectRemoved:*                            │
│      │  • s3:ObjectRestore:*                            │
│      │                                                   │
│      ├──────────► SNS Topic                             │
│      │                 │                                 │
│      │                 └──► Email alerts                │
│      │                                                   │
│      ├──────────► SQS Queue                             │
│      │                 │                                 │
│      │                 └──► Worker processes            │
│      │                                                   │
│      └──────────► Lambda Function                       │
│                        │                                 │
│                        └──► Process file                │
│                             (resize image,              │
│                              transcode video)           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Lambda Example** (Image Thumbnail):

```javascript
const AWS = require('aws-sdk');
const sharp = require('sharp');

const s3 = new AWS.S3();

exports.handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' ')
  );
  
  console.log(`Processing ${bucket}/${key}`);
  
  // Download original image
  const originalImage = await s3.getObject({
    Bucket: bucket,
    Key: key
  }).promise();
  
  // Create thumbnail (200x200)
  const thumbnail = await sharp(originalImage.Body)
    .resize(200, 200, { fit: 'cover' })
    .toBuffer();
  
  // Upload thumbnail
  const thumbnailKey = key.replace('originals/', 'thumbnails/');
  await s3.putObject({
    Bucket: bucket,
    Key: thumbnailKey,
    Body: thumbnail,
    ContentType: 'image/jpeg',
    ACL: 'public-read'
  }).promise();
  
  console.log(`Created thumbnail: ${thumbnailKey}`);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ thumbnailKey })
  };
};
```

### Pre-Signed URLs

Provide temporary access to private objects:

```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// Generate pre-signed URL (valid for 15 minutes)
function generatePresignedUrl(bucket, key, expiresIn = 900) {
  const params = {
    Bucket: bucket,
    Key: key,
    Expires: expiresIn // seconds
  };
  
  const url = s3.getSignedUrl('getObject', params);
  return url;
}

// Upload URL
function generateUploadUrl(bucket, key, contentType) {
  const params = {
    Bucket: bucket,
    Key: key,
    Expires: 300, // 5 minutes
    ContentType: contentType,
    ACL: 'private'
  };
  
  return s3.getSignedUrl('putObject', params);
}

// Usage
const downloadUrl = generatePresignedUrl(
  'my-bucket', 
  'private/document.pdf'
);
console.log('Download URL:', downloadUrl);
// https://my-bucket.s3.amazonaws.com/private/document.pdf?
// AWSAccessKeyId=...&Expires=1234567890&Signature=...

const uploadUrl = generateUploadUrl(
  'my-bucket',
  'uploads/user-123/photo.jpg',
  'image/jpeg'
);
console.log('Upload URL:', uploadUrl);

// Client-side upload (browser)
// fetch(uploadUrl, {
//   method: 'PUT',
//   body: fileBlob,
//   headers: { 'Content-Type': 'image/jpeg' }
// });
```

**Use Cases**:
- Direct browser uploads (bypass server)
- Secure file downloads
- Temporary access for external users

### S3 Transfer Acceleration

Speed up long-distance uploads using CloudFront edge locations:

```
┌─────────────────────────────────────────────────────────┐
│          S3 TRANSFER ACCELERATION                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Client (Asia)                                          │
│      │                                                   │
│      │ Upload to nearest edge location                  │
│      ▼                                                   │
│  CloudFront Edge (Tokyo)                                │
│      │                                                   │
│      │ AWS backbone network (optimized)                 │
│      ▼                                                   │
│  S3 Bucket (us-east-1)                                  │
│                                                          │
│  Speed Improvement: 50-500%                             │
│  Cost: +$0.04/GB (US/EU), +$0.08/GB (Asia)              │
│                                                          │
│  Endpoint:                                               │
│  my-bucket.s3-accelerate.amazonaws.com                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Capacity Planning & Estimation

### Problem: Design Photo Storage for Instagram-like App

**Requirements**:
- 500 million users
- 10% upload 1 photo/day = 50 million photos/day
- Average photo size: 2 MB
- Keep photos forever
- Serve via CDN

### Step 1: Storage Estimation

**Daily Storage**:
```
50M photos/day × 2 MB/photo = 100 TB/day
```

**Monthly Storage**:
```
100 TB/day × 30 days = 3 PB/month
```

**Yearly Storage**:
```
3 PB/month × 12 months = 36 PB/year
```

**5-Year Total**:
```
36 PB/year × 5 years = 180 PB
```

### Step 2: Thumbnail Storage

Generate 3 thumbnails per photo:
- Small: 50 KB
- Medium: 200 KB
- Large: 500 KB

**Total per photo**: 750 KB

**Daily thumbnails**:
```
50M photos × 750 KB = 37.5 TB/day
```

**5-Year thumbnails**:
```
37.5 TB/day × 365 days × 5 years = 68.4 PB
```

**Total 5-Year Storage**:
```
Originals: 180 PB
Thumbnails: 68.4 PB
Total: 248.4 PB ≈ 250 PB
```

### Step 3: Request Rate

**Uploads**:
```
50M photos/day = 50M / 86400s ≈ 579 uploads/s
Peak (3x): 1,737 uploads/s
```

**Views** (assume 100:1 read:write ratio):
```
579 uploads/s × 100 = 57,900 reads/s
Peak: 173,700 reads/s
```

### Step 4: Bandwidth

**Upload Bandwidth**:
```
579 uploads/s × 2 MB = 1,158 MB/s ≈ 9.3 Gbps
Peak: 27.9 Gbps
```

**Download Bandwidth** (via CDN):
```
57,900 reads/s × 200 KB (avg thumbnail) = 11,580 MB/s ≈ 92.6 Gbps
Peak: 277.8 Gbps
```

### Step 5: S3 Cost Estimation

**Storage Cost** (5 years):

Tiered strategy:
- First 30 days: S3 Standard (hot photos)
- 30-365 days: S3 Standard-IA (warm)
- 365+ days: S3 Glacier (cold)

**Year 1**:
```
Average storage: 18 PB (half of 36 PB)

Standard (30 days): 3 PB × $0.023/GB × 1024³ GB/PB
  = 3 × 0.023 × 1,073,741,824 = $74M

Standard-IA (335 days): 15 PB × $0.0125/GB × 1024³ GB/PB
  = 15 × 0.0125 × 1,073,741,824 = $201M

Total Year 1: ~$275M
```

**Year 5 (cumulative)**:
```
Standard: 3 PB × $0.023 × 1024³ = $74M/year
Standard-IA: 33 PB × $0.0125 × 1024³ = $442M/year
Glacier: 180 PB × $0.0036 × 1024³ = $619M/year

Total Year 5: $1.135B/year
```

**Request Costs**:
```
PUT requests: 50M/day × 365 = 18.25B/year
Cost: 18.25B × $0.005/1000 = $91,250/year

GET requests (to S3, before CDN): 1% of total = 211B/year
Cost: 211B × $0.0004/1000 = $84,400/year

Total requests: ~$176K/year (negligible vs storage)
```

**Data Transfer** (uploads to S3):
```
100 TB/day × 365 = 36.5 PB/year
First 10 TB: Free
Rest: 36.49 PB × $0.09/GB × 1024³ = $3.5M/year
```

**CDN Cost** (CloudFront):
```
Bandwidth: 92.6 Gbps × 86400s = 8 PB/day = 2.92 EB/year

CloudFront pricing (~$0.085/GB for first 10 PB):
2.92 EB × $0.085/GB × 1024³ ≈ $265M/year
```

### Total Cost Summary (Year 5)

| Component | Cost/Year |
|-----------|-----------|
| S3 Storage | $1.135B |
| S3 Requests | $176K |
| S3 Data Transfer IN | $3.5M |
| CloudFront OUT | $265M |
| **TOTAL** | **$1.4B/year** |

### Optimization Strategies

**1. Compression** (reduce storage by 30%):
```
Savings: $1.135B × 0.3 = $340M/year
```

**2. Aggressive Lifecycle Policies**:
```
Move to Glacier after 180 days (not 365):
Savings: ~$200M/year
```

**3. Deduplication** (assume 5% duplicate uploads):
```
Savings: $1.135B × 0.05 = $57M/year
```

**4. Own CDN** (like Facebook):
```
Build global PoPs: High upfront cost ($100M+)
Operating cost: ~40% of CloudFront
Savings: $265M × 0.6 = $159M/year
Breakeven: < 1 year at scale
```

**Optimized Total**: ~$850M/year (40% reduction)

---

## 4. Data & Storage Design

### Object Key Design

**Bad Design** (hot partitions, no organization):
```
photos/12345.jpg
photos/67890.jpg
photos/11111.jpg
```

**Good Design** (distributed, hierarchical):
```
photos/{userId}/{year}/{month}/{photoId}.jpg

Example:
photos/user_987654/2024/03/abc123def456.jpg
photos/user_123456/2024/03/xyz789uvw012.jpg
```

**Benefits**:
- Even distribution across partitions
- Easy to query user's photos
- Lifecycle policies per user/date
- Efficient listing

### Metadata Strategy

Store metadata in separate database, not S3:

**DynamoDB Table** (PhotoMetadata):

```
{
  "PK": "USER#987654",
  "SK": "PHOTO#2024-03-15T14:30:00Z#abc123",
  "photoId": "abc123def456",
  "userId": "987654",
  "s3Key": "photos/user_987654/2024/03/abc123def456.jpg",
  "uploadedAt": "2024-03-15T14:30:00Z",
  "size": 2048576,
  "width": 1920,
  "height": 1080,
  "contentType": "image/jpeg",
  "thumbnails": {
    "small": "photos/user_987654/2024/03/thumbs/abc123_sm.jpg",
    "medium": "photos/user_987654/2024/03/thumbs/abc123_md.jpg",
    "large": "photos/user_987654/2024/03/thumbs/abc123_lg.jpg"
  },
  "tags": ["vacation", "beach"],
  "likes": 42,
  "comments": 7,
  "GSI1PK": "TAG#vacation",
  "GSI1SK": "2024-03-15T14:30:00Z"
}
```

**Indexes**:
- Primary: User's photos (newest first)
- GSI1: Photos by tag (for discovery)

**Why separate metadata?**
- Fast queries (no S3 listing)
- Rich querying capabilities
- Cost-effective (S3 GET costs add up)
- Atomic updates (likes, comments)

### CDN Integration

```
┌─────────────────────────────────────────────────────────────┐
│                  CDN + S3 ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Request                                                │
│      │                                                       │
│      ▼                                                       │
│  ┌─────────────────┐                                        │
│  │   CloudFront    │  Cache TTL: 1 year                     │
│  │  (200+ PoPs)    │  Cache Hit Ratio: 95%+                 │
│  └────────┬────────┘                                        │
│           │                                                  │
│           │ Cache Miss (5%)                                 │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │    S3 Bucket    │  Origin for CloudFront                 │
│  │  (us-east-1)    │  Origin Access Identity (OAI)          │
│  └─────────────────┘                                        │
│                                                              │
│  URL Format:                                                 │
│  https://d123456.cloudfront.net/photos/user_123/abc.jpg     │
│                                                              │
│  Benefits:                                                   │
│  • 95%+ cache hit (5% to S3)                                │
│  • Global low latency (<50ms P99)                           │
│  • HTTPS by default                                         │
│  • Custom domain support                                    │
│  • DDoS protection (AWS Shield)                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**CloudFront Configuration**:

```javascript
// CloudFormation template (simplified)
{
  "Type": "AWS::CloudFront::Distribution",
  "Properties": {
    "DistributionConfig": {
      "Origins": [
        {
          "Id": "S3Origin",
          "DomainName": "my-photos.s3.amazonaws.com",
          "S3OriginConfig": {
            "OriginAccessIdentity": "origin-access-identity/cloudfront/ABCDEFG"
          }
        }
      ],
      "DefaultCacheBehavior": {
        "TargetOriginId": "S3Origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
        "CachedMethods": ["GET", "HEAD"],
        "Compress": true,
        "DefaultTTL": 31536000, // 1 year
        "ForwardedValues": {
          "QueryString": false,
          "Cookies": { "Forward": "none" }
        }
      },
      "Enabled": true,
      "HttpVersion": "http2",
      "PriceClass": "PriceClass_All"
    }
  }
}
```

### Upload Flow Design

**Direct Upload (Bypass Server)**:

```
┌─────────────────────────────────────────────────────────────┐
│              DIRECT UPLOAD FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Client requests upload URL                              │
│     POST /api/photos/upload-url                             │
│     { "fileName": "photo.jpg", "contentType": "image/jpeg" }│
│                                                              │
│  2. API Server generates pre-signed URL                     │
│     ┌──────────────┐                                        │
│     │ API Server   │                                        │
│     │  • Generate  │                                        │
│     │    unique ID │                                        │
│     │  • Create    │                                        │
│     │    S3 URL    │                                        │
│     │  • Save      │                                        │
│     │    metadata  │                                        │
│     └──────────────┘                                        │
│     Response: {                                              │
│       "uploadUrl": "https://s3.../photo.jpg?...",           │
│       "photoId": "abc123"                                   │
│     }                                                        │
│                                                              │
│  3. Client uploads directly to S3                           │
│     PUT https://s3.../photo.jpg?...                         │
│     Body: <file bytes>                                      │
│                                                              │
│  4. S3 event triggers Lambda                                │
│     ┌──────────────┐                                        │
│     │   Lambda     │                                        │
│     │  • Validate  │                                        │
│     │  • Generate  │                                        │
│     │    thumbnails│                                        │
│     │  • Update    │                                        │
│     │    DynamoDB  │                                        │
│     └──────────────┘                                        │
│                                                              │
│  5. Client polls for processing status                      │
│     GET /api/photos/abc123/status                           │
│     Response: { "status": "ready", "url": "..." }           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**API Implementation**:

```javascript
const express = require('express');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const app = express();
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Request upload URL
app.post('/api/photos/upload-url', async (req, res) => {
  const { fileName, contentType } = req.body;
  const userId = req.user.id; // from auth middleware
  
  // Validate
  if (!['image/jpeg', 'image/png'].includes(contentType)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }
  
  // Generate unique ID
  const photoId = uuidv4();
  const timestamp = new Date().toISOString();
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(5, 7);
  
  const s3Key = `photos/user_${userId}/${year}/${month}/${photoId}.jpg`;
  
  // Generate pre-signed URL (15 minutes)
  const uploadUrl = s3.getSignedUrl('putObject', {
    Bucket: 'my-photos-bucket',
    Key: s3Key,
    Expires: 900,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      userId: userId,
      photoId: photoId
    }
  });
  
  // Save metadata (status: pending)
  await dynamodb.put({
    TableName: 'PhotoMetadata',
    Item: {
      PK: `USER#${userId}`,
      SK: `PHOTO#${timestamp}#${photoId}`,
      photoId,
      userId,
      s3Key,
      uploadedAt: timestamp,
      status: 'pending',
      fileName
    }
  }).promise();
  
  res.json({
    uploadUrl,
    photoId,
    expiresIn: 900
  });
});

// Check upload status
app.get('/api/photos/:photoId/status', async (req, res) => {
  const { photoId } = req.params;
  const userId = req.user.id;
  
  // Query DynamoDB (need GSI on photoId)
  const result = await dynamodb.query({
    TableName: 'PhotoMetadata',
    IndexName: 'PhotoIdIndex',
    KeyConditionExpression: 'photoId = :photoId',
    ExpressionAttributeValues: {
      ':photoId': photoId,
      ':userId': userId
    },
    FilterExpression: 'userId = :userId'
  }).promise();
  
  if (result.Items.length === 0) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  
  const photo = result.Items[0];
  
  res.json({
    photoId,
    status: photo.status, // pending, processing, ready, failed
    url: photo.status === 'ready' 
      ? `https://d123456.cloudfront.net/${photo.s3Key}`
      : null,
    thumbnails: photo.thumbnails
  });
});

app.listen(3000);
```

### Deduplication Strategy

Avoid storing duplicate files:

```javascript
const crypto = require('crypto');

// Calculate SHA-256 hash
function calculateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Check for duplicate before upload
app.post('/api/photos/upload-url', async (req, res) => {
  const { fileName, contentType, fileHash } = req.body; // client computes hash
  const userId = req.user.id;
  
  // Check if hash exists in DynamoDB
  const existingPhoto = await dynamodb.query({
    TableName: 'PhotoMetadata',
    IndexName: 'HashIndex',
    KeyConditionExpression: 'fileHash = :hash',
    ExpressionAttributeValues: {
      ':hash': fileHash
    },
    Limit: 1
  }).promise();
  
  if (existingPhoto.Items.length > 0) {
    // Duplicate found - create reference, not new upload
    const original = existingPhoto.Items[0];
    const photoId = uuidv4();
    
    await dynamodb.put({
      TableName: 'PhotoMetadata',
      Item: {
        PK: `USER#${userId}`,
        SK: `PHOTO#${new Date().toISOString()}#${photoId}`,
        photoId,
        userId,
        s3Key: original.s3Key, // reuse existing S3 object
        fileHash,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        isDuplicate: true,
        originalPhotoId: original.photoId
      }
    }).promise();
    
    return res.json({
      photoId,
      isDuplicate: true,
      url: `https://d123456.cloudfront.net/${original.s3Key}`
    });
  }
  
  // New file - proceed with normal upload flow
  // ... (existing upload URL generation code)
});
```

**Benefits**:
- 5-10% storage savings (typical for photo apps)
- Instant "upload" for duplicates
- Reduced S3 costs

---

## 5. Scalability & Reliability

### S3 Scalability Limits

**Per-Bucket Limits**:
- No object count limit
- No storage size limit
- 3,500 PUT/COPY/POST/DELETE per second per prefix
- 5,500 GET/HEAD per second per prefix

**Prefix Definition**:
```
s3://bucket/photos/2024/03/15/file.jpg
                  └────────┘
                    prefix
```

**Scaling Strategy**:

If hitting limits, use multiple prefixes:

```
# Bad (all in one prefix)
photos/user_123_photo1.jpg
photos/user_123_photo2.jpg
photos/user_123_photo3.jpg

# Good (distributed prefixes)
photos/2024/03/user_123_photo1.jpg  ← prefix: photos/2024/03/
photos/2024/04/user_456_photo2.jpg  ← prefix: photos/2024/04/
photos/2024/05/user_789_photo3.jpg  ← prefix: photos/2024/05/
```

### Multi-Region Architecture

For global applications:

```
┌─────────────────────────────────────────────────────────────┐
│           MULTI-REGION S3 ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   North America                  Europe                     │
│   ┌──────────────┐              ┌──────────────┐           │
│   │  S3 Bucket   │◄────────────►│  S3 Bucket   │           │
│   │  us-east-1   │ Replication  │  eu-west-1   │           │
│   └──────────────┘              └──────────────┘           │
│         │                              │                    │
│         │                              │                    │
│   ┌─────▼──────┐              ┌───────▼──────┐            │
│   │CloudFront  │              │ CloudFront   │            │
│   │   (edge)   │              │   (edge)     │            │
│   └────────────┘              └──────────────┘            │
│                                                             │
│   Users (US)                   Users (EU)                  │
│                                                             │
│   Benefits:                                                 │
│   • Data residency compliance (GDPR)                       │
│   • Lower latency (<50ms)                                  │
│   • Disaster recovery                                      │
│   • Regional failover                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Route53 Configuration** (Geolocation routing):

```json
{
  "Type": "A",
  "Name": "cdn.myapp.com",
  "GeoLocation": {
    "ContinentCode": "NA"
  },
  "AliasTarget": {
    "DNSName": "d123456.cloudfront.net",
    "HostedZoneId": "Z2FDTNDATAQYW2"
  }
}
```

### High Availability

S3 provides:
- **99.99% availability** (Standard)
- **99.5% availability** (One Zone-IA)

**Handling S3 Outages**:

```javascript
const AWS = require('aws-sdk');

// Configure retries with exponential backoff
const s3 = new AWS.S3({
  maxRetries: 5,
  retryDelayOptions: {
    base: 300 // Start with 300ms, then 600ms, 1200ms, ...
  },
  httpOptions: {
    timeout: 120000, // 2 minutes
    connectTimeout: 5000
  }
});

// Circuit breaker pattern
class S3CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.log('Circuit breaker opened');
    }
  }
}

const circuitBreaker = new S3CircuitBreaker();

// Use circuit breaker for S3 operations
async function getObject(bucket, key) {
  return circuitBreaker.execute(async () => {
    return s3.getObject({ Bucket: bucket, Key: key }).promise();
  });
}
```

### Backup & Disaster Recovery

**Backup Strategies**:

1. **Cross-Region Replication** (automated)
2. **Versioning** (protect against accidental deletes)
3. **S3 Inventory** (daily reports for auditing)
4. **AWS Backup** (centralized backup management)

**Recovery Time Objective (RTO)**:

```
Scenario 1: Accidental delete (versioning enabled)
  RTO: Minutes (restore version)

Scenario 2: Regional outage
  RTO: < 1 hour (failover to replica region)

Scenario 3: Account compromise
  RTO: Hours to days (restore from backup account)
```

---

## 6. Security & API Design

### Access Control

#### Bucket Policies

Restrict access by IP, VPC, or condition:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ABCDEFG"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "RestrictToVPC",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:SourceVpce": "vpce-1234567"
        }
      }
    }
  ]
}
```

#### IAM Policies

Grant access to specific users/roles:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/uploads/user_${aws:userid}/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::my-bucket",
      "Condition": {
        "StringLike": {
          "s3:prefix": "uploads/user_${aws:userid}/*"
        }
      }
    }
  ]
}
```

### Encryption

#### Server-Side Encryption (SSE)

**SSE-S3** (S3-managed keys):
```javascript
await s3.putObject({
  Bucket: 'my-bucket',
  Key: 'file.txt',
  Body: buffer,
  ServerSideEncryption: 'AES256'
}).promise();
```

**SSE-KMS** (AWS KMS):
```javascript
await s3.putObject({
  Bucket: 'my-bucket',
  Key: 'file.txt',
  Body: buffer,
  ServerSideEncryption: 'aws:kms',
  SSEKMSKeyId: 'arn:aws:kms:us-east-1:123456789:key/abc-123'
}).promise();
```

**SSE-C** (Customer-provided keys):
```javascript
const crypto = require('crypto');
const key = crypto.randomBytes(32); // 256-bit key

await s3.putObject({
  Bucket: 'my-bucket',
  Key: 'file.txt',
  Body: buffer,
  SSECustomerAlgorithm: 'AES256',
  SSECustomerKey: key.toString('base64'),
  SSECustomerKeyMD5: crypto.createHash('md5').update(key).digest('base64')
}).promise();
```

#### Client-Side Encryption

Encrypt before upload:

```javascript
const crypto = require('crypto');

function encryptFile(buffer, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);
  
  return {
    encrypted,
    iv: iv.toString('base64')
  };
}

function decryptFile(encryptedBuffer, key, ivBase64) {
  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  return Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final()
  ]);
}

// Usage
const key = crypto.scryptSync('password', 'salt', 32);
const file = fs.readFileSync('document.pdf');

const { encrypted, iv } = encryptFile(file, key);

// Upload encrypted file
await s3.putObject({
  Bucket: 'my-bucket',
  Key: 'document.pdf.enc',
  Body: encrypted,
  Metadata: { iv } // Store IV in metadata
}).promise();

// Download and decrypt
const response = await s3.getObject({
  Bucket: 'my-bucket',
  Key: 'document.pdf.enc'
}).promise();

const decrypted = decryptFile(
  response.Body,
  key,
  response.Metadata.iv
);
```

### Access Logs

Enable S3 access logging:

```javascript
await s3.putBucketLogging({
  Bucket: 'my-bucket',
  BucketLoggingStatus: {
    LoggingEnabled: {
      TargetBucket: 'my-logs-bucket',
      TargetPrefix: 's3-access-logs/'
    }
  }
}).promise();
```

**Log Format**:
```
79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be 
my-bucket [06/Feb/2024:00:00:01 +0000] 
192.0.2.3 
79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be 
3E57427F3EXAMPLE 
REST.GET.OBJECT 
photos/user_123/photo.jpg 
"GET /my-bucket/photos/user_123/photo.jpg HTTP/1.1" 
200 
- 
2662992 
12 
- 
"-" 
"Mozilla/5.0" 
- 
s9lzHYrFp76ZVxRcpX9+5cjAnEH2ROuNkd2BHfIa6UkFVdtjf5mKR3/eTPFvsiP/XV/VLi31234=
```

### Object Lock (WORM)

Prevent deletion/modification:

```javascript
// Enable Object Lock (bucket creation only)
await s3.createBucket({
  Bucket: 'my-immutable-bucket',
  ObjectLockEnabledForBucket: true
}).promise();

// Upload with retention
await s3.putObject({
  Bucket: 'my-immutable-bucket',
  Key: 'legal-doc.pdf',
  Body: buffer,
  ObjectLockMode: 'GOVERNANCE', // or 'COMPLIANCE'
  ObjectLockRetainUntilDate: new Date('2030-01-01')
}).promise();
```

**Modes**:
- **GOVERNANCE**: Can be overridden by privileged users
- **COMPLIANCE**: Cannot be deleted/modified by anyone (even root)

---

## 7. Real-World Examples

### Example 1: Netflix Video Storage

**Challenge**: Store and serve petabytes of video content globally with high availability and low latency.

**Requirements**:
- 250+ million subscribers
- 17,000+ titles
- Multiple quality levels (4K, 1080p, 720p, etc.)
- 200+ countries
- 99.99% availability
- < 2 second video start time

**Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│           NETFLIX VIDEO STORAGE ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Content Ingestion                                           │
│  ┌────────────┐                                             │
│  │  Original  │                                             │
│  │   Video    │                                             │
│  └──────┬─────┘                                             │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────┐                                             │
│  │ Encoding   │ • Multiple bitrates (4K → 240p)            │
│  │ Pipeline   │ • Multiple codecs (H.264, VP9, AV1)        │
│  │ (AWS)      │ • Audio tracks (languages, 5.1, Atmos)     │
│  └──────┬─────┘                                             │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────────┐                    │
│  │        S3 Storage (Origin)         │                    │
│  │  • Multi-region buckets            │                    │
│  │  • S3 Standard (hot content)       │                    │
│  │  • S3 Glacier (archive)            │                    │
│  │  • Total: ~15 PB                   │                    │
│  └──────┬─────────────────────────────┘                    │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────────┐                    │
│  │   Open Connect CDN (Netflix CDN)   │                    │
│  │  • 17,000+ servers                 │                    │
│  │  • Located in ISP networks         │                    │
│  │  • Serves 95% of traffic           │                    │
│  │  • Proactive caching               │                    │
│  └────────────────────────────────────┘                    │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────┐                                             │
│  │   Users    │                                             │
│  └────────────┘                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Storage Strategy**:

1. **Encoding Output**:
   - 1 movie (2 hours) = ~100 GB source
   - Encode to 10 quality levels = ~50 GB total (compressed)
   - Multiple audio/subtitle tracks = +10 GB
   - Total per title: ~60 GB

2. **Total Storage**:
   ```
   17,000 titles × 60 GB = 1.02 PB (originals)
   Add TV shows (5x more content): ~5 PB
   Replicate across 3 regions: 15 PB total
   ```

3. **S3 Configuration**:
   ```javascript
   // Bucket structure
   s3://netflix-videos-us-east-1/
     titles/
       tt0111161/  (Shawshank Redemption)
         video/
           4k_10mbps.mp4
           1080p_5mbps.mp4
           720p_3mbps.mp4
           ...
         audio/
           en_5.1.aac
           es_5.1.aac
           ...
         subtitles/
           en.vtt
           es.vtt
   ```

4. **Lifecycle Policy**:
   ```json
   {
     "Rules": [
       {
         "Id": "Archive old content",
         "Status": "Enabled",
         "Filter": {
           "And": {
             "Prefix": "titles/",
             "Tags": [
               { "Key": "popularity", "Value": "low" }
             ]
           }
         },
         "Transitions": [
           {
             "Days": 90,
             "StorageClass": "GLACIER"
           }
         ]
       }
     ]
   }
   ```

**CDN Strategy (Open Connect)**:

Netflix built its own CDN to reduce costs and improve performance:

```
Traditional CDN Cost: 
  15 PB × 1000 requests/sec/PB × $0.02/10K requests = $260M/year
  + Bandwidth: 100 Tbps × $0.08/GB × 86400s = $700M/year
  Total: ~$960M/year

Open Connect Cost:
  Server hardware: $10K × 17,000 = $170M (one-time)
  ISP co-location: Free (ISPs benefit from reduced transit costs)
  Operating cost: ~$100M/year
  
Savings: $860M/year
```

**Results**:
- 95%+ cache hit ratio (CDN)
- < 1 second video start time (P50)
- < 2 seconds (P99)
- 99.99% availability
- $860M+ annual savings vs traditional CDN

---

### Example 2: Dropbox File Storage

**Challenge**: Store billions of user files with high durability, version history, and efficient sync.

**Scale**:
- 700+ million users
- 600+ million files uploaded daily
- 1+ exabyte of data stored
- 99.999999999% durability requirement

**Architecture Evolution**:

**Phase 1 (2007-2016): S3-Based**

```
┌─────────────────────────────────────────────────────────────┐
│              DROPBOX ON S3 (2007-2016)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client                                                      │
│     │                                                        │
│     ▼                                                        │
│  ┌────────────┐                                             │
│  │ API Server │ • Chunking (4 MB blocks)                    │
│  │            │ • Deduplication                             │
│  └──────┬─────┘                                             │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────┐                                             │
│  │  Metadata  │ • PostgreSQL                                │
│  │  Database  │ • File→Chunks mapping                       │
│  └────────────┘                                             │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────────┐                    │
│  │          AWS S3 Storage            │                    │
│  │  • Multi-region replication        │                    │
│  │  • ~90% of storage cost            │                    │
│  └────────────────────────────────────┘                    │
│                                                              │
│  Cost: ~$75M/year for 500 PB                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Phase 2 (2016+): Custom Storage (Magic Pocket)**

Dropbox migrated from S3 to its own storage system:

```
┌─────────────────────────────────────────────────────────────┐
│         DROPBOX MAGIC POCKET (Custom Storage)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────┐                │
│  │      Custom Data Centers (Own)         │                │
│  │  ┌──────────┐  ┌──────────┐           │                │
│  │  │ Storage  │  │ Storage  │  ...      │                │
│  │  │  Cell 1  │  │  Cell 2  │           │                │
│  │  │          │  │          │           │                │
│  │  │ • SMR    │  │ • SMR    │           │                │
│  │  │   Disks  │  │   Disks  │           │                │
│  │  │ • Reed-  │  │ • Reed-  │           │                │
│  │  │   Solomon│  │   Solomon│           │                │
│  │  │ • 3x     │  │ • 3x     │           │                │
│  │  │   replica│  │   replica│           │                │
│  │  └──────────┘  └──────────┘           │                │
│  └────────────────────────────────────────┘                │
│                                                              │
│  Technology:                                                 │
│  • SMR (Shingled Magnetic Recording) drives                │
│  • Reed-Solomon erasure coding (RS 10+4)                   │
│  • Custom file system (XFS optimized)                      │
│  • Disintegrated architecture (decoupled)                  │
│                                                              │
│  Cost Savings:                                               │
│  • S3 cost: $0.023/GB/month = $276/TB/year                 │
│  • Magic Pocket: ~$50/TB/year (TCO)                        │
│  • 5.5x reduction                                           │
│  • Annual savings: $75M → $13.6M (for 1 EB)                │
│  • Total savings: ~$60M/year                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Why Migrate from S3?**

1. **Cost**: At exabyte scale, hardware costs < S3 costs
2. **Control**: Custom optimizations for workload
3. **Performance**: Tailored for sequential writes (append-only)
4. **Durability**: Reed-Solomon coding more efficient than replication

**Deduplication Strategy**:

```javascript
// Content-based chunking (Rabin fingerprint)
function chunkFile(fileBuffer) {
  const chunks = [];
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB
  
  for (let i = 0; i < fileBuffer.length; i += CHUNK_SIZE) {
    const chunk = fileBuffer.slice(i, i + CHUNK_SIZE);
    const hash = crypto.createHash('sha256').update(chunk).digest('hex');
    
    chunks.push({
      hash,
      size: chunk.length,
      data: chunk
    });
  }
  
  return chunks;
}

// Upload only new chunks
async function uploadFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const chunks = chunkFile(fileBuffer);
  
  // Check which chunks already exist
  const existingHashes = await db.query(
    'SELECT hash FROM chunks WHERE hash = ANY($1)',
    [chunks.map(c => c.hash)]
  );
  const existingSet = new Set(existingHashes.rows.map(r => r.hash));
  
  // Upload only new chunks
  for (const chunk of chunks) {
    if (!existingSet.has(chunk.hash)) {
      await s3.putObject({
        Bucket: 'dropbox-blocks',
        Key: `chunks/${chunk.hash}`,
        Body: chunk.data
      }).promise();
      
      await db.query(
        'INSERT INTO chunks (hash, size) VALUES ($1, $2)',
        [chunk.hash, chunk.size]
      );
    }
  }
  
  // Save file metadata
  const fileId = uuidv4();
  await db.query(
    'INSERT INTO files (id, path, chunks) VALUES ($1, $2, $3)',
    [fileId, filePath, JSON.stringify(chunks.map(c => c.hash))]
  );
  
  return fileId;
}
```

**Deduplication Savings**:
```
Average deduplication ratio: 3:1
Storage needed: 1 EB / 3 = 333 PB
Cost savings: 667 PB × $50/TB = $33M/year
```

**Results**:
- Successfully migrated 600+ PB from S3 to Magic Pocket
- 5.5x cost reduction
- Maintained 99.999999999% durability
- Improved upload/download performance by 20%
- Full control over infrastructure

---

### Example 3: Airbnb Photo Storage

**Challenge**: Store and serve millions of property photos with fast uploads and optimized delivery.

**Requirements**:
- 7+ million listings
- Average 20 photos per listing = 140M photos
- Upload 100K+ new photos daily
- Multiple resolutions for responsive images
- Global CDN delivery
- < 100ms image load time (P99)

**Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│            AIRBNB PHOTO STORAGE ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Upload Flow                                             │
│     ┌──────────┐                                            │
│     │  Host    │                                            │
│     │ (Browser)│                                            │
│     └────┬─────┘                                            │
│          │                                                   │
│          │ 1. Request upload URL                            │
│          ▼                                                   │
│     ┌──────────┐                                            │
│     │   API    │ 2. Generate pre-signed URL                │
│     │  Server  │    + Create placeholder in DB             │
│     └────┬─────┘                                            │
│          │ 3. Return upload URL                             │
│          ▼                                                   │
│     ┌──────────┐                                            │
│     │  Host    │ 4. Direct upload to S3                    │
│     └────┬─────┘    (multipart for large files)            │
│          │                                                   │
│          ▼                                                   │
│     ┌──────────────────────────────────┐                   │
│     │      S3 Bucket (originals)       │                   │
│     │  • S3 Standard                   │                   │
│     │  • Versioning enabled            │                   │
│     └────┬─────────────────────────────┘                   │
│          │                                                   │
│          │ 5. S3 event → Lambda                             │
│          ▼                                                   │
│     ┌──────────────────────────────────┐                   │
│     │     Lambda (Image Processing)    │                   │
│     │  • Validate (malware, content)   │                   │
│     │  • EXIF strip (privacy)          │                   │
│     │  • Generate 6 sizes:             │                   │
│     │    - Thumbnail (150x150)         │                   │
│     │    - Small (320x240)             │                   │
│     │    - Medium (640x480)            │                   │
│     │    - Large (1024x768)            │                   │
│     │    - XLarge (1920x1440)          │                   │
│     │    - Original (max 4K)           │                   │
│     │  • WebP conversion               │                   │
│     │  • Compress (80% quality)        │                   │
│     └────┬─────────────────────────────┘                   │
│          │                                                   │
│          ▼                                                   │
│     ┌──────────────────────────────────┐                   │
│     │   S3 Bucket (processed)          │                   │
│     │  • S3 Standard (hot)             │                   │
│     │  • Lifecycle → IA after 60 days  │                   │
│     └────┬─────────────────────────────┘                   │
│          │                                                   │
│          ▼                                                   │
│     ┌──────────────────────────────────┐                   │
│     │     CloudFront CDN               │                   │
│     │  • 200+ edge locations           │                   │
│     │  • Custom domain: a0.muscache... │                   │
│     │  • Image optimization at edge    │                   │
│     │  • Lazy loading support          │                   │
│     └──────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Lambda Processing Function**:

```javascript
const AWS = require('aws-sdk');
const sharp = require('sharp');

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, fit: 'cover' },
  small: { width: 320, height: 240, fit: 'inside' },
  medium: { width: 640, height: 480, fit: 'inside' },
  large: { width: 1024, height: 768, fit: 'inside' },
  xlarge: { width: 1920, height: 1440, fit: 'inside' }
};

exports.handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key);
  
  console.log(`Processing: ${bucket}/${key}`);
  
  // Download original
  const original = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  
  // Validate
  const image = sharp(original.Body);
  const metadata = await image.metadata();
  
  if (metadata.width > 4096 || metadata.height > 4096) {
    throw new Error('Image too large');
  }
  
  // Strip EXIF (privacy)
  const stripped = await image
    .rotate() // Auto-rotate based on EXIF
    .withMetadata({ exif: {} }) // Remove EXIF
    .toBuffer();
  
  // Generate multiple sizes
  const processedBucket = process.env.PROCESSED_BUCKET;
  const baseKey = key.replace('originals/', '');
  
  const uploadPromises = Object.entries(IMAGE_SIZES).map(async ([size, config]) => {
    // JPEG version
    const jpegBuffer = await sharp(stripped)
      .resize(config.width, config.height, { fit: config.fit })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
    
    await s3.putObject({
      Bucket: processedBucket,
      Key: `photos/${size}/${baseKey}`,
      Body: jpegBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'max-age=31536000' // 1 year
    }).promise();
    
    // WebP version (modern browsers)
    const webpBuffer = await sharp(stripped)
      .resize(config.width, config.height, { fit: config.fit })
      .webp({ quality: 80 })
      .toBuffer();
    
    await s3.putObject({
      Bucket: processedBucket,
      Key: `photos/${size}/${baseKey.replace('.jpg', '.webp')}`,
      Body: webpBuffer,
      ContentType: 'image/webp',
      CacheControl: 'max-age=31536000'
    }).promise();
    
    return {
      size,
      jpeg: `https://cdn.airbnb.com/photos/${size}/${baseKey}`,
      webp: `https://cdn.airbnb.com/photos/${size}/${baseKey.replace('.jpg', '.webp')}`,
      width: (await sharp(jpegBuffer).metadata()).width,
      height: (await sharp(jpegBuffer).metadata()).height,
      fileSize: jpegBuffer.length
    };
  });
  
  const sizes = await Promise.all(uploadPromises);
  
  // Update DynamoDB
  const photoId = baseKey.split('/').pop().replace('.jpg', '');
  await dynamodb.update({
    TableName: 'Photos',
    Key: { photoId },
    UpdateExpression: 'SET #status = :ready, sizes = :sizes, processedAt = :now',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':ready': 'ready',
      ':sizes': sizes,
      ':now': new Date().toISOString()
    }
  }).promise();
  
  console.log(`Processed ${sizes.length * 2} variants`);
  
  return { statusCode: 200, body: { photoId, sizes } };
};
```

**Responsive Image HTML**:

```html
<picture>
  <!-- WebP for modern browsers -->
  <source 
    type="image/webp"
    srcset="https://cdn.airbnb.com/photos/small/listing123.webp 320w,
            https://cdn.airbnb.com/photos/medium/listing123.webp 640w,
            https://cdn.airbnb.com/photos/large/listing123.webp 1024w"
    sizes="(max-width: 640px) 320px, 
           (max-width: 1024px) 640px, 
           1024px"
  >
  
  <!-- JPEG fallback -->
  <img 
    srcset="https://cdn.airbnb.com/photos/small/listing123.jpg 320w,
            https://cdn.airbnb.com/photos/medium/listing123.jpg 640w,
            https://cdn.airbnb.com/photos/large/listing123.jpg 1024w"
    sizes="(max-width: 640px) 320px, 
           (max-width: 1024px) 640px, 
           1024px"
    src="https://cdn.airbnb.com/photos/medium/listing123.jpg"
    alt="Beautiful apartment in Paris"
    loading="lazy"
  >
</picture>
```

**Cost Breakdown** (for 140M photos):

```
Original photos: 140M × 3 MB = 420 TB
  S3 Standard: 420 TB × $0.023/GB × 1024 = $9,892/month

Processed photos (6 sizes × 2 formats): 140M × 12 × 500 KB = 840 TB
  S3 Standard (60 days): 70 TB × $0.023 × 1024 = $1,649/month
  S3 Standard-IA (rest): 770 TB × $0.0125 × 1024 = $9,830/month

Lambda executions: 100K/day × 30 × 5s each = 15M seconds
  Cost: 15M × $0.0000166667 = $250/month

CloudFront: 100 TB/month × $0.085/GB × 1024 = $8,704/month

Total: ~$30K/month = $360K/year
```

**Results**:
- < 50ms image load time (P50)
- < 100ms (P99)
- 98%+ CDN cache hit ratio
- 30% bandwidth savings with WebP
- Fully automated processing pipeline
- < 5 minutes upload → live time

---

## 8. Interview Q&A

### Q1: Design a system to store and serve user profile pictures for a social network with 100M users.

**Answer**:

**Requirements Clarification**:
- 100M users
- Assume 50% have profile pictures = 50M photos
- Average size: 500 KB
- Upload rate: 1M uploads/month
- Read:write ratio: 100:1
- Need thumbnails (50x50, 200x200)
- Global audience

**Capacity Estimation**:

```
Storage:
  50M photos × 500 KB = 25 TB
  Thumbnails: 50M × (small 5KB + large 50KB) = 2.75 TB
  Total: ~28 TB

Requests:
  Uploads: 1M/month = 1M / (30 × 86400) ≈ 0.4 uploads/s
  Reads: 0.4 × 100 = 40 reads/s

Bandwidth:
  Upload: 0.4 uploads/s × 500 KB = 200 KB/s
  Download: 40 reads/s × 50 KB (thumbnail avg) = 2 MB/s
```

**Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│         PROFILE PICTURE STORAGE SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Upload API                                               │
│     POST /api/users/{userId}/profile-picture                │
│     • Validate: size < 10 MB, type = image/*                │
│     • Generate pre-signed S3 URL                            │
│     • Return URL + photoId                                  │
│                                                              │
│  2. Client uploads directly to S3                           │
│     PUT https://s3.../profile-pics/{userId}/{photoId}.jpg   │
│                                                              │
│  3. S3 Event → Lambda                                       │
│     • Validate image                                        │
│     • Generate thumbnails:                                  │
│       - Small (50x50) for lists                            │
│       - Large (200x200) for profiles                       │
│     • Update DynamoDB:                                      │
│       Users table → profilePictureUrl                       │
│     • Invalidate CDN cache                                  │
│                                                              │
│  4. Serve via CloudFront                                    │
│     GET https://cdn.myapp.com/profiles/user123_large.jpg    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Data Model (DynamoDB)**:

```javascript
// Users Table
{
  "PK": "USER#123456",
  "userId": "123456",
  "username": "john_doe",
  "profilePicture": {
    "photoId": "abc123",
    "small": "https://cdn.myapp.com/profiles/user123456_sm.jpg",
    "large": "https://cdn.myapp.com/profiles/user123456_lg.jpg",
    "uploadedAt": "2024-03-15T10:30:00Z"
  },
  "email": "john@example.com"
}
```

**S3 Bucket Structure**:

```
my-app-profile-pics/
  originals/
    user_123456/
      abc123.jpg
  processed/
    small/
      user_123456_sm.jpg
    large/
      user_123456_lg.jpg
```

**Key Design Decisions**:

1. **Pre-signed URLs**: Bypass server for uploads (reduce latency, save bandwidth)

2. **Separate Metadata**: DynamoDB for fast queries, S3 for blobs

3. **CDN Caching**: Long TTL (1 year) with cache invalidation on update

4. **Lazy Thumbnail Generation**: Only generate on first upload, not every view

5. **Lifecycle Policy**: 
   ```json
   {
     "Rules": [
       {
         "Id": "Delete old versions",
         "Status": "Enabled",
         "Filter": { "Prefix": "originals/" },
         "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
       }
     ]
   }
   ```

**Scalability**:

- S3 handles 3,500 PUT/s per prefix (far exceeds 0.4/s)
- CloudFront serves from edge (no S3 load)
- Lambda auto-scales (1000 concurrent by default)
- DynamoDB on-demand pricing scales automatically

**Cost** (monthly):

```
S3 Storage: 28 TB × $0.023/GB × 1024 = $660
S3 Requests: 1M PUT × $0.005/1000 = $5
Lambda: 1M executions × 2s × $0.0000166667 = $33
CloudFront: 5 TB × $0.085/GB × 1024 = $436
DynamoDB: 100M reads × $0.25/M = $25

Total: ~$1,159/month = $14K/year
```

**Follow-up Questions**:

**Q: How would you handle profile picture changes (updating)?**

A: 
1. Generate new photoId on each upload (immutable objects)
2. Update DynamoDB with new URLs
3. Invalidate CloudFront cache:
   ```javascript
   const cloudfront = new AWS.CloudFront();
   await cloudfront.createInvalidation({
     DistributionId: 'E123456',
     InvalidationBatch: {
       CallerReference: Date.now().toString(),
       Paths: {
         Quantity: 2,
         Items: [
           `/profiles/user_123456_sm.jpg`,
           `/profiles/user_123456_lg.jpg`
         ]
       }
     }
   }).promise();
   ```
4. Old versions eventually deleted by lifecycle policy

**Q: How would you detect and block inappropriate images?**

A:
1. AWS Rekognition in Lambda:
   ```javascript
   const rekognition = new AWS.Rekognition();
   
   const result = await rekognition.detectModerationLabels({
     Image: {
       S3Object: {
         Bucket: bucket,
         Name: key
       }
     },
     MinConfidence: 75
   }).promise();
   
   const inappropriate = result.ModerationLabels.some(
     label => ['Explicit Nudity', 'Violence'].includes(label.Name)
   );
   
   if (inappropriate) {
     // Delete from S3
     await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
     
     // Mark in DynamoDB
     await dynamodb.update({
       TableName: 'Users',
       Key: { PK: `USER#${userId}` },
       UpdateExpression: 'SET profilePicture.#status = :blocked',
       ExpressionAttributeNames: { '#status': 'status' },
       ExpressionAttributeValues: { ':blocked': 'blocked' }
     }).promise();
     
     throw new Error('Inappropriate content detected');
   }
   ```

---

### Q2: How would you optimize S3 costs for a data lake storing 10 PB of data?

**Answer**:

**Current State**:
- 10 PB = 10,485,760 GB
- S3 Standard cost: 10,485,760 GB × $0.023/GB/month = $241,172/month = $2.9M/year

**Optimization Strategies**:

**1. Implement Intelligent Tiering**

Automatically move data between access tiers:

```json
{
  "Rules": [
    {
      "Id": "Enable Intelligent-Tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Transitions": [
        {
          "Days": 0,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ]
    }
  ]
}
```

**Savings**: 
- Frequently accessed (10%): $0.023/GB
- Infrequently accessed (90%): $0.0125/GB
- Average: (0.1 × $0.023) + (0.9 × $0.0125) = $0.01355/GB
- New cost: $1.7M/year
- **Savings: $1.2M/year (41%)**

**2. Aggressive Lifecycle Policies**

Based on access patterns:

```json
{
  "Rules": [
    {
      "Id": "Archive old data",
      "Status": "Enabled",
      "Filter": { "Prefix": "raw-logs/" },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    },
    {
      "Id": "Delete expired data",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

**Distribution**:
- Standard (90 days): 10% = 1 PB → $241K/year
- Glacier (275 days): 30% = 3 PB → $113K/year
- Deep Archive (3+ years): 60% = 6 PB → $62K/year
- **Total: $416K/year**
- **Savings: $2.5M/year (85%)**

**3. Compression**

Compress data before storing:

```javascript
const zlib = require('zlib');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async function uploadCompressed(bucket, key, data) {
  const compressed = await new Promise((resolve, reject) => {
    zlib.gzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
  
  await s3.putObject({
    Bucket: bucket,
    Key: `${key}.gz`,
    Body: compressed,
    ContentEncoding: 'gzip',
    Metadata: {
      originalSize: data.length.toString(),
      compressedSize: compressed.length.toString()
    }
  }).promise();
  
  console.log(`Compression ratio: ${(data.length / compressed.length).toFixed(2)}x`);
}
```

**Typical Compression Ratios**:
- JSON logs: 5-10x
- CSV data: 3-5x
- Text logs: 4-8x
- Binary data: 1.5-2x

**Average**: 4x compression
- New storage needed: 10 PB / 4 = 2.5 PB
- Cost: $416K / 4 = $104K/year
- **Savings: $2.8M/year (96%)**

**4. Data Deduplication**

Identify and eliminate duplicates:

```python
import boto3
import hashlib
from collections import defaultdict

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('FileHashes')

def find_duplicates(bucket):
    hash_to_keys = defaultdict(list)
    total_size = 0
    duplicate_size = 0
    
    # List all objects
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=bucket):
        for obj in page.get('Contents', []):
            key = obj['Key']
            size = obj['Size']
            
            # Get object metadata (should include hash)
            metadata = s3.head_object(Bucket=bucket, Key=key)
            file_hash = metadata['Metadata'].get('content-md5')
            
            if not file_hash:
                # Download and compute hash (expensive!)
                response = s3.get_object(Bucket=bucket, Key=key)
                content = response['Body'].read()
                file_hash = hashlib.md5(content).hexdigest()
            
            hash_to_keys[file_hash].append((key, size))
            total_size += size
            
            # If duplicate, mark for deletion
            if len(hash_to_keys[file_hash]) > 1:
                duplicate_size += size
    
    print(f'Total size: {total_size / 1024**4:.2f} TB')
    print(f'Duplicate size: {duplicate_size / 1024**4:.2f} TB')
    print(f'Dedup ratio: {total_size / (total_size - duplicate_size):.2f}x')
    
    return hash_to_keys

# Usage
duplicates = find_duplicates('my-data-lake')

# Keep first copy, delete rest
for file_hash, keys in duplicates.items():
    if len(keys) > 1:
        keep = keys[0][0]  # Keep first
        delete = [k[0] for k in keys[1:]]  # Delete rest
        
        print(f'Keeping: {keep}')
        for key in delete:
            print(f'  Deleting duplicate: {key}')
            # s3.delete_object(Bucket='my-data-lake', Key=key)
```

**Typical Deduplication**:
- 5-15% duplicates (data lakes)
- Assume 10% = 1 PB duplicates
- **Savings: $104K × 0.1 = $10K/year**

**5. Parquet Columnar Format**

Convert JSON/CSV to Parquet:

```python
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# Convert CSV to Parquet
df = pd.read_csv('s3://my-bucket/data.csv')
table = pa.Table.from_pandas(df)

pq.write_table(
    table,
    's3://my-bucket/data.parquet',
    compression='snappy',
    use_dictionary=True,
    use_deprecated_int96_timestamps=False
)

# Typical savings: 10x compression
# 10 PB CSV → 1 PB Parquet
# Also: 10-100x faster queries (columnar)
```

**6. S3 Select / Athena**

Query data in-place (no need to download):

```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async function queryS3(bucket, key, sql) {
  const params = {
    Bucket: bucket,
    Key: key,
    ExpressionType: 'SQL',
    Expression: sql,
    InputSerialization: {
      CSV: { FileHeaderInfo: 'USE', RecordDelimiter: '\n' },
      CompressionType: 'GZIP'
    },
    OutputSerialization: {
      JSON: { RecordDelimiter: '\n' }
    }
  };
  
  const result = await s3.selectObjectContent(params).promise();
  
  // Stream results
  for await (const event of result.Payload) {
    if (event.Records) {
      console.log(event.Records.Payload.toString());
    }
  }
}

// Usage
queryS3(
  'my-data-lake',
  'logs/2024-03-15.csv.gz',
  'SELECT * FROM S3Object WHERE status = 500 LIMIT 100'
);
```

**Savings**:
- Data transfer out: $0.09/GB
- Querying 10 PB without S3 Select: 10 PB × $0.09/GB × 1024³ = $966K
- With S3 Select (filter 99%): 0.1 PB × $0.09/GB × 1024³ = $9.7K
- **Savings: $956K/year**

**Total Optimization Summary**:

| Strategy | Savings | New Cost |
|----------|---------|----------|
| Baseline | - | $2.9M/year |
| Intelligent Tiering | $1.2M | $1.7M |
| Lifecycle Policies | $2.5M | $416K |
| Compression | $312K | $104K |
| Deduplication | $10K | $94K |
| S3 Select | $956K | Minimal |

**Final Cost**: ~$94K/year (97% reduction!)

---

### Q3: Explain how S3 achieves 99.999999999% (11 9s) durability.

**Answer**:

**Durability Definition**:

99.999999999% = 1 - 0.00000000001
= 1 in 100 billion chance of data loss per year

**Meaning**: If you store 10 million objects, you can expect to lose 1 object every 10,000 years.

**Implementation Mechanisms**:

**1. Multi-AZ Replication**

Every object replicated across ≥3 Availability Zones:

```
┌─────────────────────────────────────────────────────────────┐
│              S3 MULTI-AZ REPLICATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PUT /bucket/file.txt                                        │
│      │                                                       │
│      ├─────────────► AZ-1 (Copy 1) ✓                        │
│      │                                                       │
│      ├─────────────► AZ-2 (Copy 2) ✓                        │
│      │                                                       │
│      └─────────────► AZ-3 (Copy 3) ✓                        │
│                                                              │
│  Write confirmed only when ≥2 AZs acknowledge               │
│  (Quorum write)                                             │
│                                                              │
│  Probability of all 3 AZs failing simultaneously:           │
│  P(AZ failure) = 0.001 (0.1%)                               │
│  P(3 AZ failures) = 0.001³ = 0.000000001 = 1 in 1B         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**2. Erasure Coding**

For efficiency, S3 uses Reed-Solomon erasure coding instead of full replication:

```
Original Data: 1 GB
Split into: 10 data chunks + 4 parity chunks = 14 chunks (73 MB each)

Can lose ANY 4 chunks and still reconstruct original data

Storage overhead: 14/10 = 1.4x (vs 3x for replication)
Durability: Even better than 3x replication
```

**Mathematical Calculation**:

```
Assumptions:
- Annual disk failure rate: 4% (AFR)
- 3 copies across 3 AZs
- Independent failures

Probability of losing all 3 copies in 1 year:
P(loss) = P(disk1 fails) × P(disk2 fails) × P(disk3 fails)
        = 0.04 × 0.04 × 0.04
        = 0.000064 = 1 in 15,625

But S3 has additional protections:
- RAID within AZ
- Checksums every read/write
- Continuous background verification
- Automated repair

Effective P(loss) < 0.00000000001 = 11 9s
```

**3. Continuous Integrity Verification**

```javascript
// Simplified model of S3's background process

async function verifyIntegrity() {
  while (true) {
    // Check random sample of objects daily
    const objects = await listRandomObjects(1000000); // 1M objects/day
    
    for (const obj of objects) {
      const copies = await getAllCopies(obj.key);
      
      // Verify checksums
      for (const copy of copies) {
        const actualChecksum = await computeChecksum(copy.data);
        if (actualChecksum !== copy.storedChecksum) {
          console.log(`Corruption detected: ${obj.key} in ${copy.az}`);
          
          // Repair from healthy copy
          const healthyCopy = copies.find(c => c.isHealthy);
          await replaceBadCopy(copy.az, obj.key, healthyCopy.data);
        }
      }
      
      // Ensure ≥3 healthy copies
      if (copies.filter(c => c.isHealthy).length < 3) {
        await replicateObject(obj.key);
      }
    }
    
    await sleep(24 * 60 * 60 * 1000); // Daily
  }
}
```

**4. Versioning & MFA Delete**

Protect against logical failures (accidental delete, overwrite):

```javascript
// Enable versioning
await s3.putBucketVersioning({
  Bucket: 'my-critical-bucket',
  VersioningConfiguration: {
    Status: 'Enabled',
    MFADelete: 'Enabled' // Require MFA to delete versions
  },
  MFA: 'arn:aws:iam::123456789:mfa/root-account-mfa-device 123456' // MFA code
}).promise();

// All PUTs create new version
await s3.putObject({
  Bucket: 'my-critical-bucket',
  Key: 'important.txt',
  Body: 'v1'
}).promise(); // VersionId: "abc123"

await s3.putObject({
  Bucket: 'my-critical-bucket',
  Key: 'important.txt',
  Body: 'v2'
}).promise(); // VersionId: "def456"

// DELETE creates delete marker (soft delete)
await s3.deleteObject({
  Bucket: 'my-critical-bucket',
  Key: 'important.txt'
}).promise(); // VersionId: "ghi789" (delete marker)

// Recover by deleting delete marker
await s3.deleteObject({
  Bucket: 'my-critical-bucket',
  Key: 'important.txt',
  VersionId: 'ghi789',
  MFA: 'arn... 789012' // Requires MFA
}).promise();
```

**5. S3 Glacier Vault Lock**

Immutable backups for compliance:

```javascript
// Create vault lock policy (immutable after 24h)
await glacier.initiateVaultLock({
  vaultName: 'my-compliance-vault',
  policy: {
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Deny',
        Principal: '*',
        Action: 'glacier:DeleteArchive',
        Resource: 'arn:aws:glacier:us-east-1:123456789:vaults/my-compliance-vault'
      }]
    })
  }
}).promise();

// After 24h, complete lock (irreversible!)
await glacier.completeVaultLock({
  vaultName: 'my-compliance-vault',
  lockId: 'AaBbCcDd...'
}).promise();

// Now NO ONE can delete archives (not even AWS)
// Must wait for retention period to expire
```

**Comparison with Other Storage**:

| System | Durability | Mechanism |
|--------|-----------|-----------|
| **S3 Standard** | 11 9s | 3+ AZ, erasure coding |
| **S3 One Zone-IA** | 11 9s | Single AZ (lower availability) |
| **EBS** | ~99.99% | 2-copy replication within AZ |
| **Local Disk** | ~99% | Single disk (4% AFR) |
| **RAID-1** | ~99.9% | 2-disk mirror |
| **Dropbox (Magic Pocket)** | 11 9s | Reed-Solomon 10+4 |

**Real-World Scenario**:

```
Company stores 100 billion objects in S3

Expected annual loss with 11 9s:
  100,000,000,000 × 0.00000000001 = 0.001 objects/year
  = 1 object every 1,000 years

Expected loss in 100 years: 0.1 objects

Conclusion: Statistically, you'll never lose data
```

---

## 9. Key Takeaways

### When to Use Object Storage

✅ **Good Use Cases**:
- Media files (images, videos, audio)
- Backup and archival
- Data lakes (analytics)
- Log storage
- Static website hosting
- User-generated content
- Machine learning datasets
- Regulatory/compliance data

❌ **Bad Use Cases**:
- Database files (use EBS)
- Frequently updated files (use file system)
- Low-latency transactional data (use database)
- Small files with high IOPS (object overhead)
- Hierarchical file operations (use EFS)

### Cost Optimization Checklist

- [ ] Use Intelligent-Tiering for unknown access patterns
- [ ] Implement lifecycle policies (auto-archive)
- [ ] Enable compression (4-10x reduction)
- [ ] Deduplicate before upload
- [ ] Use CloudFront CDN (reduce S3 GET requests)
- [ ] Batch small files (reduce overhead)
- [ ] Use S3 Select for filtering (reduce transfer)
- [ ] Delete incomplete multipart uploads
- [ ] Monitor with S3 Storage Lens
- [ ] Consider reserved capacity for predictable workloads

### Performance Best Practices

1. **Parallel Uploads**: Multipart for files > 100 MB
2. **Prefix Distribution**: Avoid hot keys
3. **CloudFront**: Cache at edge (95%+ hit ratio)
4. **Transfer Acceleration**: Long-distance uploads
5. **S3 Select**: Filter server-side
6. **Byte-Range GETs**: Download only needed portions
7. **Connection Pooling**: Reuse HTTP connections
8. **Compression**: Reduce upload/download time

### Security Checklist

- [ ] Enable default encryption (SSE-S3 or SSE-KMS)
- [ ] Block public access (bucket settings)
- [ ] Use IAM roles (not access keys)
- [ ] Enable access logging
- [ ] Require HTTPS (bucket policy)
- [ ] Enable versioning (accidental delete protection)
- [ ] Use VPC endpoints (private access)
- [ ] Enable MFA Delete (critical buckets)
- [ ] Implement Object Lock (compliance)
- [ ] Regular access audits (IAM Access Analyzer)

---

## 10. Executive Summary

### What is Object Storage?

Blob/Object Storage is a scalable, durable, and cost-effective way to store unstructured data (files, images, videos, backups) in the cloud. Unlike traditional file systems or databases, object storage:

- Stores data as **objects** (file + metadata + unique ID)
- Accessed via **HTTP REST APIs** (not file system mounts)
- Provides **unlimited scalability** (petabytes to exabytes)
- Delivers **11 9s durability** (99.999999999%)
- Costs **significantly less** than alternatives ($0.023/GB/month)

### AWS S3 as the Industry Standard

**Key Features**:
- **Durability**: 11 9s via multi-AZ replication + erasure coding
- **Availability**: 99.99% uptime SLA
- **Scalability**: Unlimited storage, 3,500 PUT/s and 5,500 GET/s per prefix
- **Storage Classes**: 7 tiers (Standard → Glacier Deep Archive) for cost optimization
- **Security**: Encryption at rest/transit, IAM, bucket policies, Object Lock
- **Integration**: Native CDN (CloudFront), Lambda triggers, analytics (Athena)

### Architecture Patterns

**1. Direct Upload (Pre-Signed URLs)**:
- Client requests upload URL from API
- Server generates time-limited S3 URL
- Client uploads directly to S3 (bypass server)
- S3 event triggers Lambda for processing

**2. CDN Integration**:
- S3 as origin, CloudFront for global caching
- 95%+ cache hit ratio → 95% reduction in S3 GET requests
- < 50ms latency worldwide

**3. Multi-Region Replication**:
- Cross-region or same-region replication
- Data residency compliance (GDPR)
- Disaster recovery
- Lower latency access

### Cost Optimization (97% Reduction Possible)

Starting from **$2.9M/year** for 10 PB:
1. **Intelligent-Tiering**: $1.7M/year (-41%)
2. **Lifecycle Policies**: $416K/year (-85%)
3. **Compression (4x)**: $104K/year (-96%)
4. **Deduplication**: $94K/year (-97%)

### Real-World Examples

**Netflix**: 
- 15 PB of video content in S3
- Custom CDN (Open Connect) saves $860M/year vs traditional CDN
- < 2s video start time globally

**Dropbox**:
- Migrated from S3 to custom storage (Magic Pocket)
- 5.5x cost reduction at exabyte scale
- Deduplication ratio: 3:1
- Annual savings: $60M+

**Airbnb**:
- 140M property photos
- 6 sizes × 2 formats per photo
- Lambda auto-processing pipeline
- < 100ms image load time (P99)

### When to Use Object Storage

✅ **Use for**:
- Media storage (images, videos)
- Backups and archives
- Data lakes (analytics)
- Static website hosting
- User-generated content

❌ **Don't use for**:
- Database files (use block storage)
- Frequently updated files (use file system)
- Low-latency transactional data (use database)

### Interview Focus Areas

1. **Architecture Design**: Pre-signed URLs, CDN integration, multi-region setup
2. **Capacity Planning**: Storage estimation, bandwidth, cost breakdown
3. **Cost Optimization**: Storage classes, lifecycle policies, compression, deduplication
4. **Durability Explanation**: Multi-AZ replication, erasure coding, checksums
5. **Security**: Encryption, access control, versioning, Object Lock

### Key Metrics to Remember

- **Durability**: 99.999999999% (11 9s)
- **Availability**: 99.99% (Standard), 99.9% (IA)
- **Performance**: 3,500 PUT/s, 5,500 GET/s per prefix
- **Cost**: $0.023/GB/month (Standard), $0.00099/GB/month (Deep Archive)
- **Consistency**: Strong consistency (since Dec 2020)
- **Max object size**: 5 TB
- **Multipart upload**: Required for > 5 GB

### The Bottom Line

Object storage (especially AWS S3) is the **de facto standard** for storing unstructured data at scale. It provides:
- **Infinite scalability** (no capacity planning needed)
- **11 9s durability** (never lose data)
- **Cost-effectiveness** (97% reduction possible with optimization)
- **Global performance** (via CDN integration)
- **Security & compliance** (encryption, immutability, audit logs)

For interviews, demonstrate understanding of:
1. When to use object storage vs alternatives
2. Pre-signed URL pattern for direct uploads
3. CDN integration for global performance
4. Multi-region replication for DR
5. Cost optimization strategies (storage classes, compression, deduplication)
6. How 11 9s durability is achieved

Master these concepts, and you'll excel in system design discussions involving file storage, media platforms, backup systems, and data lakes.
