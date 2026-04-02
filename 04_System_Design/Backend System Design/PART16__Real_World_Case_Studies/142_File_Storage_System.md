# 142. File Storage System (like Dropbox, Google Drive)

## 📌 Problem Statement

**Design a file storage system** like Dropbox or Google Drive with upload, download, sync.

**Example**:
```
User uploads file.txt (100 MB)
→ Split into 4 chunks (25 MB each)
→ Store chunks in S3
→ User downloads file.txt
→ Fetch chunks, reassemble, download
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Upload files**: Upload files of any size
2. **Download files**: Download files
3. **Sync**: Sync files across devices
4. **Share**: Share files with other users
5. **Versioning**: Keep previous versions

### **Non-Functional Requirements**

1. **Reliability**: Files must not be lost (99.999999999% durability)
2. **Availability**: Service available 99.9%
3. **Scalability**: 100 million users, 10 PB storage
4. **Performance**: Upload/download speed > 10 MB/s

---

## 🎯 Step 2: Capacity Estimation

### **Users**

```
Total users: 100 million
Daily active users (DAU): 10 million (10%)
```

### **Storage**

```
Average storage per user: 100 GB
Total storage: 100M × 100 GB = 10 PB (10,000 TB)
```

### **Traffic**

```
Files uploaded per day: 10M users × 2 files = 20M files
Average file size: 10 MB
Upload traffic: 20M × 10 MB = 200 TB/day = 2.3 GB/sec
```

---

## 🎯 Step 3: API Design

### **1. Upload File**

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file_data>

Response:
{
  "file_id": "abc123",
  "name": "document.pdf",
  "size": 1048576,
  "status": "uploaded"
}
```

---

### **2. Download File**

```http
GET /api/files/{file_id}/download
Authorization: Bearer <token>

Response: Binary file data (or redirect to S3 presigned URL)
```

---

### **3. List Files**

```http
GET /api/files?folder_id=456
Authorization: Bearer <token>

Response:
{
  "files": [
    {"file_id": "abc123", "name": "document.pdf", "size": 1048576, "created_at": "2024-01-15T10:00:00Z"},
    {"file_id": "def456", "name": "image.png", "size": 2097152, "created_at": "2024-01-16T12:00:00Z"}
  ]
}
```

---

### **4. Share File**

```http
POST /api/files/{file_id}/share
Authorization: Bearer <token>

{
  "user_id": 789,
  "permission": "view"  // view, edit
}

Response:
{
  "share_id": "xyz789",
  "link": "https://example.com/share/xyz789"
}
```

---

## 🎯 Step 4: Database Schema

### **1. Users**

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    storage_used BIGINT DEFAULT 0,
    storage_limit BIGINT DEFAULT 107374182400,  -- 100 GB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);
