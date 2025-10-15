import mongoose from 'mongoose';
import User from './src/models/User.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI;

async function testFriendsAPI() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get a user with friends (mohit has 4 friends)
        const testUser = await User.findOne({ email: 'mohit2@gmail.com' })
            .select('friends')
            .populate('friends', 'fullName profilePic nativeLanguage location email');

        console.log('👤 Testing with user:', 'mohit2@gmail.com');
        console.log('📊 Friends count:', testUser.friends.length);
        console.log('\n🔍 Friends data:');
        
        if (testUser.friends.length > 0) {
            testUser.friends.forEach((friend, index) => {
                console.log(`\n${index + 1}. ${friend.fullName}`);
                console.log(`   Email: ${friend.email}`);
                console.log(`   Location: ${friend.location || 'Not set'}`);
                console.log(`   Language: ${friend.nativeLanguage || 'Not set'}`);
                console.log(`   ID: ${friend._id}`);
            });
        } else {
            console.log('❌ No friends found!');
        }

        await mongoose.connection.close();
        console.log('\n✅ Test complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testFriendsAPI();
