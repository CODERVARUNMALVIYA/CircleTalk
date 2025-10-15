import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

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
