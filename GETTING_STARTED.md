# 🚀 Getting Started with RAPART MobSF API Server

## Quick Setup (3 steps)

### 1. Install Dependencies
```bash
bun install
```

### 2. Initialize Database
```bash
bun run db:init
```

### 3. Start Server
```bash
# Development
bun run dev

# Production
bun run start
```

Server runs on `http://localhost:8000`

---

## Testing the API

### Add a task
```bash
curl -X POST http://localhost:8000/add-task \
  -H "Content-Type: application/json" \
  -d '{"hash": "abc123...", "label": "malware"}'
```

### Get next task
```bash
curl http://localhost:8000/get
```

### View statistics
```bash
curl http://localhost:8000/stats
```

---

## Integration with Scanner

Update your scanner's `.env`:
```env
API_SERVER=http://192.168.x.x:8000
```

The scanner will automatically:
1. Call `GET /get` to get hash
2. Download and scan APK
3. Call `POST /post` to update status
4. Call `PUT /put` to upload files

---

## Project Structure

```
├── src/
│   ├── db/database.ts    # Database operations
│   ├── types/index.ts    # TypeScript types
│   └── index.ts          # Main server
├── storage/              # Uploaded files
├── data/tasks.db         # SQLite database
└── examples/test-api.sh  # API testing script
```

---

## Need Help?

- Read the [README.md](README.md) for full documentation
- Run `./examples/test-api.sh` to test all endpoints
- Check `http://localhost:8000/stats` for server health

