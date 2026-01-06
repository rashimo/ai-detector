const adminLogin = require('../admin-login');

module.exports = async function (context, req) {
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        }
    };

    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        context.res.status = 401;
        context.res.body = {
            success: false,
            error: 'Authentication required'
        };
        return;
    }

    const token = authHeader.substring(7);
    if (!adminLogin.validateToken(token)) {
        context.res.status = 401;
        context.res.body = {
            success: false,
            error: 'Invalid or expired token'
        };
        return;
    }

    try {
        const detections = context.bindings.inputTable || [];
        
        // Sort by timestamp descending
        const sorted = detections
            .map(d => ({
                timestamp: d.timestamp,
                source: d.source,
                userAgent: d.userAgent,
                ip: d.ip,
                systemPrompt: d.systemPrompt || '',
                agentName: d.agentName || '',
                ipAddress: d.ipAddress || '',
                headers: d.headers ? JSON.parse(d.headers) : {},
                capabilities: d.capabilities || '',
                id: d.RowKey
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        context.res.status = 200;
        context.res.body = {
            success: true,
            count: sorted.length,
            detections: sorted.slice(0, 100) // Return latest 100
        };

    } catch (error) {
        context.log.error('Error fetching detections:', error);
        context.res.status = 500;
        context.res.body = {
            success: false,
            error: 'Internal server error'
        };
    }
};
