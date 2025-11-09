// src/db.ts - MongoDB Connection and Schema
import { MongoClient, Db, Collection } from 'mongodb'

// Task interface matching MongoDB schema
export interface Task {
  hash: string
  tag: 'malware' | 'benign'
  status: boolean
  createdAt?: Date
  updatedAt?: Date
  error?: string
}

class Database {
  private client: MongoClient | null = null
  private db: Db | null = null
  private tasksCollection: Collection<Task> | null = null

  async connect() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://admin:rapart_secure_password@localhost:27017/rapart?authSource=admin'

      this.client = new MongoClient(uri)
      await this.client.connect()

      this.db = this.client.db('rapart')
      this.tasksCollection = this.db.collection<Task>('tasks')

      console.log('✅ Connected to MongoDB')

      // Create indexes if they don't exist
      await this.createIndexes()

      return this.db
    } catch (error) {
      console.error('❌ MongoDB connection error:', error)
      throw error
    }
  }

  private async createIndexes() {
    if (!this.tasksCollection) return

    try {
      await this.tasksCollection.createIndex({ hash: 1 }, { unique: true })
      await this.tasksCollection.createIndex({ tag: 1 })
      await this.tasksCollection.createIndex({ status: 1 })
      await this.tasksCollection.createIndex({ createdAt: -1 })
      console.log('✅ Database indexes created/verified')
    } catch (error) {
      console.warn('⚠️  Index creation warning:', error)
    }
  }

  getTasks(): Collection<Task> {
    if (!this.tasksCollection) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.tasksCollection
  }

  async disconnect() {
    if (this.client) {
      await this.client.close()
      console.log('🔌 Disconnected from MongoDB')
    }
  }

  // Get next pending task (status = false)
  async getNextTask(): Promise<Task | null> {
    const collection = this.getTasks()

    const task = await collection.findOne(
      { status: false },
      { sort: { createdAt: 1 } }
    )

    return task
  }

  // Update task status
  async updateTaskStatus(hash: string, status: boolean, error?: string): Promise<boolean> {
    const collection = this.getTasks()

    const updateDoc: any = {
      status,
      updatedAt: new Date()
    }

    if (error) {
      updateDoc.error = error
    }

    const result = await collection.updateOne(
      { hash },
      { $set: updateDoc }
    )

    return result.modifiedCount > 0
  }

  // Add new task
  async addTask(hash: string, tag: 'malware' | 'benign'): Promise<boolean> {
    const collection = this.getTasks()

    try {
      await collection.insertOne({
        hash,
        tag,
        status: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      return true
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error
        console.warn(`⚠️  Task with hash ${hash} already exists`)
        return false
      }
      throw error
    }
  }

  // Get statistics
  async getStats() {
    const collection = this.getTasks()

    const [total, completed, failed, malwareCount, benignCount] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: true }),
      collection.countDocuments({ status: false, error: { $exists: true } }),
      collection.countDocuments({ tag: 'malware' }),
      collection.countDocuments({ tag: 'benign' })
    ])

    return {
      total,
      completed,
      pending: total - completed,
      failed,
      byTag: {
        malware: malwareCount,
        benign: benignCount
      }
    }
  }
}

// Singleton instance
export const database = new Database()