```

---

### **2. Files (Metadata)**

```sql
CREATE TABLE files (
    id VARCHAR(36) PRIMARY KEY,  -- UUID
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    folder_id VARCHAR(36),
    version INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_folder (user_id, folder_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

### **3. File Chunks**

```sql
CREATE TABLE file_chunks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_id VARCHAR(36) NOT NULL,
    chunk_index INT NOT NULL,
    chunk_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash (for deduplication)
    s3_key VARCHAR(255) NOT NULL,     -- S3 object key
    size BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_file_id (file_id),
    UNIQUE KEY uk_file_chunk (file_id, chunk_index),
    FOREIGN KEY (file_id) REFERENCES files(id)
);
```

---

### **4. Shares**

```sql
CREATE TABLE shares (
    id VARCHAR(36) PRIMARY KEY,
    file_id VARCHAR(36) NOT NULL,
    shared_by BIGINT NOT NULL,
    shared_with BIGINT,              -- NULL for public links
    permission ENUM('view', 'edit') DEFAULT 'view',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_file_id (file_id),
    INDEX idx_shared_with (shared_with),
    FOREIGN KEY (file_id) REFERENCES files(id)
);
```

---

## 🎯 Step 5: High-Level Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Upload file (100 MB)
       ▼
┌─────────────────────────────────────┐
│      Load Balancer                  │
└──────────────┬──────────────────────┘
               │
               │ 2. Route to API Server
               ▼
┌─────────────────────────────────────┐
│      API Service                    │
│  - Split file into chunks (25 MB)  │
│  - Calculate hash (deduplication)   │
│  - Upload to S3                     │
│  - Save metadata to database        │
└──────────────┬──────────────────────┘
               │
               │ 3. Store chunks
               ▼
┌─────────────────────────────────────┐
│      Object Storage (S3)            │
│  - Chunk 1: s3://bucket/abc123-0    │
│  - Chunk 2: s3://bucket/abc123-1    │
│  - Chunk 3: s3://bucket/abc123-2    │
│  - Chunk 4: s3://bucket/abc123-3    │
└──────────────┬──────────────────────┘
               │
               │ 4. Save metadata
               ▼
┌─────────────────────────────────────┐
│      Database (PostgreSQL)          │
│  - files table (metadata)           │
│  - file_chunks table (chunk info)   │
└─────────────────────────────────────┘
```

---

## 🎯 Step 6: Upload Flow (with Chunking)

### **Why Chunking?**

**Problem**: Uploading 1 GB file in one request:
- Slow (takes 10+ minutes)
- If fails at 90%, restart from 0%
- High memory usage

**Solution**: Split into chunks (e.g., 25 MB each)
- Resume from last successful chunk
- Parallel uploads (faster)
- Lower memory usage

---

### **Upload Process**

**Client-side**:

```python
import hashlib
import requests

CHUNK_SIZE = 25 * 1024 * 1024  # 25 MB

def upload_file(file_path):
    file_size = os.path.getsize(file_path)
    
    # 1. Initiate upload
    response = requests.post('http://api.example.com/api/files/initiate', json={
        'name': os.path.basename(file_path),
        'size': file_size
    })
    file_id = response.json()['file_id']
    
    # 2. Upload chunks
    with open(file_path, 'rb') as f:
        chunk_index = 0
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            
            # Calculate hash (for deduplication)
            chunk_hash = hashlib.sha256(chunk).hexdigest()
            
            # Check if chunk already exists (deduplication)
            exists_response = requests.get(
                f'http://api.example.com/api/files/{file_id}/chunks/{chunk_index}/exists',
                params={'hash': chunk_hash}
            )
            
            if exists_response.json()['exists']:
                print(f"Chunk {chunk_index} already exists, skipping...")
            else:
                # Upload chunk
                requests.post(
                    f'http://api.example.com/api/files/{file_id}/chunks/{chunk_index}',
                    files={'chunk': chunk},
                    data={'hash': chunk_hash}
                )
                print(f"Uploaded chunk {chunk_index}")
            
            chunk_index += 1
    
    # 3. Finalize upload
    requests.post(f'http://api.example.com/api/files/{file_id}/finalize')
    print(f"Upload completed: {file_id}")
```

---

**Server-side** (Flask):

```python
from flask import Flask, request, jsonify
import boto3
import hashlib
import uuid

app = Flask(__name__)
s3 = boto3.client('s3', region_name='us-east-1')
BUCKET = 'my-file-storage'

@app.route('/api/files/initiate', methods=['POST'])
def initiate_upload():
    data = request.json
    file_id = str(uuid.uuid4())
    
    # Save to database
    db.execute("""
        INSERT INTO files (id, user_id, name, size, version)
        VALUES (%s, %s, %s, %s, 1)
    """, (file_id, get_user_id(), data['name'], data['size']))
    
    return jsonify({'file_id': file_id})

@app.route('/api/files/<file_id>/chunks/<int:chunk_index>', methods=['POST'])
def upload_chunk(file_id, chunk_index):
    chunk = request.files['chunk'].read()
    chunk_hash = request.form['hash']
    
    # Check if chunk already exists (deduplication)
    existing_chunk = db.query("""
        SELECT id, s3_key FROM file_chunks WHERE chunk_hash = %s LIMIT 1
    """, (chunk_hash,))
    
    if existing_chunk:
        # Chunk exists, reuse S3 key
        s3_key = existing_chunk['s3_key']
        print(f"Deduplication: Chunk {chunk_hash} already exists, reusing {s3_key}")
    else:
        # Upload to S3
        s3_key = f"{file_id}-{chunk_index}"
        s3.put_object(Bucket=BUCKET, Key=s3_key, Body=chunk)
    
    # Save chunk metadata
    db.execute("""
        INSERT INTO file_chunks (file_id, chunk_index, chunk_hash, s3_key, size)
        VALUES (%s, %s, %s, %s, %s)
    """, (file_id, chunk_index, chunk_hash, s3_key, len(chunk)))
    
    return jsonify({'status': 'uploaded'})

@app.route('/api/files/<file_id>/finalize', methods=['POST'])
def finalize_upload(file_id):
    # Mark file as complete
    db.execute("UPDATE files SET status = 'active' WHERE id = %s", (file_id,))
    return jsonify({'status': 'completed'})
```

---

## 🎯 Step 7: Deduplication

**Problem**: Multiple users upload same file (e.g., popular movie)

**Solution**: Store one copy, reference count

**Example**:

```
User A uploads "movie.mp4" (1 GB)
→ Hash: abc123
→ Store in S3: s3://bucket/abc123

User B uploads same "movie.mp4"
→ Hash: abc123 (same!)
→ Check file_chunks table: Hash exists
→ Don't upload to S3, reuse existing chunk
→ Save 1 GB storage
```

**Implementation**:

```python
def upload_chunk_with_deduplication(file_id, chunk_index, chunk):
    chunk_hash = hashlib.sha256(chunk).hexdigest()
    
    # Check if chunk exists
    existing_chunk = db.query("""
        SELECT s3_key FROM file_chunks WHERE chunk_hash = %s LIMIT 1
    """, (chunk_hash,))
    
    if existing_chunk:
        # Reuse existing chunk
        s3_key = existing_chunk['s3_key']
    else:
        # Upload new chunk
        s3_key = f"{file_id}-{chunk_index}"
        s3.put_object(Bucket=BUCKET, Key=s3_key, Body=chunk)
    
    # Save reference
    db.execute("""
        INSERT INTO file_chunks (file_id, chunk_index, chunk_hash, s3_key, size)
        VALUES (%s, %s, %s, %s, %s)
    """, (file_id, chunk_index, chunk_hash, s3_key, len(chunk)))
```

---

## 🎯 Step 8: Download Flow

### **Server-side**:

```python
@app.route('/api/files/<file_id>/download', methods=['GET'])
def download_file(file_id):
    # 1. Get file metadata
    file = db.query("SELECT * FROM files WHERE id = %s", (file_id,))
    
    # 2. Get chunks
    chunks = db.query("""
        SELECT s3_key FROM file_chunks
        WHERE file_id = %s
        ORDER BY chunk_index ASC
    """, (file_id,))
    
    # 3. Generate presigned URLs (for direct S3 download)
    presigned_urls = []
    for chunk in chunks:
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET, 'Key': chunk['s3_key']},
            ExpiresIn=3600  # 1 hour
        )
        presigned_urls.append(url)
    
    return jsonify({
        'file_id': file_id,
        'name': file['name'],
        'size': file['size'],
        'chunk_urls': presigned_urls
    })
