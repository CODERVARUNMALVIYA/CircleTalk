import {StreamChat} from "stream-chat";
import "dotenv/config";

const apiKey = process.env.STEAM_API_KEY;
const apiSecret = process.env.STEAM_API_SECRET;

if(!apiKey || !apiSecret) {
    throw new Error("Stream API key and secret are required");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);
 
export const upsertStreamUser = async (userdata) => {
    try {
        await streamClient.upsertUser(userdata);
        return userdata;
    } catch (error) {
        console.error("Error creating Stream user:", error);
        throw error;
    }       
};

export const generateStreamToken = (userId) => {
    try {
        const userIdStr= userId.toString();
        return streamClient.createToken(userIdStr);
    } catch (error) {
        console.error("Error generating Stream token:", error);
    }
};

