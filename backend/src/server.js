import express from 'express';
import "dotenv/config";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import chatRoutes from './routes/chat.route.js';
import { connectDB } from './lib/db.js';

const app = express();
const PORT = process.env.PORT;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isOriginAllowed = (origin) => {
    if (!origin) return true;

    if (allowedOrigins.includes(origin)) return true;

    try {
        const { hostname, protocol } = new URL(origin);
        const isRenderHost = hostname.endsWith('.onrender.com');
        const isHttpProtocol = protocol === 'http:' || protocol === 'https:';
        return isRenderHost && isHttpProtocol;
    } catch {
        return false;
    }
};

const corsOriginHandler = (origin, callback) => {
    if (isOriginAllowed(origin)) {
        return callback(null, true);
    }

    return callback(new Error('CORS blocked for this origin'));
};

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.io with CORS
const io = new Server(httpServer, {
    cors: {
        origin: corsOriginHandler,
        credentials: true,
        methods: ['GET', 'POST']
    }
});

app.use(cors({
    origin: corsOriginHandler,
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io connection handling
const onlineUsers = new Map(); // userId -> Set<socketId>
app.set('io', io);
app.set('onlineUsers', onlineUsers);

const getUserSockets = (userId) => {
    if (!userId) return null;
    return onlineUsers.get(String(userId)) || null;
};

const emitToUserSockets = (userId, event, payload = {}) => {
    const sockets = getUserSockets(userId);
    if (!sockets || sockets.size === 0) {
        return false;
    }

    sockets.forEach((socketId) => {
        io.to(socketId).emit(event, payload);
    });

    return true;
};

io.on('connection', (socket) => {
    // User joins with their ID
    socket.on('user-online', (userId) => {
        const normalizedUserId = String(userId);
        const existingSockets = getUserSockets(normalizedUserId) || new Set();
        existingSockets.add(socket.id);
        onlineUsers.set(normalizedUserId, existingSockets);
        socket.data.userId = normalizedUserId;
        
        // Broadcast online status to all users
        io.emit('user-status-change', {
            userId: normalizedUserId,
            isOnline: true
        });
    });

    // Call initiation
    socket.on('call-user', ({ to, from, offer, callType }) => {
        const delivered = emitToUserSockets(to, 'incoming-call', {
                from,
                offer,
                callType
            });

        if (!delivered) {
            socket.emit('user-offline', { userId: to });
        }
    });

    // Call answer
    socket.on('answer-call', ({ to, answer }) => {
        emitToUserSockets(to, 'call-answered', { answer });
    });

    // ICE candidates exchange
    socket.on('ice-candidate', ({ to, candidate }) => {
        emitToUserSockets(to, 'ice-candidate', { candidate });
    });

    // Call rejection
    socket.on('reject-call', ({ to }) => {
        emitToUserSockets(to, 'call-rejected');
    });

    // Call end
    socket.on('end-call', ({ to }) => {
        emitToUserSockets(to, 'call-ended');
    });

    // Disconnect
    socket.on('disconnect', () => {
        const userId = socket.data.userId;
        if (!userId) return;

        const sockets = getUserSockets(userId);
        if (!sockets) return;

        sockets.delete(socket.id);

        if (sockets.size === 0) {
            onlineUsers.delete(userId);

            // Broadcast offline status only when last socket disconnects
            io.emit('user-status-change', {
                userId,
                isOnline: false
            });
            return;
        }

        onlineUsers.set(userId, sockets);
    });
});

const startServer = async () => {
    try {
        await connectDB();
        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();