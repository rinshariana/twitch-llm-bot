import dotenv from 'dotenv';

dotenv.config();

export const settings = {
    TWITCH_USERNAME: process.env.TWITCH_USERNAME,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_OAUTH_TOKEN: process.env.TWITCH_OAUTH_TOKEN,
    TWITCH_ACCESS_TOKEN: process.env.TWITCH_ACCESS_TOKEN,
    CHANNELS: process.env.CHANNELS ? process.env.CHANNELS.split(',') : [],
    DB_URI: process.env.DB_URI,
    DB_NAME: process.env.DB_NAME,
    SAFETY_API: process.env.SAFETY_API,
    READ_ONLY_MODE: process.env.READ_ONLY_MODE === 'true'
};