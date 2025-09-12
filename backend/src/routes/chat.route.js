import  express from  'express'  ;
import { protectRoute } from '../middleware/auth.middleware.js';

import { getStreamToken } from '../controllers/chat.js';

const router = express.Router();

router.get('/token',protectRoute, getStreamToken);

export default router;