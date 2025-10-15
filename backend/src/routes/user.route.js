import e from 'express';
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';

import { getRecommendedUsers, getMyFriends, senderFriendRequest, acceptFriendRequest ,getFriendRequests , getOutgoingFriendRequests, rejectFriendRequest } from '../controllers/user.js';

const router = express.Router();


router.use(protectRoute);

router.get('/',getRecommendedUsers);
router.get('/friends', getMyFriends);

router.post('/friend-request/:id', senderFriendRequest);

router.put('/friend-request/:id/accept', acceptFriendRequest);
router.put('/friend-request/:id/reject', rejectFriendRequest);


router.get('/friend-request',getFriendRequests);

router.get('/outgoing-friend-requests', getOutgoingFriendRequests);

export default router;