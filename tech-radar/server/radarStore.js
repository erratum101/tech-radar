import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'radars.json');

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidPayload(body) {
    if (!body || typeof body !== 'object') return false;
    if (body.v !== 5) return false;
    if (!body.s || typeof body.s !== 'object') return false;
    if (!Array.isArray(body.p) || !Array.isArray(body.t)) return false;
    return true;
}

export function isValidRadarId(id) {
    return typeof id === 'string' && ID_PATTERN.test(id);
}

async function getKv() {
    const hasRedis =
        process.env.KV_REST_API_URL ||
        process.env.UPSTASH_REDIS_REST_URL;
    if (!hasRedis) return null;
    try {
        const { kv } = await import('@vercel/kv');
        return kv;
    } catch {
        return null;
    }
}

function loadFileStore() {
    if (!existsSync(DATA_FILE)) return {};
    try {
        return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveFileStore(store) {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(store), 'utf8');
    renameSync(tmp, DATA_FILE);
}

function canUseFileStore() {
    return process.env.VERCEL !== '1';
}

export async function createRadar(payload) {
    const id = nanoid(12);
    const row = { payload, createdAt: new Date().toISOString() };

    const kv = await getKv();
    if (kv) {
        await kv.set(`radar:${id}`, row);
        return id;
    }

    if (!canUseFileStore()) {
        throw new Error('Share storage is not configured. Add Vercel KV (see README).');
    }

    const store = loadFileStore();
    store[id] = row;
    saveFileStore(store);
    return id;
}

export async function getRadarPayload(id) {
    if (!isValidRadarId(id)) return null;

    const kv = await getKv();
    if (kv) {
        const row = await kv.get(`radar:${id}`);
        return row?.payload ?? null;
    }

    if (!canUseFileStore()) return null;

    const store = loadFileStore();
    return store[id]?.payload ?? null;
}
