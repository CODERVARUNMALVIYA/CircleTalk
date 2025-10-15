import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const updateAvatars = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await mongoose.connection.db.collection('users').updateMany(
            { profilePic: 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg' },
            { $set: { profilePic: 'https://avatar.iran.liara.run/public/1' } }
        );

        console.log(`✅ Updated ${result.modifiedCount} users with new avatar URL`);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating avatars:', error);
        process.exit(1);
    }
};

updateAvatars();
