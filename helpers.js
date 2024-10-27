import axios from 'axios';
import { settings } from './settings.js';

export async function getId(name) {
    try {
        const response = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${settings.TWITCH_ACCESS_TOKEN}`,
                'Client-Id': settings.TWITCH_CLIENT_ID
            },
            params: {
                login: name
            }
        });

        if (response.data.data.length > 0) {
            return response.data.data[0].id;
        } else {
            console.error(`User or channel with name ${name} not found.`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching channel ID:', error.response ? error.response.data : error.message);
        return null;
    }
}