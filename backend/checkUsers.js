import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkUsers = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error('Missing MONGO_URI / MONGODB_URI');
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB\n');
        console.log(`Using DB: ${mongoose.connection?.name || 'unknown'}\n`);

        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        
        console.log(`📊 Total users in database: ${users.length}\n`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.fullName}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   isOnboarded: ${user.isOnboarded}`);
            console.log(`   Friends: ${user.friends?.length || 0}`);
            console.log('');
        });

        const onboardedUsers = users.filter(u => u.isOnboarded === true);
        console.log(`✅ Onboarded users: ${onboardedUsers.length}`);
        console.log(`❌ Not onboarded users: ${users.length - onboardedUsers.length}`);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkUsers();
