# CircleTalk 🌐

A modern social networking application with real-time chat, video/voice calling, and friend management features.

## Features ✨

### 🔐 Authentication
- User signup with email validation
- Secure login with JWT tokens
- Profile customization with 50+ avatars

### 👥 Friend Management
- Discover users based on language and location
- Send/receive friend requests
- Accept/reject requests
- Real-time notifications
- Friends list with full profiles

### 💬 Real-Time Chat
- MongoDB-based message persistence
- Auto-refresh messaging (3-second polling)
- Read receipts
- Message history
- Cross-device synchronization

### 📹 Video & Voice Calls
- WebRTC peer-to-peer connections
- Socket.io signaling server
- Video call with camera toggle
- Audio-only mode
- Mute/unmute controls
- Incoming call notifications

### ✨ Profile & Onboarding
- Complete profile setup
- Bio (200 characters)
- Native language selection (18 languages)
- Learning languages (multi-select)
- Interests & hobbies (18 categories)
- Location sharing

### 🎨 UI/UX
- 32 DaisyUI themes
- Responsive design (mobile + desktop)
- Smooth animations
- Beautiful gradients
- Toast notifications

## Tech Stack 💻

### Backend
- **Node.js** + **Express.js**
- **MongoDB** with Mongoose
- **Socket.io** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **React** with Vite
- **TailwindCSS** + **DaisyUI**
- **React Query** for state management
- **React Router** for navigation
- **Axios** for API calls
- **Socket.io-client** for WebRTC signaling

## Installation 🚀

### Prerequisites
- Node.js 20+ 
- MongoDB Atlas account or local MongoDB
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (see .env.example)
cp .env.example .env

# Update .env with your credentials:
# - MONGODB_URI
# - JWT_SECRET_KEY
# - PORT

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## Environment Variables 🔑

### Backend (.env)
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET_KEY=your_jwt_secret_key_min_32_chars
FRONTEND_URL=http://localhost:5173
```

## API Endpoints 📡

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update user profile

### Users
- `GET /api/users/all` - Get all users (discover)
- `GET /api/users/friends` - Get user's friends
- `POST /api/users/friend-request` - Send friend request
- `POST /api/users/accept-request/:requestId` - Accept friend request
- `POST /api/users/reject-request/:requestId` - Reject friend request
- `GET /api/users/friend-requests` - Get incoming/accepted requests
- `GET /api/users/outgoing-requests` - Get sent requests

### Chat
- `POST /api/chat/send` - Send message
- `GET /api/chat/history/:friendId` - Get chat history
- `GET /api/chat/unread-count` - Get unread message count

## Socket.io Events 🔌

### Call Events
- `user-online` - User connects
- `call-user` - Initiate call
- `incoming-call` - Receive call
- `answer-call` - Answer call
- `call-answered` - Call accepted
- `ice-candidate` - WebRTC ICE candidate exchange
- `reject-call` - Reject incoming call
- `end-call` - End active call
- `user-status-change` - Online/offline status

## Database Models 📊

### User
```javascript
{
  fullName: String,
  email: String (unique),
  password: String (hashed),
  bio: String,
  profilePic: String,
  nativeLanguage: String,
  learningLanguages: [String],
  interests: [String],
  location: String,
  isOnboarded: Boolean,
  friends: [ObjectId],
  timestamps: true
}
```

### FriendRequest
```javascript
{
  sender: ObjectId (ref: User),
  recipient: ObjectId (ref: User),
  status: String (pending/accepted/rejected),
  timestamps: true
}
```

### Message
```javascript
{
  sender: ObjectId (ref: User),
  recipient: ObjectId (ref: User),
  text: String,
  read: Boolean,
  timestamps: true
}
```

## Project Structure 📁

```
CircleTalk/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.js
│   │   │   ├── user.js
│   │   │   └── chat.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── FriendRequest.js
│   │   │   └── Message.js
│   │   ├── routes/
│   │   │   ├── auth.route.js
│   │   │   ├── user.route.js
│   │   │   └── chat.route.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   ├── lib/
│   │   │   ├── db.js
│   │   │   └── stream.js
│   │   └── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignUpPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   ├── CallPage.jsx
│   │   │   ├── NotificationPage.jsx
│   │   │   └── OnboardingPage.jsx
│   │   ├── lib/
│   │   │   └── axios.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Features Roadmap 🗺️

### Completed ✅
- User authentication
- Friend request system
- Real-time chat with MongoDB
- Video/voice calling with WebRTC
- Profile customization
- Theme switching
- Responsive design

### Future Enhancements 🔮
- Group chat
- Group video calls
- File/image sharing
- Voice messages
- Story feature
- User blocking
- Report system
- Push notifications
- Mobile apps (React Native)

## Contributing 🤝

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License.

## Contact 📧

For questions or support, please contact the development team.

---

Made with ❤️ by CircleTalk Team
