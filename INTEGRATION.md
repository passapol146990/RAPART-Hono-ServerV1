# 🔗 Integration Guide: MobSF Scanner + API Server

This guide explains how to integrate the **MobSF Auto Scanner** (`script-analysis-mobsf-auto`) with the **RAPART API Server** (`RAPART-Hono-ServerV1`).

---

## 📋 Overview

The complete system consists of two components working together:

1. **API Server** (this project) - Task queue management and file storage
2. **Scanner** (`script-analysis-mobsf-auto`) - APK download, analysis, and upload

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Complete Workflow                        │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │  API Server  │────────▶│   Scanner    │────────▶│    MobSF     │
  │   (Bun)      │         │  (Python)    │         │  (Docker)    │
  └──────────────┘         └──────────────┘         └──────────────┘
        │                         │                         │
        │ 1. GET /get            │ 2. Download APK        │
        │    (hash)              │    from AndroZoo       │
        │                         │                         │
        │                         │ 3. Upload & Scan       │
        │                         │─────────────────────────▶
        │                         │                         │
        │                         │ 4. Get Report          │
        │                         │◀─────────────────────────
        │ 5. POST /post          │                         │
        │    (status)             │                         │
        │◀────────────────────────│                         │
        │                         │                         │
        │ 6. PUT /put            │                         │
        │    (APK + report)       │                         │
        │◀────────────────────────│                         │
        │                         │                         │
        │                         │ 7. DELETE scan         │
        │                         │─────────────────────────▶
        │                         │                         │
        │                         │ 8. Delete local files  │
        │                         │                         │
```

---

## 🚀 Step-by-Step Setup

### Step 1: Start the API Server

```bash
cd E:\GITHUB\RAPART-Hono-ServerV1

# Install dependencies
bun install

# Initialize database
bun run db:init

# Start server
bun run dev
```

Server will be available at `http://localhost:8000`

### Step 2: Add Tasks to Queue

You have several options:

**Option A: Use seed script (sample data)**
```bash
bun run db:seed
```

**Option B: Add via API**
```bash
# Single task
curl -X POST http://localhost:8000/add-task \
  -H "Content-Type: application/json" \
  -d '{"hash": "YOUR_SHA256_HASH", "label": "malware"}'

# Batch tasks
curl -X POST http://localhost:8000/add-batch \
  -H "Content-Type: application/json" \
  -d '{
    "hashes": ["hash1", "hash2", "hash3"],
    "label": "malware"
  }'
```

**Option C: Import from CSV (use query_database.py)**
```bash
cd E:\GITHUB\script-analysis-mobsf-auto
python query_database.py
```

### Step 3: Configure Scanner

Edit `E:\GITHUB\script-analysis-mobsf-auto\.env`:

```env
# AndroZoo API Configuration
ANDROZOO_API_KEY=your_androzoo_api_key_here

# MobSF Configuration (Docker)
MOBSF_HOST=http://localhost:8000
MOBSF_API_KEY=your_mobsf_api_key_here

# API Server Configuration (point to this API server)
API_SERVER=http://localhost:8000
```

**Important:** If API server is on a different machine:
```env
API_SERVER=http://192.168.x.x:8000
```

### Step 4: Start MobSF (if not already running)

```bash
cd E:\GITHUB\script-analysis-mobsf-auto
docker-compose up -d
```

Get MobSF API key:
```bash
docker exec -it <mobsf_container_id> cat /root/.MobSF/config.py | grep API_KEY
```

### Step 5: Run the Scanner

```bash
cd E:\GITHUB\script-analysis-mobsf-auto
python main.py
```

---

## 📊 Monitoring

### API Server Dashboard

```bash
# View statistics
curl http://localhost:8000/stats | python -m json.tool

# List all tasks
curl http://localhost:8000/tasks | python -m json.tool

# List pending tasks only
curl "http://localhost:8000/tasks?status=pending" | python -m json.tool

# Get specific task
curl http://localhost:8000/task/YOUR_HASH | python -m json.tool
```

### Scanner Logs

The scanner will output:
- `📥 Received hash: ...` - Got task from API
- `⬇️ Downloading ...` - Downloading APK
- `📤 Uploading to MobSF: ...` - Uploading to MobSF
- `🔍 Scanning ...` - Analysis in progress
- `✅ Scan completed: ...` - Scan successful
- `📊 Status update: ... -> success` - Status posted
- `✅ Saved: ...` - Files uploaded to API server
- `🗑️ Deleted scan from MobSF: ...` - Cleanup complete
- `✅ ✅ ✅ COMPLETED: ...` - Fully done

---

## 🔄 Complete Workflow Example

