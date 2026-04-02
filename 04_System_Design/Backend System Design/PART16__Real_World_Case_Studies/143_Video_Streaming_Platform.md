# 143. Video Streaming Platform (like YouTube, Netflix)

## 📌 Problem Statement

**Design a video streaming platform** like YouTube or Netflix with upload, transcoding, adaptive streaming.

**Example**:
```
User uploads video.mp4 (1 GB, 1080p)
→ Transcode to multiple resolutions (360p, 480p, 720p, 1080p)
→ User watches video
→ Adaptive streaming: If slow network → Switch to 480p
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Upload videos**: Upload videos (any format)
2. **Transcode**: Convert to multiple resolutions (360p, 480p, 720p, 1080p)
3. **Streaming**: Stream videos with adaptive bitrate
4. **Search**: Search videos by title, tags
5. **Analytics**: Track views, watch time

### **Non-Functional Requirements**

1. **Low latency**: Video starts playing in < 2 seconds
2. **High availability**: 99.9% uptime
3. **Scalability**: 1 billion users, 500 hours video uploaded/minute
4. **Bandwidth**: Efficient (adaptive bitrate)

---

## 🎯 Step 2: Capacity Estimation

### **Users**

```
Total users: 1 billion
Daily active users (DAU): 100 million (10%)
```

### **Video Uploads**

```
Videos uploaded per minute: 500 hours (YouTube scale)
Videos uploaded per day: 500 × 60 × 24 = 720,000 hours/day
Average video duration: 10 minutes
Number of videos: 720,000 hours / (10/60) hours = 4.32 million videos/day

Average video size: 500 MB (1080p, 10 minutes)
Upload traffic: 4.32M × 500 MB = 2.16 PB/day = 25 GB/sec
```

### **Transcoding**

```
Resolutions: 360p, 480p, 720p, 1080p (4 versions)
Total transcoded: 4.32M × 4 = 17.28M videos/day
Transcoded storage: 17.28M × 250 MB (average) = 4.32 PB/day
```

### **Video Views**

```
Videos watched per day: 100M users × 10 videos = 1 billion views/day
Views per second: 1B / 86400 = 11.5k views/sec
```

---

## 🎯 Step 3: API Design

### **1. Upload Video**

```http
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

video: <video_file>
title: "My Video"
description: "Description"
tags: ["tutorial", "tech"]

Response:
{
  "video_id": "abc123",
  "status": "processing",
  "upload_url": "https://s3.amazonaws.com/bucket/abc123.mp4"
}
```

---

### **2. Get Video Details**

```http
GET /api/videos/{video_id}

Response:
{
  "video_id": "abc123",
  "title": "My Video",
  "description": "Description",
  "user_id": 123,
  "views": 10000,
  "duration": 600,
  "resolutions": ["360p", "480p", "720p", "1080p"],
  "streaming_url": "https://cdn.example.com/abc123/master.m3u8",
  "thumbnail": "https://cdn.example.com/abc123/thumb.jpg"
}
```

---

### **3. Stream Video (HLS)**

```http
GET /api/videos/{video_id}/stream

