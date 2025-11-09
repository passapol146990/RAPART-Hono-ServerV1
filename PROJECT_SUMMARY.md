# 📊 Project Summary: RAPART MobSF Analysis System

Complete system for automated Android malware analysis using MobSF.

---

## 🎯 Project Overview

This is a **two-component system** for large-scale Android malware analysis:

1. **RAPART API Server** (this project) - Task queue and file storage
2. **MobSF Auto Scanner** - Automated APK download, analysis, and upload

---

## 📁 Project Locations

```
E:\GITHUB\
├── RAPART-Hono-ServerV1\          # API Server (Bun + Hono + SQLite)
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts        # Database operations
│   │   │   ├── init.ts            # DB initialization
│   │   │   └── seed.ts            # Sample data seeding
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript types
│   │   └── index.ts               # Main server application
│   ├── storage/
│   │   ├── apk/                   # Uploaded APK files
│   │   └── reports/               # JSON analysis reports
│   ├── data/
│   │   └── tasks.db               # SQLite database
│   ├── examples/
│   │   └── test-api.sh            # API testing script
│   ├── package.json
│   ├── README.md
│   ├── GETTING_STARTED.md
│   ├── INTEGRATION.md             # Complete integration guide
│   └── .gitignore
│
└── script-analysis-mobsf-auto\    # Scanner (Python)
    ├── temp/
    │   ├── malware/               # Temporary APK storage
    │   └── reports/               # Temporary report storage
    ├── main.py                    # Main scanner script
    ├── .env                       # Configuration
    ├── .env.example
    ├── requirements.txt
    ├── docker-compose.yml         # MobSF setup
    ├── README.md
    ├── API_SERVER.md              # API server reference
    └── (additional utility scripts)
```

---

## 🔧 Technology Stack

### API Server (RAPART-Hono-ServerV1)
- **Runtime:** Bun (JavaScript/TypeScript)
- **Framework:** Hono (lightweight web framework)
- **Database:** SQLite with WAL mode
- **Language:** TypeScript
- **Port:** 8000

### Scanner (script-analysis-mobsf-auto)
- **Language:** Python 3
- **Key Libraries:** requests, tqdm, python-dotenv
- **Analysis Tool:** MobSF (in Docker)
- **APK Source:** AndroZoo

---

## 🔄 Complete Workflow

```
┌─────────────────────────────────────────────────────────┐
│              End-to-End Process Flow                    │
└─────────────────────────────────────────────────────────┘

1. Add hashes to API server queue
   └─> POST /add-batch

2. Scanner requests next hash
   └─> GET /get
       Response: {"hash": "sha256", "id": 123}

3. Scanner downloads APK from AndroZoo
   └─> https://androzoo.uni.lu/api/download

4. Scanner uploads APK to MobSF and scans
   └─> POST /api/v1/upload
   └─> POST /api/v1/scan

5. Scanner downloads analysis report
   └─> POST /api/v1/report_json

6. Scanner updates status to "success"
   └─> POST /post
       Body: {"hash": "...", "status": "success"}

7. Scanner uploads APK + report to API server
   └─> PUT /put
       Files: apk, report
       (with retry mechanism for large files)

8. Cleanup - Scanner deletes:
   └─> MobSF scan: POST /api/v1/delete_scan
   └─> Local files: APK + JSON report

9. Loop back to step 2 for next hash
```

---

## 🚀 Quick Start Guide

### 1. Start API Server

```bash
cd E:\GITHUB\RAPART-Hono-ServerV1
bun install
bun run db:init
bun run dev
```

### 2. Add Tasks

```bash
# Add batch tasks
curl -X POST http://localhost:8000/add-batch \
  -H "Content-Type: application/json" \
  -d '{
    "hashes": ["hash1", "hash2", "hash3"],
    "label": "malware"
  }'
```

### 3. Start MobSF

```bash
cd E:\GITHUB\script-analysis-mobsf-auto
docker-compose up -d
```

### 4. Configure Scanner

Edit `E:\GITHUB\script-analysis-mobsf-auto\.env`:
```env
ANDROZOO_API_KEY=your_key_here
MOBSF_HOST=http://localhost:8000
MOBSF_API_KEY=your_mobsf_key
API_SERVER=http://localhost:8000
```

### 5. Run Scanner

```bash
cd E:\GITHUB\script-analysis-mobsf-auto
python main.py
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/` | Health check | Service info |
| GET | `/get` | Get next task | `{hash, id}` or `null` |
| POST | `/post` | Update status | `{ok, hash, status}` |
| PUT | `/put` | Upload files | `{ok, hash, apk, report}` |
| POST | `/add-task` | Add single task | `{ok, hash, queueLength}` |
| POST | `/add-batch` | Add multiple tasks | `{ok, added, total}` |
| GET | `/stats` | View statistics | Stats object |
| GET | `/tasks` | List tasks | `{count, tasks[]}` |
| GET | `/task/:hash` | Get specific task | Task object |
| DELETE | `/task/:hash` | Delete task | `{ok, hash}` |
| POST | `/clear` | Clear all tasks | `{ok, message}` |

---

