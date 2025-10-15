import  express from  'express'  ;
import { protectRoute } from '../middleware/auth.middleware.js';

import { getStreamToken, sendMessage, getChatHistory, getUnreadCount } from '../controllers/chat.js';

const router = express.Router();

router.use(protectRoute);

router.get('/token', getStreamToken);
router.post('/send', sendMessage);
router.get('/history/:friendId', getChatHistory);
router.get('/unread-count', getUnreadCount);

export default router;