# 🚀 RAPART MobSF API Server

```
docker-compose up -d --build
```

High-performance API server for MobSF malware analysis pipeline, built with **Bun + Hono + MongoDB + Nginx**.

---

## ✨ Features

- ⚡ **Blazing Fast** - Built on Bun runtime
- 🗄️ **MongoDB Database** - Persistent task queue with schema validation
- 📁 **File Upload** - Handle large APK files (up to 500MB)
- 🔄 **Task Queue** - FIFO queue for malware analysis
- 🏷️ **Tag-Based Storage** - Separate malware/benign classification
- 📊 **Web Dashboard** - Real-time monitoring and task management
- 📈 **Statistics** - Live analytics with auto-refresh
- 🔄 **Load Balancing** - Nginx with 3 server instances
- 🐳 **Docker Ready** - One command deployment
- 🛡️ **Type-Safe** - Full TypeScript support
- 🔌 **REST API** - Clean and documented endpoints

---

## 📋 Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- [Bun](https://bun.sh) >= 1.0.0 (for local development)
- Storage space for APK files and reports (500MB+ recommended)

---

## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

**One command to run everything:**

\`\`\`bash
docker-compose up -d --build
\`\`\`

This will start:
- MongoDB database
- 3 Hono API server instances
- Nginx load balancer

**Access the services:**
- 🖥️ **Web Dashboard**: `http://localhost/` (Real-time monitoring)
- 🔌 **API Endpoint**: `http://localhost/`
- 🗄️ **MongoDB**: `localhost:27017`

**View logs:**
\`\`\`bash
docker-compose logs -f
\`\`\`

**Stop services:**
\`\`\`bash
docker-compose down
\`\`\`

---

### Option 2: Local Development

### 1. Install Dependencies

\`\`\`bash
bun install
\`\`\`

### 2. Setup MongoDB

Make sure MongoDB is running locally or update `MONGODB_URI` in `.env`

### 3. Start Server

\`\`\`bash
# Development (with hot reload)
bun run dev

# Production
bun run start
\`\`\`

Server will run on `http://0.0.0.0:8000`

**Access Dashboard:**
Open `http://localhost:8000` in your browser

---

## 🖥️ Web Dashboard

![Dashboard Preview](https://via.placeholder.com/800x400/667eea/ffffff?text=Real-time+Dashboard)

The web dashboard provides:
- 📊 **Real-time Statistics** - Total, completed, pending, and failed tasks
- 📈 **Visual Analytics** - Distribution charts for malware/benign
- ➕ **Task Management** - Add new tasks directly from the UI
- 🔄 **Auto-refresh** - Updates every 5 seconds
- 🎨 **Modern UI** - Beautiful gradient design with responsive layout

**Access:** `http://localhost/` (Docker) or `http://localhost:8000` (Local)

---

## 📡 API Endpoints

### 1. GET /get - Get Next Task

Retrieve the next pending task from MongoDB.

**Response:**
\`\`\`json
{
  "hash": "abc123...",
  "tag": "malware"
}
\`\`\`

---

### 2. POST /post - Update Task Status

Update the status of a task.

**Request Body:**
\`\`\`json
{
  "hash": "abc123...",
  "status": true,
  "error": "Optional error message"
}
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "hash": "abc123...",
  "status": true
}
\`\`\`

---

### 3. PUT /put - Upload APK & Report

Upload APK file and analysis report. Files are automatically separated by tag (malware/benign).

**Form Data:**
- `apk` (File) - APK file (max 500MB)
- `report` (File) - JSON report file (max 500MB)
- `hash` (String) - File hash
- `tag` (String) - "malware" or "benign"

**Response:**
\`\`\`json
{
  "ok": true,
  "hash": "abc123...",
  "tag": "malware",
  "files": {
    "apk": "./storage/apk/malware/abc123.apk",
    "report": "./storage/reports/malware/abc123.json"
  },
  "sizes": {
    "apk": 52428800,
    "report": 4096
  }
}
\`\`\`

---

### 4. POST /add-task - Add New Task

Add a new task to the queue.

**Request Body:**
\`\`\`json
{
  "hash": "abc123...",
  "tag": "malware"
}
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "hash": "abc123...",
  "tag": "malware",
  "queueLength": 42
}
\`\`\`

---

### 5. GET /stats - View Statistics

Get real-time statistics from MongoDB.

**Response:**
\`\`\`json
{
  "total": 100,
  "completed": 75,
  "pending": 25,
  "failed": 5,
  "byTag": {
    "malware": 60,
    "benign": 40
  }
}
\`\`\`

---

## 📂 Storage Structure

Files are automatically organized by classification tag:

\`\`\`
storage/
├── apk/
│   ├── malware/          # Malware APK files
│   │   └── {hash}.apk
│   └── benign/           # Benign APK files
│       └── {hash}.apk
└── reports/
    ├── malware/          # Malware analysis reports
    │   └── {hash}.json
    └── benign/           # Benign analysis reports
        └── {hash}.json
\`\`\`

---

## 🗄️ MongoDB Schema

\`\`\`javascript
{
  hash: String,        // SHA256 hash (unique)
  tag: String,         // "malware" or "benign"
  status: Boolean,     // true = completed, false = pending
  createdAt: Date,     // Task creation timestamp
  updatedAt: Date,     // Last update timestamp
  error: String        // Error message (optional)
}
\`\`\`

**Indexes:**
- `hash` (unique)
- `tag`
- `status`
- `createdAt` (descending)

---

## 🐳 Docker Architecture

\`\`\`
┌─────────────────────────────────────┐
│   Nginx Load Balancer (Port 80)    │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
    ┌───▼──┐  ┌──▼───┐  ┌──▼───┐
    │ App1 │  │ App2 │  │ App3 │
    └───┬──┘  └──┬───┘  └──┬───┘
        │        │         │
        └────────┼─────────┘
                 │
         ┌───────▼────────┐
         │   MongoDB      │
         │  (Port 27017)  │
         └────────────────┘
\`\`\`

---

## 🔌 Integration with MobSF Scanner

Works seamlessly with the Python scanner in `script-analysis-mobsf-auto`.

**Scanner project location:** `E:\GITHUB\script-analysis-mobsf-auto`

For complete integration guide, see [INTEGRATION.md](INTEGRATION.md).

---

## 🛠️ Development Commands

\`\`\`bash
# Install dependencies
bun install

# Run locally (development)
bun run dev

# Run locally (production)
bun run start

# Docker commands
bun run docker:build      # Build images
bun run docker:up         # Start services
bun run docker:down       # Stop services
bun run docker:logs       # View logs
bun run docker:rebuild    # Rebuild and restart
\`\`\`

---

## 🔒 Security Features

- ✅ File size validation (max 500MB)
- ✅ Content-Type validation
- ✅ Schema validation in MongoDB
- ✅ Rate limiting via Nginx (10 req/s, burst 20)
- ✅ Error handling for large file uploads
- ✅ Separate storage for malware/benign files
- ✅ Non-root user in Docker containers

---

## 📝 License

MIT License
