# MongoDB Data Deletion Guide

This guide provides multiple ways to delete data from your MongoDB database.

## ⚠️ WARNING
**Deleting data is permanent and cannot be undone!** Make sure you have backups if needed.

---

## Option 1: Delete All Data (Recommended)

Use the provided script to delete all data from all collections:

```bash
cd backend
node scripts/clearDatabase.js --confirm
```

**Without confirmation flag** (shows what will be deleted):
```bash
node scripts/clearDatabase.js
```

This will delete:
- All users
- All groups
- All messages
- All files
- All summaries

---

## Option 2: Delete Specific Collection

Delete data from a single collection:

```bash
cd backend
node scripts/clearCollection.js users --confirm
node scripts/clearCollection.js groups --confirm
node scripts/clearCollection.js messages --confirm
node scripts/clearCollection.js files --confirm
node scripts/clearCollection.js summaries --confirm
```

**Available collections:**
- `users` - All user accounts
- `groups` - All study groups
- `messages` - All chat messages
- `files` - All uploaded files
- `summaries` - All AI summaries

---

## Option 3: Using MongoDB Shell (mongosh)

### Connect to MongoDB:
```bash
# Local MongoDB
mongosh mongodb://localhost:27017/mindthread

# Or if using MongoDB Atlas
mongosh "your-connection-string"
```

### Delete All Data:
```javascript
// Switch to your database
use mindthread

// Delete all documents from collections
db.users.deleteMany({})
db.groups.deleteMany({})
db.messages.deleteMany({})
db.files.deleteMany({})
db.summaries.deleteMany({})

// Or drop entire collections (removes collection structure too)
db.users.drop()
db.groups.drop()
db.messages.drop()
db.files.drop()
db.summaries.drop()
```

### Delete Specific Documents:
```javascript
// Delete a specific user by email
db.users.deleteOne({ email: "user@example.com" })

// Delete all users with a condition
db.users.deleteMany({ institution: "Some University" })

// Delete all messages from a specific group
db.messages.deleteMany({ group: ObjectId("group-id-here") })
```

---

## Option 4: Using MongoDB Compass (GUI)

1. **Download MongoDB Compass** from [mongodb.com/products/compass](https://www.mongodb.com/products/compass)

2. **Connect** using your connection string from `.env` file:
   - Local: `mongodb://localhost:27017/mindthread`
   - Atlas: Your Atlas connection string

3. **Navigate to Collections:**
   - Select your database (`mindthread`)
   - Click on a collection (e.g., `users`)

4. **Delete Data:**
   - To delete all: Click the collection → Click "Delete" → Confirm
   - To delete specific documents: Select documents → Click "Delete"

---

## Option 5: Drop Entire Database

**⚠️ This deletes the entire database including all collections!**

### Using Script:
```bash
# This would require modifying the script to drop the database
# Not recommended unless you want to start completely fresh
```

### Using MongoDB Shell:
```javascript
// Connect to MongoDB
mongosh mongodb://localhost:27017

// Switch to your database
use mindthread

// Drop the entire database
db.dropDatabase()
```

---

## Option 6: Using MongoDB Atlas UI

If you're using MongoDB Atlas:

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your cluster
3. Click "Browse Collections"
4. Select your database and collection
5. Use the filter/search to find documents
6. Select documents and click "Delete"
7. Or use "Drop Collection" to delete the entire collection

---

## Quick Reference

| Task | Command |
|------|---------|
| Delete all data | `node scripts/clearDatabase.js --confirm` |
| Delete users only | `node scripts/clearCollection.js users --confirm` |
| Delete groups only | `node scripts/clearCollection.js groups --confirm` |
| Delete messages only | `node scripts/clearCollection.js messages --confirm` |
| Delete files only | `node scripts/clearCollection.js files --confirm` |
| Delete summaries only | `node scripts/clearCollection.js summaries --confirm` |

---

## Troubleshooting

### Script not found
Make sure you're in the `backend` directory:
```bash
cd backend
node scripts/clearDatabase.js --confirm
```

### Connection error
Check your `.env` file has the correct `MONGODB_URI`:
```env
MONGODB_URI=mongodb://localhost:27017/mindthread
```

### Permission denied
Make sure MongoDB is running:
```bash
# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongod
```

---

## Safety Tips

1. **Backup first** (if needed):
   ```bash
   mongodump --uri="mongodb://localhost:27017/mindthread" --out=./backup
   ```

2. **Test on development** before running on production

3. **Double-check** the `--confirm` flag before running

4. **Verify deletion** by checking collection counts after deletion

