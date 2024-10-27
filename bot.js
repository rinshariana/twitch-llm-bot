import tmi from 'tmi.js';
import { TwitchAPI } from './twitchApi.js';
import axios from 'axios';
import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import { Engine } from 'json-rules-engine';
import { settings } from './settings.js';
import TwitchLog from './log.js';
import { getId } from './helpers.js';

const ruleCache = new NodeCache({ stdTTL: 60 });
const { DB_URI, DB_NAME, SAFETY_API, READ_ONLY_MODE } = settings;

const policySchema = new mongoose.Schema({
    policyName: String,
    rules: Array,
    policyId: String,
    tenantId: String,
    updatedAt: Number,
    createdAt: Number
});

const chatTenantSchema = new mongoose.Schema({
    channelName: String,
    tenantId: String,
    moderators: [{
        username: String
    }]
});

const Policy = mongoose.models.Policy || mongoose.model('Policy', policySchema, 'policies');
export const ChatTenant = mongoose.models.ChatTenant || mongoose.model('ChatTenant', chatTenantSchema, 'tenantId_channel');

class TwitchBot {
    constructor() {
        this.twitchApi = null;
        this.client = new tmi.Client({
            options: { debug: true },
            connection: {
                reconnect: true,
                secure: true
            },
            identity: {
                username: settings.TWITCH_USERNAME,
                password: settings.TWITCH_OAUTH_TOKEN
            },
            channels: settings.CHANNELS
        });
    }

    async checkDatabaseConnection() {
        try {
            await mongoose.connection.db.admin().ping();
            console.log("Successfully connected to the database");
        } catch (error) {
            console.error("Error connecting to the database:", error);
            throw error;
        }
    }

    async connectToDatabase() {
        try {
            await mongoose.connect(`${DB_URI}/${DB_NAME}`);
            await this.checkDatabaseConnection();
        } catch (err) {
            console.error('MongoDB connection error:', err);
            throw err;
        }
    }

    async initialize() {
        try {
            // First connect to database
            await this.connectToDatabase();

            const botId = await getId(settings.TWITCH_USERNAME);
            if (!botId) {
                console.error(`Failed to retrieve bot ID for username: ${settings.TWITCH_USERNAME}`);
                process.exit(1);
            }

            this.twitchApi = new TwitchAPI(settings.TWITCH_ACCESS_TOKEN, settings.TWITCH_CLIENT_ID, botId);

            // Listen for chat messages
            this.client.on('message', async (channel, userstate, message, self) => {
                if (self) return; // Ignore messages from the bot itself

                try {
                    await this.processMessage(channel, userstate, message);
                } catch (error) {
                    console.error('Error in message handler:', error);
                }
            });

            // Connect to Twitch chat
            await this.client.connect();
            console.log('Bot setup complete. Waiting for messages...');

        } catch (error) {
            console.error('Error during bot initialization:', error);
            process.exit(1);
        }
    }

    async notifyModerators(channel, userstate, message, safetyCategory, rulesApplied, action) {
        const notificationText = `User @${userstate.username} in channel ${channel} triggered an action.\n` +
            `Safety category: ${safetyCategory}\n` +
            `Rules applied: ${rulesApplied.join(', ')}\n` +
            `Action taken: ${action}\n` +
            `Message: ${message}`;
        const modList = await getModeratorsList(channel);
        for (const moderatorUsername of modList) {
            try {
                await this.twitchApi.sendWhisper(moderatorUsername, notificationText);
            } catch (err) {
                console.error(`Failed to send notification to ${moderatorUsername}:`, err);
            }
        }
    }

