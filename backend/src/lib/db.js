import mongoose from 'mongoose';
export const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error('MongoDB URI missing. Set MONGO_URI or MONGODB_URI in backend/.env');
    }

    const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB connected : ${conn.connection.host}`);
};    