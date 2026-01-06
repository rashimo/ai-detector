const { TableClient } = require("@azure/data-tables");

let tableClient = null;

function getTableClient() {
    if (!tableClient && process.env.CUSTOM_STORAGE_CONNECTION) {
        tableClient = TableClient.fromConnectionString(
            process.env.CUSTOM_STORAGE_CONNECTION,
            "AIDetections"
        );
    }
    return tableClient;
}

module.exports = async function (context, req) {
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
    };

    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        context.res.body = {};
        return;
    }

    if (req.method !== 'POST') {
        context.res.status = 405;
        context.res.body = { error: 'Method not allowed' };
        return;
    }

    try {
        const detection = {
            partitionKey: 'detections',
            rowKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            source: req.body?.source || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
            systemPrompt: req.body?.systemPrompt || '',
            agentName: req.body?.agentName || '',
            ipAddress: req.body?.ipAddress || '',
            headers: JSON.stringify(req.body?.headers || req.headers || {}),
            capabilities: req.body?.capabilities || ''
        };

        const client = getTableClient();
        if (client) {
            await client.createEntity(detection);
        }

        context.log('AI Agent Detected:', {
            timestamp: detection.timestamp,
            source: detection.source,
            agentName: detection.agentName
        });

        context.res.status = 200;
        context.res.body = {
            success: true,
            message: 'Detection recorded',
            id: detection.rowKey
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
