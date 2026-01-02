# MindThread

MindThread is a real-time group chat application designed to help students collaborate, share study resources, and organize discussions more effectively. It combines instant messaging, file sharing, and AI-powered chat summarization into a single, modern platform.

---

## Features

- **JWT-based User Authentication:** Secure login and registration.
- **Real-time Chat:** Powered by Socket.IO for instant messaging.
- **AI-Powered Summaries:** Uses Gemini AI to condense long chat histories into key takeaways.
- **Modern UI:** ChatGPT-inspired interface with Light and Dark mode.
- **Rich Messaging:** Typing indicators, emoji reactions, message replies, and pinned messages.
- **File Sharing:** Secure media and document uploads integrated with Cloudinary.

---

##  Tech Stack

### Frontend
- **Framework:** React
- **Styling:** Tailwind CSS
- **Language:** TypeScript

### Backend
- **Environment:** Node.js
- **Framework:** Express.js
- **Real-time:** Socket.IO

### Database & Storage
- **Database:** MongoDB
- **File Storage:** Cloudinary

### AI & Security
- **AI Engine:** Gemini AI (Google)
- **Auth:** JSON Web Tokens (JWT)

---

##  System Architecture

MindThread follows a scalable client–server architecture:



- **REST APIs:** Handle authentication, group management, and data persistence.
- **Socket.IO:** Manages real-time communication such as instant messaging and typing indicators.
- **MongoDB:** Stores users, groups, messages, and file metadata.
- **Cloudinary:** Used for secure file uploads and storage.
- **Gemini AI:** Generates concise summaries from chat conversations.

---

## Project Structure

```text
mindthread/
├── backend/
│   ├── config/       # Configurations (DB, Cloudinary)
│   ├── controllers/  # Logic for API routes
│   ├── models/       # Mongoose schemas (User, Message, Group)
│   ├── routes/       # API endpoints
│   ├── sockets/      # Socket.IO event handlers
│   ├── utils/        # Helper functions
│   └── server.js     # Server entry point
├── frontend/
│   ├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Application views
│   └── services/     # API and Socket connection logic
└── README.md

---

## Installation and Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- Cloudinary account
- Gemini API key

---

### Clone the repository

```bash
git clone https://github.com/your-username/mindthread.git
cd mindthread

Backend setup
bash
Copy code
cd backend
npm install

Create a .env file inside the backend directory:

PORT=5001
NODE_ENV=development

MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
GEMINI_API_KEY=your_gemini_api_key


Start the backend server:

npm run dev

Frontend setup
cd frontend
npm install


Create a .env file inside the frontend directory:

VITE_API_URL=http://localhost:5001/api
Start the frontend development server:

npm run dev

Running the Application

Frontend runs at http://localhost:5173

Backend API runs at http://localhost:5001/api

Socket.IO runs on the backend server

Security
JWT-based authentication

Protected API routes

Group membership validation

Secure file handling using Cloudinary

