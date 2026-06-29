export function applyCors(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }
    return false;
}

export function sendJson(res, status, body) {
    res.status(status).json(body);
}

export function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    return {};
}