Response: Redirect to CDN
Location: https://cdn.example.com/abc123/master.m3u8
```

**Master playlist** (`master.m3u8`):

```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
```

**Resolution playlist** (`360p.m3u8`):

```
#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
segment0.ts
#EXTINF:10.0,
segment1.ts
#EXTINF:10.0,
segment2.ts
#EXT-X-ENDLIST
```

---

## 🎯 Step 4: Database Schema

### **1. Videos**

```sql
CREATE TABLE videos (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INT,  -- seconds
    status ENUM('processing', 'ready', 'failed') DEFAULT 'processing',
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

### **2. Video Resolutions**

```sql
CREATE TABLE video_resolutions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(36) NOT NULL,
    resolution VARCHAR(10) NOT NULL,  -- 360p, 480p, 720p, 1080p
    s3_key VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    bitrate INT NOT NULL,  -- kbps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_video_id (video_id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
);
```

---

### **3. Views (Analytics)**

```sql
CREATE TABLE video_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(36) NOT NULL,
    user_id BIGINT,
    watch_time INT,  -- seconds watched
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_video_id (video_id),
    INDEX idx_timestamp (timestamp)
);
```

---

## 🎯 Step 5: High-Level Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Upload video (1 GB)
       ▼
┌─────────────────────────────────────┐
│      Load Balancer                  │
└──────────────┬──────────────────────┘
               │
               │ 2. Generate presigned S3 URL
               ▼
┌─────────────────────────────────────┐
│      API Service                    │
│  - Generate video_id                │
│  - Create presigned S3 URL          │
│  - Save metadata to database        │
└──────────────┬──────────────────────┘
               │
               │ 3. Upload directly to S3
               ▼
┌─────────────────────────────────────┐
│      S3 (Object Storage)            │
│  - Raw video: s3://bucket/abc123.mp4│
└──────────────┬──────────────────────┘
               │
               │ 4. S3 Event Notification
               ▼
┌─────────────────────────────────────┐
│      Message Queue (SQS/Kafka)      │
└──────────────┬──────────────────────┘
               │
               │ 5. Transcode job
               ▼
┌─────────────────────────────────────┐
│      Transcoding Workers            │
│  - FFmpeg: 1080p → 360p, 480p, 720p │
│  - Upload to S3                     │
└──────────────┬──────────────────────┘
               │
               │ 6. Transcoded videos
               ▼
┌─────────────────────────────────────┐
│      CDN (CloudFront)               │
│  - HLS: master.m3u8, segments       │
└──────────────┬──────────────────────┘
               │
               │ 7. Stream video
               ▼
┌─────────────┐
│   User      │
└─────────────┘
```

---

## 🎯 Step 6: Upload Flow

### **Step 1: Generate Presigned URL**

**Server-side** (Flask):

```python
import boto3
import uuid

s3 = boto3.client('s3', region_name='us-east-1')
BUCKET = 'my-video-bucket'

@app.route('/api/videos/upload', methods=['POST'])
def upload_video():
    data = request.json
    video_id = str(uuid.uuid4())
    s3_key = f"raw/{video_id}.mp4"
    
    # Generate presigned URL (client uploads directly to S3)
    presigned_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': BUCKET, 'Key': s3_key},
        ExpiresIn=3600,  # 1 hour
        HttpMethod='PUT'
    )
    
    # Save metadata
    db.execute("""
        INSERT INTO videos (id, user_id, title, description, status)
        VALUES (%s, %s, %s, %s, 'processing')
    """, (video_id, get_user_id(), data['title'], data['description']))
    
    return jsonify({
        'video_id': video_id,
        'upload_url': presigned_url,
        'status': 'processing'
    })
```

---

### **Step 2: Client Uploads to S3**

```python
import requests

def upload_video(file_path, upload_url):
    with open(file_path, 'rb') as f:
        response = requests.put(upload_url, data=f)
    
    if response.status_code == 200:
        print("Upload successful")
    else:
        print(f"Upload failed: {response.status_code}")
```

---

### **Step 3: S3 Event Notification → Transcoding**

**S3 Event**:

```json
{
  "Records": [
    {
      "s3": {
        "bucket": {"name": "my-video-bucket"},
        "object": {"key": "raw/abc123.mp4"}
      }
    }
  ]
}
```

**Transcoding Worker**:

```python
import boto3
import subprocess
import json
from kafka import KafkaConsumer

s3 = boto3.client('s3')
consumer = KafkaConsumer('video-uploads', bootstrap_servers=['localhost:9092'])

def transcode_video(video_id, s3_key):
    # 1. Download from S3
    local_file = f'/tmp/{video_id}.mp4'
    s3.download_file('my-video-bucket', s3_key, local_file)
    
    # 2. Transcode to multiple resolutions
    resolutions = [
        ('360p', '640x360', '800k'),
        ('480p', '842x480', '1400k'),
        ('720p', '1280x720', '2800k'),
        ('1080p', '1920x1080', '5000k')
    ]
    
    for name, resolution, bitrate in resolutions:
        output_file = f'/tmp/{video_id}_{name}.mp4'
        
        # FFmpeg command
        cmd = [
            'ffmpeg',
            '-i', local_file,
            '-vf', f'scale={resolution}',
            '-b:v', bitrate,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-b:a', '128k',
            output_file
        ]
        
        subprocess.run(cmd, check=True)
        
        # 3. Upload to S3
        s3_output_key = f'transcoded/{video_id}/{name}.mp4'
        s3.upload_file(output_file, 'my-video-bucket', s3_output_key)
        
        # 4. Save metadata
        file_size = os.path.getsize(output_file)
        db.execute("""
            INSERT INTO video_resolutions (video_id, resolution, s3_key, size, bitrate)
            VALUES (%s, %s, %s, %s, %s)
        """, (video_id, name, s3_output_key, file_size, int(bitrate.replace('k', ''))))
        
        print(f"Transcoded {name}: {output_file} → {s3_output_key}")
    
    # 5. Update video status
    db.execute("UPDATE videos SET status = 'ready' WHERE id = %s", (video_id,))
    print(f"Video {video_id} is ready")

