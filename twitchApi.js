// twitchApi.js
import axios from 'axios';
import { settings } from './settings.js';
import { getId } from './helpers.js';

export class TwitchAPI {
    constructor(accessToken, clientId, botId) {
        this.accessToken = accessToken;
        this.clientId = clientId;
        this.botId = botId;
    }

     // Method to send a whisper to a user
     async sendWhisper(username, message) {
        try {
            // Get the target user ID based on their username
            const userId = await getId(username);

            if (!userId) {
                console.error(`Could not find user ID for username: ${userId}`);
                return;
            }

            const response = await axios.post(
                `https://api.twitch.tv/helix/whispers?from_user_id=${this.botId}&to_user_id=${userId}`,
                { message },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Client-Id': this.clientId,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Whisper sent successfully:', response.status);
        } catch (error) {
            console.error('Error sending whisper:', error.response ? error.response.data : error.message);
        }
    }

    // Method to timeout a user
    async timeoutUser(channel, username, duration, reason = '') {
        try {

            // Get the target user ID based on their username
            const userId = await getId(username);

            if (!userId) {
                console.error(`Could not find user ID for username: ${userId}`);
                return;
            }

            // Get the target channel ID based on their channel name
            const channelId = await getId(channel);

            if (!channelId) {
                console.error(`Could not find user ID for username: ${channelId}`);
                return;
            }

            const response = await axios.post(
                `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channelId}&moderator_id=${this.botId}`,
                {
                    data: {
                        user_id: userId,
                        duration: duration,
                        reason: reason
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Client-Id': this.clientId,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`User ${userId} put in timeout for ${duration} seconds.`);
        } catch (error) {
            console.error('Error timing out user:', error.response ? error.response.data : error.message);
        }
    }

    // Method to ban a user
    async banUser(channel, username, reason = '') {
        try {

            // Get the target user ID based on their username
            const userId = await getId(username);

            if (!userId) {
                console.error(`Could not find user ID for username: ${userId}`);
                return;
            }

            // Get the target channel ID based on their channel name
            const channelId = await getId(channel);

            if (!channelId) {
                console.error(`Could not find user ID for username: ${channelId}`);
                return;
            }

            const response = await axios.post(
                `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channelId}&moderator_id=${this.botId}`,
                {
                    data: {
                        user_id: userId,
                        reason: reason
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Client-Id': this.clientId,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`User ${userId} has been banned.`);
        } catch (error) {
            console.error('Error banning user:', error.response ? error.response.data : error.message);
        }
    }

    // Method to delete a specific message
    async deleteMessage(channel, messageId) {
        try {

            // Get the target channel ID based on their channel name
            const channelId = await getId(channel);

            if (!channelId) {
                console.error(`Could not find user ID for username: ${channelId}`);
                return;
            }
            const response = await axios.delete(
                `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${channelId}&moderator_id=${this.botId}&message_id=${messageId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Client-Id': this.clientId
                    }
                }
            );
            console.log(`Message ${messageId} has been deleted.`);
        } catch (error) {
            console.error('Error deleting message:', error.response ? error.response.data : error.message);
        }
    }
}

// async function getUserId(username) {
//     try {
//         const response = await axios.get('https://api.twitch.tv/helix/users', {
//             headers: {
//                 'Authorization': `Bearer ${settings.TWITCH_ACCESS_TOKEN}`,
//                 'Client-Id': settings.CLIENT_ID
//             },
//             params: {
//                 login: username
//             }
//         });

//         if (response.data.data.length > 0) {
//             return response.data.data[0].id;
//         } else {
//             throw new Error(`User with username ${username} not found.`);
//         }
//     } catch (error) {
//         console.error('Error fetching user ID:', error.response ? error.response.data : error.message);
//         return null;
//     }
// }

// export async function getChannelId(channel) {
//     try {
//         const response = await axios.get('https://api.twitch.tv/helix/users', {
//             headers: {
//                 'Authorization': `Bearer ${settings.TWITCH_ACCESS_TOKEN}`,
//                 'Client-Id': settings.CLIENT_ID
//             },
//             params: {
//                 login: channel
//             }
//         });

//         if (response.data.data.length > 0) {
//             return response.data.data[0].id;
//         } else {
//             console.error(`Channel with name ${channel} not found.`);
//             return null;
//         }
//     } catch (error) {
//         console.error('Error fetching channel ID:', error.response ? error.response.data : error.message);
//         return null;
//     }
// }