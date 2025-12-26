# Study Smart AI - Backend

## MongoDB Setup

### Option 1: Local MongoDB (Recommended for Development)

1. **Install MongoDB** (if not already installed):
   ```bash
   # macOS (using Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community
   
   # Start MongoDB service
   brew services start mongodb-community
   
   # Or run manually
   mongod --config /usr/local/etc/mongod.conf
   ```

2. **Verify MongoDB is running**:
   ```bash
   # Check if MongoDB is running
   brew services list | grep mongodb
   
   # Or test connection
   mongosh
   ```

3. **Configure connection in `.env`**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/study-smart-ai
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create a free account** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **Create a cluster** and get your connection string

3. **Configure in `.env`**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/study-smart-ai?retryWrites=true&w=majority
   ```

### Option 3: Docker MongoDB

```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Connection string
MONGODB_URI=mongodb://localhost:27017/study-smart-ai
```

## Environment Variables

Create a `.env` file in the `backend` directory with:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/study-smart-ai

# Server Configuration
PORT=5001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173,http://localhost:8080

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Gemini AI API Key (optional)
GEMINI_API_KEY=your-gemini-api-key-here
```

## Installation

```bash
cd backend
npm install
```

## Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## Troubleshooting

### MongoDB Connection Issues

1. **Check if MongoDB is running**:
   ```bash
   # macOS
   brew services list | grep mongodb
   
   # Linux
   sudo systemctl status mongod
   ```

2. **Test connection manually**:
   ```bash
   mongosh mongodb://localhost:27017/study-smart-ai
   ```

3. **Check MongoDB logs**:
   ```bash
   # macOS
   tail -f /usr/local/var/log/mongodb/mongo.log
   ```

4. **Verify connection string format**:
   - Local: `mongodb://localhost:27017/database-name`
   - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/database-name`

### Common Issues

- **"MongoServerError: Authentication failed"**: Check username/password in connection string
- **"ECONNREFUSED"**: MongoDB is not running or wrong port
- **"MongooseServerSelectionError"**: Network issue or wrong connection string