```

---

### **Client-side**:

```python
def download_file(file_id, output_path):
    # 1. Get chunk URLs
    response = requests.get(f'http://api.example.com/api/files/{file_id}/download')
    data = response.json()
    
    # 2. Download chunks
    with open(output_path, 'wb') as f:
        for url in data['chunk_urls']:
            chunk = requests.get(url).content
            f.write(chunk)
            print(f"Downloaded chunk, total size: {f.tell()} bytes")
    
    print(f"Download completed: {output_path}")
```

---

## 🎯 Step 9: Sync (Desktop Client)

**Problem**: Keep files in sync across devices

**Solution**: Watch for file changes, upload diffs

**Algorithm**:

```
1. Watch local folder for changes (e.g., /Users/john/Dropbox)
2. On file change:
   - Calculate hash
   - Check if changed (compare with server hash)
   - If changed, upload new chunks
3. Poll server for remote changes
   - If remote file changed, download
```

---

**Implementation** (simplified):

```python
import time
import os
import hashlib
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class SyncHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if not event.is_directory:
            file_path = event.src_path
            print(f"File modified: {file_path}")
            
            # Calculate hash
            file_hash = calculate_file_hash(file_path)
            
            # Check if changed
            server_hash = get_server_file_hash(file_path)
            if file_hash != server_hash:
                print(f"Hash changed, uploading...")
                upload_file(file_path)

def calculate_file_hash(file_path):
    hasher = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

def get_server_file_hash(file_path):
    response = requests.get(f'http://api.example.com/api/files/hash?path={file_path}')
    return response.json()['hash']

