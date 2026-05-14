const Valkey = require('iovalkey');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let client = null;
let isConnected = false;

const VALKEY_URL = process.env.VALKEY_URL || 'redis://127.0.0.1:6379';

async function initValkey() {
    try {
        client = new Valkey({
            connectionString: VALKEY_URL,
            maxRetriesPerRequest: 3,
            connectTimeout: 5000,
            commandTimeout: 3000
        });

        client.on('error', (err) => {
            console.warn('[Valkey] Connection error:', err.message);
            isConnected = false;
        });

        client.on('connect', () => {
            console.log('[Valkey] Connected to', VALKEY_URL);
            isConnected = true;
        });

        client.on('ready', () => {
            isConnected = true;
        });

        client.on('close', () => {
            isConnected = false;
        });

        await client.connect();
    } catch (err) {
        console.warn('[Valkey] Failed to connect:', err.message);
        isConnected = false;
    }
}

function isValkeyConnected() {
    return isConnected && client !== null;
}

async function getCache(key) {
    if (!isValkeyConnected()) {
        return null;
    }
    try {
        const value = await client.get(key);
        if (value === null) {
            return null;
        }
        return JSON.parse(value);
    } catch (err) {
        console.warn('[Valkey] getCache error for key', key, ':', err.message);
        return null;
    }
}

async function setCache(key, value, ttlSeconds) {
    if (!isValkeyConnected()) {
        return false;
    }
    try {
        const serialized = JSON.stringify(value);
        await client.set(key, serialized, {
            EX: ttlSeconds
        });
        return true;
    } catch (err) {
        console.warn('[Valkey] setCache error for key', key, ':', err.message);
        return false;
    }
}

async function deleteCache(key) {
    if (!isValkeyConnected()) {
        return false;
    }
    try {
        await client.del(key);
        return true;
    } catch (err) {
        console.warn('[Valkey] deleteCache error for key', key, ':', err.message);
        return false;
    }
}

async function deleteCachePattern(pattern) {
    if (!isValkeyConnected()) {
        return 0;
    }
    try {
        let cursor = '0';
        let deletedCount = 0;
        const batchSize = 100;

        do {
            const [newCursor, keys] = await client.scan(cursor, {
                MATCH: pattern,
                COUNT: batchSize
            });
            cursor = newCursor;

            if (keys && keys.length > 0) {
                await client.del(...keys);
                deletedCount += keys.length;
            }
        } while (cursor !== '0');

        return deletedCount;
    } catch (err) {
        console.warn('[Valkey] deleteCachePattern error for pattern', pattern, ':', err.message);
        return 0;
    }
}

async function flushTag(tag) {
    return deleteCachePattern(`sf:${tag}:*`);
}

async function getKeyCount() {
    if (!isValkeyConnected()) {
        return 0;
    }
    try {
        const count = await client.dbSize();
        return count;
    } catch (err) {
        console.warn('[Valkey] getKeyCount error:', err.message);
        return 0;
    }
}

async function getMemoryInfo() {
    if (!isValkeyConnected()) {
        return 'unknown';
    }
    try {
        const info = await client.info('memory');
        const memUsed = info.match(/used_memory_human:(\S+)/);
        return memUsed ? memUsed[1] : 'unknown';
    } catch (err) {
        console.warn('[Valkey] getMemoryInfo error:', err.message);
        return 'unknown';
    }
}

initValkey();

module.exports = {
    isValkeyConnected,
    getCache,
    setCache,
    deleteCache,
    deleteCachePattern,
    flushTag,
    getKeyCount,
    getMemoryInfo
};