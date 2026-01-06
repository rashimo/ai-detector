const jwt = require('jsonwebtoken');

module.exports = async function (context, req) {
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        context.res = { status: 401, body: { error: 'Unauthorized' } };
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, adminPasswordHash);
    } catch (err) {
        context.res = { status: 401, body: { error: 'Session expired' } };
        return;
    }

    try {
        const detections = context.bindings.inputTable || [];
        
        const sorted = detections
            .map(d => ({
                timestamp: d.Timestamp, // Capitalized in Azure Tables
                source: d.source,
                agentName: d.agentName,
                ip: d.ip,
                id: d.RowKey // Capitalized in Azure Tables
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        context.res = {
            status: 200,
            body: { success: true, detections: sorted, count: sorted.length }
        };
    } catch (error) {
        context.log.error('Fetch error:', error);
        context.res = { status: 500, body: { error: 'Failed to fetch data' } };
    }
};
