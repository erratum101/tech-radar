import express from 'express';
import cors from 'cors';
import { createRadar, getRadarPayload, isValidPayload, isValidRadarId } from './radarStore.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

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

app.post('/api/radars', async (req, res) => {
    const payload = req.body?.payload;
    if (!isValidPayload(payload)) {
        return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
        const id = await createRadar(payload);
        res.status(201).json({ id });
    } catch (error) {
        console.error('POST /api/radars:', error);
        res.status(503).json({ error: error?.message || 'Storage unavailable' });
    }
});

app.get('/api/radars/:id', async (req, res) => {
    const { id } = req.params;
    if (!isValidRadarId(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    const payload = await getRadarPayload(id);
    if (!payload) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json(payload);
});

app.listen(PORT, HOST, () => {
    console.log(`Share API listening on http://${HOST}:${PORT}`);
});
