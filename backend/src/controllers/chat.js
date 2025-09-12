import { generateStreamToken } from '../lib/stream.js';

export async function getStreamToken(req, res) {
    try {
        const token = generateStreamToken(req.user.id);
        res.status(200).json({ token });
    } catch (error) {
        console.log("Error generating stream token:", error.message);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        });
    }
}