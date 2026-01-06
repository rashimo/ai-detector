const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.ADMIN_PASSWORD_HASH;

module.exports = async function (context, req) {
    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    // 1. Validate JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        context.res = { status: 401, body: { error: 'Unauthorized' } };
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET);
    } catch (err) {
        context.res = { status: 401, body: { error: 'Session expired' } };
        return;
    }

    // 2. Process Data from binding (defined in function.json)
    try {
        const detections = context.bindings.inputTable || [];
        
        const sorted = detections
            .map(d => ({
                timestamp: d.Timestamp,
                source: d.source,
                agentName: d.agentName,
                ip: d.ip,
                id: d.rowKey
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        context.res = {
            status: 200,
            body: { success: true, detections: sorted }
        };
    } catch (error) {
        context.res = { status: 500, body: { error: 'Failed to fetch data' } };
    }
};
