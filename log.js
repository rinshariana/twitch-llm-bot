import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
    id: Number,
    platform: String,
    tenantId: String,
    author: {
        display_name: String,
        id: String,
    },
    text: String,
    oldText: String,
    status: String,
    timestamp: String,
    metadata: {
        type: Object,
        default: {},
        channel: {
            name: String
        }
    },
}, { strict: false });

const TwitchLog = mongoose.model('TwitchLog', logSchema, 'logs');

export default TwitchLog;
