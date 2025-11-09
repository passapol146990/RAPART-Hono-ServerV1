// MongoDB initialization script
db = db.getSiblingDB('rapart');

// Create collection with schema validation
db.createCollection('tasks', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['hash', 'tag', 'status'],
      properties: {
        hash: {
          bsonType: 'string',
          description: 'SHA256 hash of the APK file - required'
        },
        tag: {
          bsonType: 'string',
          enum: ['malware', 'benign'],
          description: 'Classification tag - must be malware or benign'
        },
        status: {
          bsonType: 'bool',
          description: 'Processing status - true: success, false: failed/pending'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Timestamp when task was created'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Timestamp when task was last updated'
        },
        error: {
          bsonType: 'string',
          description: 'Error message if status is false'
        }
      }
    }
  }
});

// Create indexes for better performance
db.tasks.createIndex({ hash: 1 }, { unique: true });
db.tasks.createIndex({ tag: 1 });
db.tasks.createIndex({ status: 1 });
db.tasks.createIndex({ createdAt: -1 });

// Insert sample data (optional)
db.tasks.insertMany([
  {
    hash: 'sample_hash_1234567890abcdef',
    tag: 'benign',
    status: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('✅ Database initialization completed');
print('📊 Collection "tasks" created with schema validation');
print('🔍 Indexes created: hash (unique), tag, status, createdAt');
