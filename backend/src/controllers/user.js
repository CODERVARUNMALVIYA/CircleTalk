import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';

export async function getRecommendedUsers(req, res) {
    try {
        const currentUserId = req.user.id;

        const currentUser = req.user

        const recommendedUsers = await User.find({
            $and: [
       { _id: { $ne: currentUserId }},
        {_id: { $nin: currentUser.friends }},
        {isOboarded: true}
            ]
        }).select('-password').limit(10);
        res.satatus(200).json({
            status: 'success',
            data: recommendedUsers
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        })
        
    }
}

export async function getMyFriends(req, res) {
    try {
        const user = await User.findById(req.user.id)
        .select('friends')
        .populate('friends', 'fullName profilePic nativeLanguage lerningLanguage location');

        res.status(200).json(
            user.friends
        )
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        })
        
    }
}

export async function senderFriendRequest(req,res){
    try {
        const myId = req.user.id;
        const{id:recipientId} = req.params

        if(myId === recipientId){ return res.status(400).json({message:"you cannot send friend request to yourself"})}

        const recipient = await User
        .findById(recipientId)
        if(!recipient){
            return res.status(404).json({message:"recipient not found"})
        }
        if(recipient.friends.includes(myId)){
            return res.status(400).json({message:"recipient is already your friend"})
        }

        const existingRequest = await FriendRequest.findOne({
            $or:[
                {sender:myId, recipient:recipientId},       
                {sender:recipientId, recipient:myId}
            ],
        })
        if(existingRequest){
            return res.status(400).json({message:"friend request already exists"})
        }

        const friendRequest = await FriendRequest.create({
            sender:myId,
            recipient:recipientId,
            
        });
        res.status(200).json({message:"friend request sent", friendRequest})
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        })
    }
}


export async function acceptFriendRequest(req, res) {
    try {
     const {id: requestId} = req.params

     const friendRequest = await FriendRequest.findById(requestId)
        if(!friendRequest){
            return res.status(404).json({message:"friend request not found"})
        }

        if(friendRequest.recipient.toString() !== req.user.id){
            return res.status(403).json({message:"you are not authorized to accept this friend request"})
        }   
        friendRequest.status = 'accepted'
        await friendRequest.save()

        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: {friends: friendRequest.recipient}
        })
        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet: {friends: friendRequest.sender}
        })
        res.status(200).json({message:"friend request accepted"})
       
    } catch (error) {
        console.log("Error accepting friend request:", error.message);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        })

        
    }
}

export async function getFriendRequests(req, res) {
    try {
        const incomingRequests = await FriendRequest.find({
            recipient: req.user.id,
            status: 'pending'
        }).populate('sender', 'fullName profilePic nativeLanguage lerningLanguage location');

        const acceptedRequests = await FriendRequest.find({
           sender: req.user.id,
           status: 'accepted'
        }).populate('recipient', 'fullName profilePic nativeLanguage lerningLanguage location');
        res.status(200).json({
            incomingRequests,
            acceptedRequests
        });
    } catch (error) {
        console.log("Error fetching friend requests:", error.message);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        });
        
    }
}

export async function getOutgoingFriendRequests(req, res) {
    try {
        const outgoingRequests = await FriendRequest.find({
            sender: req.user.id,
            status: 'pending'
        }).populate('recipient', 'fullName profilePic nativeLanguage lerningLanguage location');                                                                    
        res.status(200).json(outgoingRequests);
    } catch (error) {
        console.log("Error fetching outgoing friend requests:", error.message);
        res.status(500).json({
            status: 'fail',
            message: 'server error'
        }); 
    }
}