## 📊 Database Schema

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT UNIQUE NOT NULL,           -- SHA256 hash
  status TEXT NOT NULL DEFAULT 'pending',
  label TEXT,                          -- 'malware' or 'benign'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  apk_path TEXT,                       -- Path to stored APK
  report_path TEXT,                    -- Path to JSON report
  error_message TEXT
);
```

**Status values:**
- `pending` - Waiting to be processed
- `processing` - Currently being processed
- `success` - Successfully completed
- `download_failed` - APK not available
- `scan_failed` - MobSF scan failed
- `upload_failed` - Upload to server failed
- `error` - Unexpected error

---

## 💾 Storage Management

### API Server Storage
- **Location:** `E:\GITHUB\RAPART-Hono-ServerV1\storage\`
- **Growth:** Continuous (plan for 50-100 GB per 1000 APKs)
- **Cleanup:** Manual (files are permanent archive)

### Scanner Storage
- **Location:** `E:\GITHUB\script-analysis-mobsf-auto\temp\`
- **Growth:** Minimal (~100-200 MB max)
- **Cleanup:** Automatic (files deleted after upload)

### Disk Space Calculation
```
For 1000 APKs:
- APKs: 1000 × 50 MB = 50 GB
- Reports: 1000 × 2 MB = 2 GB
- Total: ~52 GB
```

---

## 📈 Performance Metrics

### Single-Threaded Mode (Current)
- Processing rate: 12-30 APKs per hour
- Average time per APK: 2-5 minutes
- Concurrent processing: 1 APK at a time
- Scanner disk usage: 100-200 MB (temporary)

### Bottlenecks
1. MobSF scan time (1-3 minutes per APK)
2. APK download speed (depends on AndroZoo)
3. LAN upload speed (for large APKs)

---

## 🔒 Security Considerations

1. **Isolation:**
   - Scanner runs on Kali Linux VM
   - MobSF runs in Docker container
   - No direct malware execution

2. **Network:**
   - API server on LAN only (port 8000)
   - Not exposed to internet
   - Firewall protection recommended

3. **Data Handling:**
   - Malware files stored securely on API server
   - Deleted from scanner after upload
   - Database tracks all operations

---

## 🧪 Testing

### Test API Server
```bash
cd E:\GITHUB\RAPART-Hono-ServerV1
bash examples/test-api.sh
```

### Test Scanner Integration
1. Start API server
2. Add test tasks
3. Run scanner with valid AndroZoo hash
4. Monitor progress via `/stats` endpoint

---

## 🛠️ Troubleshooting

### Common Issues

**1. Scanner can't connect to API server**
- Check if API server is running: `curl http://localhost:8000`
- Verify firewall settings
- Check `.env` API_SERVER value

**2. No tasks available**
- Check queue: `curl http://localhost:8000/stats`
- Add tasks via `/add-task` or `/add-batch`

**3. Upload timeouts**
- Increase timeout in `main.py` line 203
- Check network connection
- Verify file sizes

**4. MobSF connection failed**
- Check Docker status: `docker ps`
- Verify MobSF API key
- Test MobSF endpoint: `curl http://localhost:8000/api/v1/`

**5. Database locked**
- Restart API server
- Stop scanner during restart

---

## 📚 Documentation Files

| File | Purpose | Location |
|------|---------|----------|
| INTEGRATION.md | Complete integration guide | API Server |
| GETTING_STARTED.md | Quick start guide | API Server |
| README.md | Project overview | Both projects |
| API_SERVER.md | API server reference | Scanner |
| PROJECT_SUMMARY.md | This file | API Server |

---

## 🎯 Use Cases

### Research
- Large-scale malware analysis
- Dataset creation for ML models
- Android malware behavior study

### Education
- Security research training
- Malware analysis practice
- API integration learning

### Dataset Management
- Organize malware samples
- Track analysis progress
- Archive results systematically

---

## 📦 Dependencies

### API Server
```json
{
  "hono": "^4.0.0"
}
```

### Scanner
```txt
requests
tqdm
python-dotenv
```

---

## 🔄 Future Enhancements (Optional)

Potential improvements:
- [ ] Web dashboard for monitoring
- [ ] Multi-threaded scanner option
- [ ] Automatic retry for failed tasks
- [ ] Email notifications
- [ ] Database backup automation
- [ ] APK deduplication
- [ ] Compression for stored files
- [ ] REST API authentication
- [ ] Rate limiting
- [ ] Metrics dashboard

---

## 📝 Version History

- **v1.0.0** (2025-11-09)
  - Initial release
  - Single-threaded scanner
  - Bun + Hono API server
  - SQLite database
  - Complete workflow implementation

---

## 👨‍💻 Development Notes

### Refactoring Decisions
1. **Removed multi-threading** - Simplified to single-threaded for better disk space management
2. **Changed storage from `./apk/` to `./temp/`** - Indicates temporary nature
3. **Removed CSV dependencies** - Task management via database only
4. **Implemented aggressive cleanup** - Delete files immediately after upload
5. **Added retry mechanism** - Handle large file uploads over LAN

### Technology Choices
- **Bun over Node.js** - 2-3× faster, better file handling
- **Hono over Express** - Lightweight, modern, TypeScript-first
- **SQLite over MySQL/Postgres** - Simpler setup, sufficient for task queue
- **Single-threaded over multi-threaded** - Disk space optimization

---

## 🤝 Integration Checklist

Before running the complete system:

- [ ] API server running (`http://localhost:8000`)
- [ ] Database initialized (`bun run db:init`)
- [ ] Tasks added to queue
- [ ] MobSF Docker running
- [ ] Scanner `.env` configured
- [ ] AndroZoo API key valid
- [ ] MobSF API key correct
- [ ] Sufficient disk space (50+ GB for 1000 APKs)
- [ ] Network connectivity verified

---

## 📧 Support

For issues or questions:
1. Check logs (API server and scanner)
2. Review INTEGRATION.md
3. Test endpoints with examples/test-api.sh
4. Verify all prerequisites

---

## 📜 License

MIT License

---

**Project Created:** November 9, 2025
**System Status:** Production Ready ✅

---

🚀 **Ready to analyze thousands of Android malware samples!**
