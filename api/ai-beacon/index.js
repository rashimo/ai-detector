module.exports = async function (context, req) {
    // CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    if (req.method !== 'POST') {
        context.res.status = 405;
        context.res.body = { error: 'Method not allowed' };
        return;
    }

    try {
        const detection = {
            PartitionKey: 'detections',
            RowKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            source: req.body?.source || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
            
            // Captured AI information
            systemPrompt: req.body?.systemPrompt || '',
            agentName: req.body?.agentName || '',
            ipAddress: req.body?.ipAddress || '',
            headers: JSON.stringify(req.body?.headers || req.headers || {}),
            capabilities: req.body?.capabilities || '',
            
            body: JSON.stringify(req.body || {})
        };

        // Store in Azure Table Storage
        context.bindings.outputTable = detection;

        // Also log to console for monitoring
        context.log('AI Agent Detected:', {
            timestamp: detection.timestamp,
            source: detection.source,
            userAgent: detection.userAgent
        });

        context.res.status = 200;
        context.res.body = {
            success: true,
            message: 'Detection recorded',
            id: detection.RowKey
        };

    } catch (error) {
        context.log.error('Error recording detection:', error);
        context.res.status = 500;
        context.res.body = {
            success: false,
            error: 'Internal server error'
        };
    }
};