# Consumer loop
for message in consumer:
    event = json.loads(message.value)
    s3_key = event['Records'][0]['s3']['object']['key']
    video_id = s3_key.split('/')[1].replace('.mp4', '')
    
    transcode_video(video_id, s3_key)
```

---

## 🎯 Step 7: Adaptive Streaming (HLS)

### **What is HLS (HTTP Live Streaming)?**

**Concept**: Split video into small segments (10 seconds each), client downloads segments sequentially

**Benefit**: Adaptive bitrate (switch resolution based on network speed)

---

### **Generate HLS Segments**

```python
def generate_hls(video_id, input_file, resolution):
    output_dir = f'/tmp/{video_id}/{resolution}'
    os.makedirs(output_dir, exist_ok=True)
    
    # FFmpeg: Generate HLS segments
    cmd = [
        'ffmpeg',
        '-i', input_file,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-hls_time', '10',  # 10-second segments
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', f'{output_dir}/segment%03d.ts',
        f'{output_dir}/playlist.m3u8'
    ]
    
    subprocess.run(cmd, check=True)
    
    # Upload segments to S3
    for file in os.listdir(output_dir):
        s3_key = f'hls/{video_id}/{resolution}/{file}'
        s3.upload_file(f'{output_dir}/{file}', 'my-video-bucket', s3_key)
    
    print(f"Generated HLS for {resolution}")
```

**Result**:

```
s3://my-video-bucket/hls/abc123/360p/playlist.m3u8
s3://my-video-bucket/hls/abc123/360p/segment000.ts
s3://my-video-bucket/hls/abc123/360p/segment001.ts
...
```

---

### **Master Playlist**

```python
def generate_master_playlist(video_id):
    resolutions = db.query("""
        SELECT resolution, bitrate FROM video_resolutions WHERE video_id = %s
    """, (video_id,))
    
    master = "#EXTM3U\n"
    for row in resolutions:
        resolution = row['resolution']
        bitrate = row['bitrate'] * 1000  # Convert to bps
        width, height = {
            '360p': (640, 360),
            '480p': (842, 480),
            '720p': (1280, 720),
            '1080p': (1920, 1080)
        }[resolution]
        
        master += f"#EXT-X-STREAM-INF:BANDWIDTH={bitrate},RESOLUTION={width}x{height}\n"
        master += f"{resolution}/playlist.m3u8\n"
    
    # Upload to S3
    s3.put_object(
        Bucket='my-video-bucket',
        Key=f'hls/{video_id}/master.m3u8',
        Body=master,
        ContentType='application/vnd.apple.mpegurl'
    )
    
    return f'https://cdn.example.com/hls/{video_id}/master.m3u8'
```

---

## 🎯 Step 8: CDN (Content Delivery Network)

**Problem**: Users worldwide watch videos from S3 (slow, expensive)

**Solution**: CDN (CloudFront, Cloudflare) caches videos at edge locations

**Benefits**:
- **Low latency**: Serve from nearest edge location
- **High throughput**: Handle millions of requests
- **Cost-effective**: Reduce S3 egress costs

**Setup**:

```python
# CloudFront distribution
cloudfront = boto3.client('cloudfront')

distribution = cloudfront.create_distribution(
    DistributionConfig={
        'Origins': {
            'Items': [
                {
                    'Id': 's3-origin',
                    'DomainName': 'my-video-bucket.s3.amazonaws.com',
                    'S3OriginConfig': {}
                }
            ]
        },
        'DefaultCacheBehavior': {
            'TargetOriginId': 's3-origin',
            'ViewerProtocolPolicy': 'redirect-to-https',
            'Compress': True,
            'DefaultTTL': 86400  # 1 day
        },
        'Enabled': True
    }
)

cdn_url = distribution['Distribution']['DomainName']
# Result: d123.cloudfront.net
```

**Streaming URL**:

```
https://d123.cloudfront.net/hls/abc123/master.m3u8
```

---

## 🎯 Step 9: Video Player (Client-side)

### **HTML5 Video with HLS.js**

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
    <video id="video" controls width="800"></video>

    <script>
        const video = document.getElementById('video');
        const videoSrc = 'https://d123.cloudfront.net/hls/abc123/master.m3u8';

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(videoSrc);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play();
            });
            
            // Adaptive bitrate (automatic)
            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                console.log(`Switched to ${data.level} (resolution)`);
            });
        }
    </script>
</body>
</html>
```

