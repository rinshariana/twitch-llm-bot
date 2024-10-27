# Conformal Twitch Bot

A moderation bot for Twitch that enforces custom policies and rules.

## Features

- Real-time message monitoring
- Custom moderation policies
- Safety API integration
- Automated actions (timeout, ban, delete messages)
- Moderator notifications
- MongoDB integration for persistence
- Caching system for improved performance

## Prerequisites

- Node.js v22.8.0 or higher
- MongoDB
- Twitch Developer Account
- A Twitch account for your bot

## Twitch Setup and Authentication

### 1. Create a Twitch Application

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console)
2. Log in with your Twitch account
3. Click "Register Your Application"
4. Fill in the required fields:
   - Name: Your bot's name (e.g., "ConformalBot")
   - OAuth Redirect URLs: `http://localhost`
   - Category: Choose "Chat Bot"
5. Click "Create"
6. Note down the generated **Client ID**

### 2. Generate OAuth Token

#### Generate Access Token with Required Scopes

1. Replace `YOUR_CLIENT_ID` in the following URL and open it in a browser:
```
https://id.twitch.tv/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=token&scope=channel:moderate+chat:edit+chat:read+whispers:read+whispers:edit+moderation:read+moderator:manage:banned_users+moderator:manage:chat_messages+moderator:manage:chat_settings+user:read:email
```

2. Authorize the application
3. You'll be redirected to: `http://localhost#access_token=YOUR_ACCESS_TOKEN&...`
4. Copy the `access_token` value
5. Use this as your `TWITCH_ACCESS_TOKEN`

### 3. Get Bot Account ID

1. Use the [Twitch API Tools](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) to convert your bot's username to a User ID
2. Or use the Twitch API endpoint:
```bash
curl -X GET 'https://api.twitch.tv/helix/users?login=YOUR_BOT_USERNAME' \
-H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
-H 'Client-Id: YOUR_CLIENT_ID'
```

### Required Scopes

The bot needs the following scopes:
- `channel:moderate`
- `chat:edit`
- `chat:read`
- `whispers:read`
- `whispers:edit`
- `moderation:read`
- `moderator:manage:banned_users`
- `moderator:manage:chat_messages`
- `moderator:manage:chat_settings`
- `user:read:email`

## Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd conformal-twitch-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a settings.js file with your configuration:
```javascript
export const settings = {
    TWITCH_USERNAME: 'your_bot_username',
    TWITCH_OAUTH_TOKEN: 'oauth:your_access_token', // For listening messages and events with tmi
    TWITCH_ACCESS_TOKEN: 'your_acces_token',     // For moderation with twitchApi
    TWITCH_CLIENT_ID: 'your_client_id',          // From Developer Console
    CHANNELS: ['channel1', 'channel2'],         //channels for moderation
    DB_URI: 'mongodb://localhost',
    DB_NAME: 'your_database_name',
    SAFETY_API: 'your_safety_api_endpoint',
    READ_ONLY_MODE: false
};
```

4. Start the bot:
```bash
npm start
```

## Token Validation

You can validate your tokens using:

```bash
# Validate OAuth token
curl -H "Authorization: OAuth YOUR_OAUTH_TOKEN" https://id.twitch.tv/oauth2/validate

# Validate Access token
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://id.twitch.tv/oauth2/validate
```

## Troubleshooting

### Common Token Issues

1. **401 Unauthorized Error**
   - Token might be expired
   - Generate a new token following the steps above
   - Make sure all required scopes are included

2. **Invalid Client ID Error**
   - Ensure the Client ID matches the one used to generate the token
   - Check if the Client ID is correctly set in settings.js

3. **Token Validation Failed**
   - Your token might be expired
   - Generate a new token
   - Make sure to include 'oauth:' prefix for OAuth token

### Token Expiration

- OAuth tokens typically expire after a certain period
- When a token expires, you'll need to generate a new one
- Consider implementing token refresh logic for long-running bots

## Configuration

The bot can be configured through the settings.js file. Important settings include:

- `TWITCH_USERNAME`: Your bot's Twitch username
- `CHANNELS`: Array of channels to monitor
- `READ_ONLY_MODE`: Set to true to prevent the bot from taking actions (useful for testing)

## Project Structure

- `bot.js`: Main bot implementation
- `twitchApi.js`: Twitch API wrapper
- `helpers.js`: Utility functions
- `log.js`: Logging implementation
- `settings.js`: Configuration settings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.