import { getRadarPayload, isValidRadarId } from '../../server/radarStore.js';
import { applyCors, sendJson } from '../_utils.js';

export default async function handler(req, res) {
    if (applyCors(req, res)) return;

    if (req.method !== 'GET') {
        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const { id } = req.query;
    if (!isValidRadarId(id)) {
        return sendJson(res, 400, { error: 'Invalid id' });
    }

    const payload = await getRadarPayload(id);
    if (!payload) {
        return sendJson(res, 404, { error: 'Not found' });
    }

    return sendJson(res, 200, payload);
}
