import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'radars.json');

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

function loadStore() {
    if (!existsSync(DATA_FILE)) return {};
    try {
        return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveStore(store) {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(store), 'utf8');
    renameSync(tmp, DATA_FILE);
}

function isValidPayload(body) {
    if (!body || typeof body !== 'object') return false;
    if (body.v !== 5) return false;
    if (!body.s || typeof body.s !== 'object') return false;
    if (!Array.isArray(body.p) || !Array.isArray(body.t)) return false;
    return true;
}

const app = express();
app.use(
    cors({
        origin: true,
        credentials: true,
    }),
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/radars', (req, res) => {
    const payload = req.body?.payload;
    if (!isValidPayload(payload)) {
        return res.status(400).json({ error: 'Invalid payload' });
    }
    const id = nanoid(12);
    const store = loadStore();
    store[id] = {
        payload,
        createdAt: new Date().toISOString(),
    };
    saveStore(store);
    res.status(201).json({ id });
});

app.get('/api/radars/:id', (req, res) => {
    const { id } = req.params;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    const store = loadStore();
    const row = store[id];
    if (!row?.payload) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json(row.payload);
});

app.listen(PORT, HOST, () => {
    console.log(`Share API listening on http://${HOST}:${PORT}`);
});