    async handleAction(channel, userstate, message, action, { safetyCategory, rulesApplied }) {
        if (READ_ONLY_MODE) {
            await this.notifyModerators(channel, userstate, message, safetyCategory, rulesApplied, action);
            console.warn(`Read-Only Mode: Would have performed action "${action}" on user "${userstate.username}"`);
            return;
        }

        switch (action.toLowerCase()) {
            case 'mute':
                await this.twitchApi.timeoutUser(channel, userstate.username, 600, 'Muted by bot').catch(console.error);
                break;
            case 'kick':
                await this.twitchApi.timeoutUser(channel, userstate.username, 60, 'Kicked by bot').catch(console.error);
                break;
            case 'ban':
                await this.twitchApi.banUser(channel, userstate.username, 'Banned by bot').catch(console.error);
                break;
            case 'notify':
                await this.notifyModerators(channel, userstate, message, safetyCategory, rulesApplied, action);
                break;
            case 'delete':
                if (userstate.id) {
                    await this.twitchApi.deleteMessage(channel, userstate.id).catch(console.error);
                } else {
                    console.warn('Cannot delete message: message ID not available');
                }
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    async processMessage(channel, userstate, message) {
        try {
            const initialProcessingTime = new Date().toISOString();
            const safetyResponse = await axios.post(SAFETY_API, {
                message: message,
                explanation_enabled: false
            }, {
                headers: {
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 IAmNotSus'
                }
            });

            const topics = [];
            const safetyCategory = safetyResponse.data.category_a;
            const safetyScoringTime = safetyResponse.data['latency'];
            const reviewProcessingTime = new Date().toISOString();
            const tenantId = await getTenantIdFromCacheOrDB(channel);
            const policies = await getPoliciesFromCacheOrDB(tenantId);

            if (policies.length === 0) {
                return await createAndSaveLogEntry({
                    event: { channel, userstate, message },
                    status: 'processed_no_policies',
                    initialProcessingTime,
                    reviewProcessingTime,
                    finalDecisionTime: new Date().toISOString(),
                    safetyScoringTime,
                    topics,
                    safetyCategory,
                    rulesApplied: [],
                    finalActions: []
                });
            }

            const allRules = policies.flatMap(policy => policy.rules);
            const allRulesReal = allRules.map(r => r.name);

            const engine = new Engine(allRules);
            const facts = {
                message: message,
                topic: topics,
                category: safetyCategory,
                author: userstate.username,
                channel: {
                    name: channel
                }
            };

            const results = await engine.run(facts);
            const actions = results.events.map(event => event.type);

            for (const action of actions) {
                await this.handleAction(channel, userstate, message, action, {
                    safetyCategory,
                    rulesApplied: results.events.map(event => event.name)
                });
            }

            return await createAndSaveLogEntry({
                event: { channel, userstate, message },
                status: 'processed',
                initialProcessingTime,
                reviewProcessingTime,
                finalDecisionTime: new Date().toISOString(),
                safetyScoringTime,
                topics,
                safetyCategory,
                rulesApplied: results.events.map(event => event.name),
                finalActions: actions,
                rulesAssessed: allRulesReal,
                policiesAssessed: policies.map(policy => policy.policyId),
            });
        } catch (error) {
            console.error('Error processing message:', error);
            return null;
        }
    }
}

// Create and initialize the bot
const bot = new TwitchBot();
bot.initialize().catch(console.error);

// Helper functions
async function createAndSaveLogEntry(logEntryData) {
    const logEntry = await createLogEntry(logEntryData);
    try {
        const savedLog = await saveLogEntry(logEntry);
        console.log(`Log entry saved successfully. ID: ${savedLog.id}`);
        return savedLog;
    } catch (saveError) {
        console.error('Error saving log entry:', saveError.message);
        throw saveError;
    }
}

async function createLogEntry({
    event,
    status,
    initialProcessingTime = null,
    reviewProcessingTime = null,
    finalDecisionTime = null,
    safetyScoringTime = null,
    topics = [],
    safetyCategory = '',
    rulesApplied = [],
    finalActions = [],
    rulesAssessed = [],
    policiesAssessed = []
}) {
    const tenantId = await getTenantIdFromCacheOrDB(event.channel);
    console.log('Retrieved Tenant ID:', tenantId);
    return {
        id: new Date().getTime(),
        tenantId,
        platform: 'Twitch',
        status,
        timestamp: new Date().toISOString(),
        author: {
            display_name: event.userstate['display-name'],
            id: event.userstate['user-id'],
        },
        text: event.message,
        metadata: {
            channel: {
                name: event.channel
            },
            processing_times: {
                initial_processing: initialProcessingTime,
                review_processing: reviewProcessingTime,
                final_decision: finalDecisionTime,
                safety_scoring: safetyScoringTime
            },
            topics,
            safety_category: safetyCategory,
            rules_applied: rulesApplied,
            final_actions: finalActions,
            rules_assessed: rulesAssessed,
            policies_assessed: policiesAssessed
        }
    };
}

async function getPoliciesFromCacheOrDB(tenantId) {
    let policies = ruleCache.get(`policies_${tenantId}`);
    if (!policies) {
        policies = await Policy.find({ tenantId }).lean();
        ruleCache.set(`policies_${tenantId}`, policies);
    }
    return policies;
}

async function getTenantIdFromCacheOrDB(channel) {
    const tenantChannels = await getTenantChannelsFromCacheOrDB(channel);
    return tenantChannels.length ? tenantChannels[0].tenantId : null;
}

async function getModeratorsList(channel) {
    const tenantChannels = await getTenantChannelsFromCacheOrDB(channel);
    if (!tenantChannels.length) return [];
    const moderators = (tenantChannels[0].moderators || [])
        .filter(mod => mod.username)
        .map(mod => mod.username);
    return moderators;
}

async function getTenantChannelsFromCacheOrDB(channel) {
    let tenantChannels = ruleCache.get(`tenantChannels_${channel}`);
    if (!tenantChannels) {
        tenantChannels = await ChatTenant.find({ channelName: channel }).lean();
        ruleCache.set(`tenantChannels_${channel}`, tenantChannels);
    }
    return tenantChannels;
}

async function saveLogEntry(logEntry) {
    try {
        const log = new TwitchLog(logEntry);
        return await log.save();
    } catch (error) {
        console.error('Error saving log entry:', error.message);
        throw error;
    }
}