# Study Smart AI - Backend Server

Backend server for the Study Smart AI application, built with Node.js, Express.js, MongoDB, and Socket.io.

## Features

- 🔐 JWT-based authentication
- 👥 Study group management with role-based access control
- 💬 Real-time chat with Socket.io
- 📁 File upload and management
- 🤖 AI-powered summaries using Gemini API
- 🛡️ Secure API endpoints with authentication middleware

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (with Mongoose ODM)
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Multer** - File upload handling
- **Gemini API** - AI summarization

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Gemini API key from Google AI Studio

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `backend` directory (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/study-smart-ai
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-pro
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile (requires auth)

### Groups
- `GET /api/groups` - Get all groups for authenticated user
- `GET /api/groups/:id` - Get a specific group
- `POST /api/groups` - Create a new group
- `POST /api/groups/:groupId/join` - Join a group
- `POST /api/groups/:groupId/leave` - Leave a group
- `PATCH /api/groups/:groupId/members/:userId/role` - Update member role (owner/admin only)
- `DELETE /api/groups/:groupId/members/:userId` - Remove member (owner/admin only)

### Messages
- `GET /api/groups/:groupId/messages?page=1&limit=50` - Get messages (paginated)
- `POST /api/groups/:groupId/messages` - Send a message

### Files
- `GET /api/groups/:groupId/files` - Get all files in a group
- `POST /api/groups/:groupId/files` - Upload a file (multipart/form-data)
- `DELETE /api/groups/:groupId/files/:fileId` - Delete a file
- `GET /api/files/:filename` - Serve a file

### Summaries
- `GET /api/groups/:groupId/summaries` - Get all summaries for a group
- `POST /api/groups/:groupId/summaries/chat` - Generate chat summary
- `POST /api/groups/:groupId/summaries/document` - Generate document summary
- `DELETE /api/groups/:groupId/summaries/:summaryId` - Delete a summary

## Socket.io Events

### Client to Server
- `join_group` - Join a group room
- `leave_group` - Leave a group room
- `send_message` - Send a message (also creates DB record)
- `typing` - Send typing indicator

### Server to Client
- `message` - New message received
- `notification` - User joined/left notification
- `typing` - Typing indicator from other users
- `joined_group` - Confirmation of joining group
- `left_group` - Confirmation of leaving group
- `error` - Error message

### Frontend Socket.io Integration Note

⚠️ **Important**: The frontend currently uses a WebSocket placeholder in `src/services/socket.ts`. To connect to this Socket.io backend, you'll need to update the frontend to use the Socket.io client library:

```bash
npm install socket.io-client
```

Then update `src/services/socket.ts` to use Socket.io client instead of WebSocket. The backend is fully compatible with Socket.io client connections.

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

For Socket.io connections, pass the token in the connection handshake:
```javascript
socket.connect({
  auth: {
    token: 'your-jwt-token'
  }
});
```

## Database Models

### User
- `email` (unique, required)
- `username` (required)
- `password` (hashed, required)
- `avatar` (optional)
- `role` (admin/user)

### Group
- `name` (required)
- `description`
- `owner` (User reference)
- `members` (array of { user, role, joinedAt })

### Message
- `content` (required)
- `sender` (User reference)
- `group` (Group reference)
- `createdAt`, `updatedAt`

### File
- `filename` (required)
- `originalName` (required)
- `mimeType` (required)
- `size` (required)
- `path` (required)
- `url` (required)
- `uploader` (User reference)
- `group` (Group reference)

### Summary
- `type` (chat/document)
- `content` (required)
- `keyTopics` (array)
- `actionItems` (array)
- `group` (Group reference)
- `sourceDocument` (File reference, optional)
- `messageRange` (optional)
- `generatedBy` (User reference)

## File Uploads

- Supported file types: PDF, DOCX, TXT
- Default max file size: 10MB
- Files are stored in the `uploads` directory (configurable via `UPLOAD_DIR`)
- File URLs are served at `/api/files/:filename`

## AI Summarization

The backend uses Gemini API to generate summaries:
- **Chat Summaries**: Analyzes recent messages in a group
- **Document Summaries**: Analyzes uploaded text documents

Both types of summaries include:
- Main content summary
- Key topics (array)
- Action items (array)

## Error Handling

All API endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error message here"
}
```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret in production
2. **Password Hashing**: Passwords are hashed using bcrypt
3. **File Upload**: Validate file types and sizes
4. **CORS**: Configure CORS properly for production
5. **Environment Variables**: Never commit `.env` file to version control

## Development Tips

- Use `npm run dev` for auto-reload during development
- Check MongoDB connection in console on startup
- Socket.io events are logged to console for debugging
- File uploads are stored in `./uploads` directory

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env` file
- Verify network connectivity

### Socket.io Connection Issues
- Check CORS configuration
- Verify JWT token is valid
- Check browser console for connection errors

### File Upload Issues
- Ensure `uploads` directory exists and is writable
- Check file size limits
- Verify file type is allowed

### Gemini API Issues
- Verify `GEMINI_API_KEY` is set correctly
- Check API quota/limits
- Review error logs for specific error messages
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## License

ISC

