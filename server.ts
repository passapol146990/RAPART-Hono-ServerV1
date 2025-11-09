// server.ts
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { database } from './src/db'
import { mkdir } from 'node:fs/promises'

const app = new Hono()

// Connect to MongoDB
await database.connect()

// Create storage directories (handle shared volume case)
const storageDirs = [
  './storage/apk/malware',
  './storage/apk/benign',
  './storage/reports/malware',
  './storage/reports/benign'
]

for (const dir of storageDirs) {
  try {
    await mkdir(dir, { recursive: true })
  } catch (error: any) {
    // Ignore EEXIST errors (directory already exists from another instance)
    if (error.code !== 'EEXIST') {
      throw error
    }
  }
}

// Serve static files (Dashboard)
app.get('/', serveStatic({ path: './public/index.html' }))
app.get('/public/*', serveStatic({ root: './' }))

// 1. GET /get - ดึง hash ถัดไปจาก MongoDB พร้อม tag
app.get('/get', async (c) => {
  try {
    const task = await database.getNextTask()

    if (task) {
      return c.json({
        hash: task.hash,
        tag: task.tag
      })
    }

    return c.json(null)
  } catch (error: any) {
    console.error('❌ Error fetching task:', error)
    return c.json({ error: 'Failed to fetch task', message: error.message }, 500)
  }
})

// 2. POST /post - อัปเดตสถานะใน MongoDB
app.post('/post', async (c) => {
  try {
    const { hash, status, error } = await c.req.json()

    if (!hash || typeof status !== 'boolean') {
      return c.json({ error: 'Invalid parameters. Required: hash (string), status (boolean)' }, 400)
    }

    console.log(`📊 Status update: ${hash} -> ${status ? 'success' : 'failed'}`)

    const updated = await database.updateTaskStatus(hash, status, error)

    if (!updated) {
      return c.json({ error: 'Task not found or already updated', hash }, 404)
    }

    return c.json({ ok: true, hash, status })
  } catch (error: any) {
    console.error('❌ Error updating status:', error)
    return c.json({ error: 'Failed to update status', message: error.message }, 500)
  }
})

// 3. PUT /put - รับไฟล์ APK และ report (แยกตาม malware/benign)
app.put('/put', async (c) => {
  try {
    // ตรวจสอบ Content-Type
    const contentType = c.req.header('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      return c.json({ error: 'Content-Type must be multipart/form-data' }, 400)
    }

    const formData = await c.req.formData()

    const apkFile = formData.get('apk') as File
    const reportFile = formData.get('report') as File
    const hash = formData.get('hash') as string
    const tag = formData.get('tag') as string

    // Validation
    if (!apkFile || !reportFile || !hash || !tag) {
      return c.json({
        error: 'Missing required fields',
        required: ['apk (File)', 'report (File)', 'hash (string)', 'tag (malware|benign)']
      }, 400)
    }

    if (tag !== 'malware' && tag !== 'benign') {
      return c.json({ error: 'Invalid tag. Must be "malware" or "benign"' }, 400)
    }

    // ตรวจสอบขนาดไฟล์ (max 500MB per file)
    const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
    if (apkFile.size > MAX_FILE_SIZE) {
      return c.json({ error: `APK file too large. Max size: 500MB, received: ${(apkFile.size / 1024 / 1024).toFixed(2)}MB` }, 413)
    }
    if (reportFile.size > MAX_FILE_SIZE) {
      return c.json({ error: `Report file too large. Max size: 500MB, received: ${(reportFile.size / 1024 / 1024).toFixed(2)}MB` }, 413)
    }

    // แยกเก็บตาม tag (malware/benign)
    const apkPath = `./storage/apk/${tag}/${hash}.apk`
    const reportPath = `./storage/reports/${tag}/${hash}.json`

    // บันทึกไฟล์พร้อม error handling
    try {
      await Promise.all([
        Bun.write(apkPath, apkFile),
        Bun.write(reportPath, reportFile)
      ])
    } catch (writeError: any) {
      console.error('❌ File write error:', writeError)
      return c.json({
        error: 'Failed to save files',
        message: writeError.message
      }, 500)
    }

    console.log(`✅ Saved [${tag}]: ${hash} (APK: ${(apkFile.size / 1024 / 1024).toFixed(2)}MB, Report: ${(reportFile.size / 1024).toFixed(2)}KB)`)

    // อัปเดตสถานะใน database
    await database.updateTaskStatus(hash, true)

    return c.json({
      ok: true,
      hash,
      tag,
      files: {
        apk: apkPath,
        report: reportPath
      },
      sizes: {
        apk: apkFile.size,
        report: reportFile.size
      }
    })
  } catch (error: any) {
    console.error('❌ Error in PUT /put:', error)
    return c.json({
      error: 'Internal server error',
      message: error.message
    }, 500)
  }
})

// 4. POST /add-task - เพิ่มงานใหม่ใน MongoDB (สำหรับ admin)
app.post('/add-task', async (c) => {
  try {
    const { hash, tag } = await c.req.json()

    if (!hash || !tag) {
      return c.json({ error: 'Missing required fields: hash, tag' }, 400)
    }

    if (tag !== 'malware' && tag !== 'benign') {
      return c.json({ error: 'Invalid tag. Must be "malware" or "benign"' }, 400)
    }

    const added = await database.addTask(hash, tag)

    if (!added) {
      return c.json({ error: 'Task already exists', hash }, 409)
    }

    const stats = await database.getStats()

    return c.json({
      ok: true,
      hash,
      tag,
      queueLength: stats.pending
    })
  } catch (error: any) {
    console.error('❌ Error adding task:', error)
    return c.json({ error: 'Failed to add task', message: error.message }, 500)
  }
})

// 5. GET /stats - ดูสถิติจาก MongoDB
app.get('/stats', async (c) => {
  try {
    const stats = await database.getStats()

    return c.json({
      total: stats.total,
      completed: stats.completed,
      pending: stats.pending,
      failed: stats.failed,
      byTag: stats.byTag
    })
  } catch (error: any) {
    console.error('❌ Error fetching stats:', error)
    return c.json({ error: 'Failed to fetch stats', message: error.message }, 500)
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  await database.disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  await database.disconnect()
  process.exit(0)
})

console.log(`
╔════════════════════════════════════════════════╗
║   MobSF API Server (Bun + Hono + MongoDB)     ║
╚════════════════════════════════════════════════╝

🚀 Server running on http://0.0.0.0:8000
🗄️  MongoDB connected

Endpoints:
  GET  /get        - Get next task (hash + tag)
  POST /post       - Update task status
  PUT  /put        - Upload APK + report (separated by tag)
  POST /add-task   - Add new task (hash + tag)
  GET  /stats      - View statistics

Storage Structure:
  ./storage/apk/malware/      - Malware APK files
  ./storage/apk/benign/       - Benign APK files
  ./storage/reports/malware/  - Malware reports
  ./storage/reports/benign/   - Benign reports
`)

export default {
  port: 8000,
  fetch: app.fetch,
}