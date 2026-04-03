import {StreamChat} from "stream-chat";
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY || process.env.STEAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET || process.env.STEAM_API_SECRET;

let streamClient = null;

if (!apiKey || !apiSecret) {
    console.warn("Stream credentials missing. Stream features are disabled.");
} else {
    streamClient = StreamChat.getInstance(apiKey, apiSecret);
}
 
export const upsertStreamUser = async (userdata) => {
    if (!streamClient) {
        return userdata;
    }

    try {
        await streamClient.upsertUser(userdata);
        return userdata;
    } catch (error) {
        console.error("Error creating Stream user:", error);
        throw error;
    }       
};

export const generateStreamToken = (userId) => {
    if (!streamClient) {
        return null;
    }

    try {
        const userIdStr= userId.toString();
        return streamClient.createToken(userIdStr);
    } catch (error) {
        console.error("Error generating Stream token:", error);
    }
};