---

## 🎯 Step 10: Optimizations

### **1. Thumbnail Generation**

```python
def generate_thumbnail(video_id, input_file):
    thumbnail_file = f'/tmp/{video_id}_thumb.jpg'
    
    # FFmpeg: Extract frame at 5 seconds
    cmd = [
        'ffmpeg',
        '-i', input_file,
        '-ss', '00:00:05',
        '-vframes', '1',
        thumbnail_file
    ]
    
    subprocess.run(cmd, check=True)
    
    # Upload to S3
    s3_key = f'thumbnails/{video_id}.jpg'
    s3.upload_file(thumbnail_file, 'my-video-bucket', s3_key)
    
    return f'https://cdn.example.com/thumbnails/{video_id}.jpg'
```

---

### **2. Analytics (Views, Watch Time)**

```python
@app.route('/api/videos/<video_id>/view', methods=['POST'])
def track_view(video_id):
    data = request.json
    
    db.execute("""
        INSERT INTO video_views (video_id, user_id, watch_time)
        VALUES (%s, %s, %s)
    """, (video_id, get_user_id(), data['watch_time']))
    
    # Increment view count
    db.execute("UPDATE videos SET views = views + 1 WHERE id = %s", (video_id,))
    
    return jsonify({'status': 'tracked'})
```

---

## 🎯 Step 11: Real-World Examples

### **1. YouTube**

**Scale**: 2.7 billion users, 500 hours uploaded/minute, 1 billion hours watched/day

**Architecture**:
- Google infrastructure (Spanner, Bigtable, Colossus)
- VP9 codec (more efficient than H.264)
- Adaptive streaming (DASH, not HLS)

**Optimization**: ML-based recommendations (70% of watch time)

---

### **2. Netflix**

**Scale**: 230+ million subscribers, 15,000+ titles

**Architecture**:
- AWS (S3, EC2, CloudFront)
- Custom transcoding (per-title encoding optimizes bitrate)
- Adaptive streaming (DASH)

**CDN**: Open Connect (Netflix's own CDN, 17,000+ servers globally)

---

### **3. Twitch (Live Streaming)**

**Scale**: 140+ million MAU, 8+ million streamers

**Architecture**:
- AWS (Kinesis Video Streams)
- Low latency (<2 seconds)
- Transcoding (multiple resolutions)

**Protocol**: HLS (for live streaming)

---

## 🎓 Interview Tips

**Q: "Design a video streaming platform like YouTube"**

A: "I'll use **S3 + FFmpeg transcoding + HLS + CDN**:

**Core components**:
1. **Upload**: Client uploads to S3 (presigned URL), S3 event triggers transcoding
2. **Transcoding**: FFmpeg converts to 360p, 480p, 720p, 1080p (4 resolutions)
3. **HLS**: Split videos into 10-second segments (adaptive streaming)
4. **CDN**: CloudFront caches videos at edge locations (low latency)

**Upload flow**:
```
1. Client requests upload URL
2. Server generates presigned S3 URL
3. Client uploads directly to S3
4. S3 event → Kafka → Transcoding worker
5. FFmpeg transcodes to 4 resolutions
6. Generate HLS segments (10 sec each)
7. Upload to S3, update status to 'ready'
```

**Streaming flow**:
```
1. Client requests video
2. Server returns CDN URL (master.m3u8)
3. Client parses master playlist → Select resolution
4. Download segments sequentially
5. Adaptive: If slow network → Switch to lower resolution
```

**Optimizations**: Thumbnail generation (5-second frame), analytics (views, watch time), CDN (reduce latency)

**Scale**: 1B users, 500 hours uploaded/min, 11.5k views/sec

Real-world: YouTube (VP9 codec Google infrastructure), Netflix (AWS per-title encoding Open Connect CDN)"

---

## 📚 Summary

**Core**: S3 upload → FFmpeg transcoding (4 resolutions) → HLS segments (10 sec) → CDN streaming

**Adaptive streaming**: Client switches resolution based on network speed (HLS master playlist)

**Transcoding**: FFmpeg converts 1080p → 360p/480p/720p/1080p (libx264 codec)

**CDN**: CloudFront caches videos at edge locations (low latency, high throughput)

**Real-world**: YouTube (500 hours/min VP9 DASH), Netflix (AWS per-title encoding Open Connect), Twitch (live streaming low latency) 🚀

