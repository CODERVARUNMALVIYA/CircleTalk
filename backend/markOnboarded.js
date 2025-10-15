import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const markAllOnboarded = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        const result = await mongoose.connection.db.collection('users').updateMany(
            { isOnboarded: false },
            { $set: { isOnboarded: true } }
        );

        console.log(`✅ Updated ${result.modifiedCount} users to onboarded status`);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

markAllOnboarded();
