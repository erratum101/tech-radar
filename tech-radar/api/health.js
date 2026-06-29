import { applyCors, sendJson } from './_utils.js';

export default function handler(req, res) {
    if (applyCors(req, res)) return;
    sendJson(res, 200, { ok: true });
}