# Watch folder
observer = Observer()
observer.schedule(SyncHandler(), path='/Users/john/Dropbox', recursive=True)
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()
```

---

## 🎯 Step 10: Optimizations

### **1. CDN for Downloads**

**Problem**: Users download from S3 (slow, expensive)

**Solution**: CDN (CloudFront) caches files

```python
# Generate CloudFront presigned URL
cloudfront_url = cloudfront_signer.generate_presigned_url(
    f'https://d123.cloudfront.net/{s3_key}',
    date_less_than=datetime.now() + timedelta(hours=1)
)
```

---

### **2. Versioning**

**Problem**: User accidentally deletes file

**Solution**: Keep previous versions

```sql
-- Soft delete
UPDATE files SET is_deleted = TRUE, version = version + 1 WHERE id = 'abc123';

-- List versions
SELECT * FROM files WHERE name = 'document.pdf' AND user_id = 123 ORDER BY version DESC;
```

---

### **3. Compression**

**Problem**: Large files consume storage

**Solution**: Compress before upload

```python
import gzip

def compress_and_upload(file_path):
    with open(file_path, 'rb') as f_in:
        with gzip.open(f'{file_path}.gz', 'wb') as f_out:
            f_out.writelines(f_in)
    
    upload_file(f'{file_path}.gz')
```

---

## 🎯 Step 11: Real-World Examples

### **1. Dropbox**

**Scale**: 700+ million users, 600+ million files uploaded/day

**Architecture**:
- Custom block storage (not S3)
- Chunking: 4 MB blocks
- Deduplication: Content-addressed storage (hash-based)
- Sync: Desktop client (C++) watches file changes

**Optimization**: Cross-datacenter replication (files stored in 3+ datacenters)

---

### **2. Google Drive**

**Scale**: 1+ billion users, 2+ trillion files

**Architecture**:
- Google Cloud Storage (GCS)
- Chunking: 8 MB blocks
- Real-time collaboration (Google Docs uses Operational Transformation)

**Features**: Version history (30 days free, unlimited with Google Workspace)

---

### **3. OneDrive (Microsoft)**

**Scale**: 400+ million users

**Architecture**:
- Azure Blob Storage
- Chunking: 4 MB blocks
- Integration: Office 365 (Word, Excel, PowerPoint online editing)

**Optimization**: Differential sync (only upload changed bytes, not entire file)

---

## 🎓 Interview Tips

**Q: "Design a file storage system like Dropbox"**

A: "I'll use **chunking + deduplication + S3**:

**Core components**:
1. **Chunking**: Split files into 25 MB chunks (resume uploads, parallel uploads)
2. **Deduplication**: Hash each chunk (SHA-256), reuse if exists (save storage)
3. **Object storage**: S3 (durable 99.999999999%, scalable 10 PB+)
4. **Metadata**: PostgreSQL (file name, size, chunk IDs)

**Upload flow**:
```
1. Client splits file into 25 MB chunks
2. Calculate SHA-256 hash per chunk
3. Check if hash exists in database
4. If exists → Reuse (deduplication)
5. If not → Upload to S3
6. Save chunk metadata (file_id, chunk_index, hash, s3_key)
```

**Download flow**:
```
1. Fetch chunk metadata from database
2. Generate S3 presigned URLs (1 hour expiry)
3. Client downloads chunks in parallel
4. Reassemble file
```

**Sync**: Desktop client watches folder, uploads changed files, polls server for remote changes

**Optimizations**: CDN (CloudFront) for downloads, versioning (soft delete), compression (gzip)

**Scale**: 100M users, 10 PB storage, 10 MB/s upload/download speed

Real-world: Dropbox (4 MB blocks, custom storage), Google Drive (8 MB blocks, GCS)"

---

## 📚 Summary

**Core**: Chunking (25 MB) + Deduplication (SHA-256 hash) + S3 storage + Metadata database

**Upload**: Split file → Hash chunks → Check exists → Upload to S3 → Save metadata

**Download**: Fetch chunk URLs → Download in parallel → Reassemble

**Sync**: Desktop client watches folder → Upload changes → Poll remote changes

**Optimizations**: CDN, versioning, compression

**Real-world**: Dropbox (custom storage), Google Drive (GCS), OneDrive (Azure Blob) 🚀

