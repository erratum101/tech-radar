import { createRadar, isValidPayload } from '../../server/radarStore.js';
import { applyCors, readJsonBody, sendJson } from '../_utils.js';

export default async function handler(req, res) {
    if (applyCors(req, res)) return;

    if (req.method !== 'POST') {
        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const payload = readJsonBody(req).payload;
    if (!isValidPayload(payload)) {
        return sendJson(res, 400, { error: 'Invalid payload' });
    }

    try {
        const id = await createRadar(payload);
        return sendJson(res, 201, { id });
    } catch (error) {
        console.error('POST /api/radars:', error);
        return sendJson(res, 503, { error: error?.message || 'Storage unavailable' });
    }
}