1. **Add 3 tasks to queue:**
   ```bash
   curl -X POST http://localhost:8000/add-batch \
     -H "Content-Type: application/json" \
     -d '{
       "hashes": [
         "abc123def...",
         "111222333...",
         "zzzyyyxxx..."
       ],
       "label": "malware"
     }'
   ```

2. **Start scanner:**
   ```bash
   python main.py
   ```

3. **Scanner workflow for each task:**
   - Gets hash from `GET /get`
   - Downloads APK from AndroZoo
   - Uploads to MobSF and scans
   - Downloads JSON report
   - Posts status `POST /post` → `success`
   - Uploads APK + report `PUT /put`
   - Deletes MobSF scan
   - Deletes local files
   - Moves to next task

4. **Monitor progress:**
   ```bash
   watch -n 5 'curl -s http://localhost:8000/stats | python -m json.tool'
   ```

---

## 📁 File Storage

After successful processing, files are stored in:

```
RAPART-Hono-ServerV1/
└── storage/
    ├── apk/
    │   └── <sha256>.apk          # Original APK files
    └── reports/
        └── <sha256>.json         # MobSF analysis reports
```

---

## 🛠️ Troubleshooting

### Problem: Scanner can't connect to API server

**Solution:**
```bash
# Check if API server is running
curl http://localhost:8000

# If on different machine, check firewall
# Windows: Allow port 8000 in Windows Firewall
# Or bind to specific IP:
PORT=8000 bun run dev
```

### Problem: "No task available" message

**Solution:**
```bash
# Check if tasks exist
curl http://localhost:8000/stats

# Add tasks if needed
curl -X POST http://localhost:8000/add-task \
  -H "Content-Type: application/json" \
  -d '{"hash": "YOUR_HASH", "label": "malware"}'
```

### Problem: Upload timeout for large files

**Solution:**
The scanner already has retry mechanism. If it still fails:
- Check network connection (ping between machines)
- Increase timeout in `main.py` line 203:
  ```python
  timeout = max(600, int(file_size_mb * 20))  # Increase multiplier
  ```

### Problem: Disk space filling up

**Solution:**
```bash
# Check storage usage
du -sh E:\GITHUB\RAPART-Hono-ServerV1\storage/*

# Clean up old files if needed (manual cleanup)
# The scanner already deletes local files automatically
```

### Problem: Database locked error

**Solution:**
```bash
# Stop scanner
# Restart API server
bun run dev
```

---

## 📊 Expected Statistics

After processing 100 APKs (example):

```json
{
  "total": 100,
  "pending": 0,
  "processing": 0,
  "success": 95,
  "download_failed": 2,
  "scan_failed": 1,
  "upload_failed": 2
}
```

**Status meanings:**
- `pending` - Waiting to be processed
- `processing` - Currently being processed
- `success` - Successfully processed and uploaded
- `download_failed` - APK not available on AndroZoo
- `scan_failed` - MobSF scan failed
- `upload_failed` - Failed to upload to API server
- `error` - Unexpected error

---

## 🔒 Security Notes

- Running on isolated Kali Linux VM
- Do not expose API server to public internet
- Keep on LAN only (recommended)
- All malware files are stored on server, deleted from scanner
- MobSF runs in Docker container (isolated)

---

## 📈 Performance

**Single-threaded performance:**
- Average processing time: 2-5 minutes per APK
- Rate: ~12-30 APKs per hour
- Disk usage on scanner: Max 100-200 MB (temporary)
- Disk usage on server: Grows with each APK (plan accordingly)

**Disk space calculation:**
- 1000 APKs × 50 MB average = ~50 GB
- 1000 reports × 2 MB average = ~2 GB
- **Total for 1000 APKs: ~52 GB**

---

## 🧪 Testing the Integration

Use the test script:

```bash
cd E:\GITHUB\RAPART-Hono-ServerV1
bash examples/test-api.sh
```

This will test all endpoints and simulate the full workflow.

---

## 📞 Support

If you encounter issues:

1. Check API server logs
2. Check scanner output
3. Check MobSF Docker logs:
   ```bash
   docker logs <mobsf_container_id>
   ```
4. Verify network connectivity between components

---

## ✅ Checklist

Before starting:

- [ ] API server running (`http://localhost:8000`)
- [ ] Database initialized (`bun run db:init`)
- [ ] Tasks added to queue (via seed/API/import)
- [ ] MobSF Docker running and accessible
- [ ] Scanner `.env` configured correctly
- [ ] AndroZoo API key is valid
- [ ] MobSF API key is correct
- [ ] Sufficient disk space available

---

Good luck with your malware analysis! 🚀
