# MindThread

A real-time collaborative study group platform that enables students to create study groups, chat in real-time, share documents, and generate AI-powered summaries of conversations and documents.

![MindThread](https://img.shields.io/badge/MindThread-Study%20Groups-blue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-010101?logo=socket.io)

## ✨ Features

- **Real-Time Messaging** - Chat with group members instantly using Socket.IO
- **File Sharing** - Upload and share PDF, DOCX, and TXT documents
- **AI-Powered Summaries** - Generate summaries of conversations and documents using Google Gemini
- **Message Reactions** - React to messages with emojis
- **Message Replies** - Reply to specific messages in threads
- **Group Management** - Create groups, invite members, and manage roles
- **Responsive Design** - Works seamlessly on mobile and desktop
- **Secure Authentication** - JWT-based authentication with password hashing
- **Typing Indicators** - See when members are typing
- **Dashboard** - View your groups, messages, and activity at a glance

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - UI library
- **TypeScript** - Type safety
- **Vite 5.4.19** - Build tool
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Socket.IO Client** - Real-time communication
- **React Router** - Routing
- **TanStack Query** - Server state management

### Backend
- **Node.js** - Runtime
- **Express 4.18.2** - Web framework
- **Socket.IO 4.6.1** - Real-time WebSocket server
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Cloud file storage
- **Google Gemini AI** - AI summaries

### Infrastructure
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **MongoDB Atlas** - Database hosting
- **Cloudinary** - File storage CDN

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local or MongoDB Atlas account)
- **Git**

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mindthread.git
cd mindthread
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Configure Backend Environment Variables** (`backend/.env`):

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/mindthread
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mindthread?retryWrites=true&w=majority

# Server Configuration
PORT=5001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173,http://localhost:8080

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Cloudinary Configuration (for file storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google Gemini API Key (for AI summaries)
GEMINI_API_KEY=your-gemini-api-key-here
```

**Get API Keys:**
- **Cloudinary**: Sign up at [cloudinary.com](https://cloudinary.com/users/register/free) → Dashboard → Settings → Product Environment Credentials
- **Google Gemini**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 3. Frontend Setup

```bash
# Navigate back to root directory
cd ..

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Configure Frontend Environment Variables** (`.env`):

```env
# Backend API URL
VITE_API_URL=http://localhost:5001/api

# Socket.IO Server URL
VITE_SOCKET_URL=http://localhost:5001
```

### 4. Start MongoDB

**Option A: Local MongoDB**
```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Or run manually
mongod --config /usr/local/etc/mongod.conf
```

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a cluster and get your connection string
- Update `MONGODB_URI` in `backend/.env`

**Option C: Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001/api
- **Socket.IO**: http://localhost:5001

## 📁 Project Structure

```
mindthread/
├── backend/                 # Backend server
│   ├── config/             # Configuration files
│   │   ├── database.js     # MongoDB connection
│   │   └── cloudinary.js   # Cloudinary setup
│   ├── controllers/        # Route controllers
│   │   ├── authController.js
│   │   ├── groupController.js
│   │   ├── messageController.js
│   │   ├── fileController.js
│   │   └── summaryController.js
│   ├── models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Message.js
│   │   ├── File.js
│   │   └── Summary.js
│   ├── routes/              # API routes
│   ├── middleware/          # Express middleware
│   ├── sockets/             # Socket.IO handlers
│   ├── services/            # External services
│   │   └── geminiService.js
│   └── server.js            # Entry point
│
├── src/                     # Frontend source
│   ├── components/          # React components
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── Navbar.tsx
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx
│   │   ├── GroupChat.tsx
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useMessages.ts
│   │   ├── useFiles.ts
│   │   └── useSummaries.ts
│   ├── services/            # API & Socket services
│   │   ├── api.ts
│   │   └── socket.ts
│   ├── contexts/            # React Context
│   │   └── AuthContext.tsx
│   └── types/               # TypeScript types
│
├── public/                  # Static assets
└── README.md                # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PATCH /api/auth/profile` - Update profile

### Groups
- `GET /api/groups` - Get user's groups
- `GET /api/groups/:groupId` - Get group details
- `POST /api/groups` - Create group
- `POST /api/groups/:groupId/join` - Join group
- `POST /api/groups/:groupId/leave` - Leave group

### Messages
- `GET /api/groups/:groupId/messages` - Get messages (paginated)
- `POST /api/groups/:groupId/messages` - Send message
- `POST /api/groups/:groupId/messages/:messageId/reaction` - Add reaction

### Files
- `GET /api/groups/:groupId/files` - Get files
- `POST /api/groups/:groupId/files` - Upload file
- `DELETE /api/groups/:groupId/files/:fileId` - Delete file

### Summaries
- `GET /api/groups/:groupId/summaries` - Get summaries
- `POST /api/groups/:groupId/summaries/chat` - Generate chat summary
- `POST /api/groups/:groupId/summaries/document` - Generate document summary


## 🚢 Deployment

### Frontend (Vercel)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables:
     ```
     VITE_API_URL=https://your-backend-url.onrender.com/api
     VITE_SOCKET_URL=https://your-backend-url.onrender.com
     ```
   - Deploy!

### Backend (Render)

1. **Create a new Web Service** on [Render](https://render.com)
2. **Connect your GitHub repository**
3. **Configure:**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5001
   MONGODB_URI=your-mongodb-atlas-uri
   JWT_SECRET=your-jwt-secret
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   GEMINI_API_KEY=your-gemini-key
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

### Database (MongoDB Atlas)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Update `MONGODB_URI` in your backend environment variables

## 🧪 Testing

```bash
# Run backend tests (if available)
cd backend
npm test

# Run frontend tests (if available)
npm test
```

## 📝 Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 📧 Contact

For questions or support, please open an issue on GitHub.

---


