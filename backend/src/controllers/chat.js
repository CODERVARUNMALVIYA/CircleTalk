import { generateStreamToken } from '../lib/stream.js';
import Message from '../models/Message.js';

export async function getStreamToken(req, res) {
    try {
        const userId = req.user._id || req.user.id;
        const token = generateStreamToken(userId);
        res.status(200).json({ token });
    } catch (error) {
        console.log("Error generating stream token:", error.message);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        });
    }
}

// Send a message
export async function sendMessage(req, res) {
    try {
        const senderId = req.user._id || req.user.id;
        const { recipientId, text } = req.body;

        if (!recipientId || !text) {
            return res.status(400).json({ message: "Recipient and text are required" });
        }

        const message = await Message.create({
            sender: senderId,
            recipient: recipientId,
            text: text.trim()
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'fullName profilePic')
            .populate('recipient', 'fullName profilePic');
        
        res.status(201).json({
            success: true,
            message: populatedMessage
        });
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        });
    }
}

// Get chat history between two users
export async function getChatHistory(req, res) {
    try {
        const currentUserId = req.user._id || req.user.id;
        const { friendId } = req.params;

        if (!friendId) {
            return res.status(400).json({ message: "Friend ID is required" });
        }

        // Get all messages between these two users
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: friendId },
                { sender: friendId, recipient: currentUserId }
            ]
        })
        .populate('sender', 'fullName profilePic')
        .populate('recipient', 'fullName profilePic')
        .sort({ createdAt: 1 }); // Oldest first

        // Mark messages as read
        await Message.updateMany(
            { sender: friendId, recipient: currentUserId, read: false },
            { read: true }
        );

        res.status(200).json({
            success: true,
            messages
        });
    } catch (error) {
        console.log("Error fetching chat history:", error.message);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        });
    }
}

// Get unread message count
export async function getUnreadCount(req, res) {
    try {
        const userId = req.user._id || req.user.id;

        const unreadCount = await Message.countDocuments({
            recipient: userId,
            read: false
        });

        res.status(200).json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.log("Error fetching unread count:", error.message);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        });
    }
}