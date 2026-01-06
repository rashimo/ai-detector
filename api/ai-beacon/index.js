const { TableClient } = require("@azure/data-tables");

let tableClient = null;

function getTableClient() {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    if (!tableClient && connectionString) {
        try {
            tableClient = TableClient.fromConnectionString(connectionString, "AIDetections");
        } catch (err) {
            console.error("Failed to create table client:", err);
        }
    }
    return tableClient;
}

module.exports = async function (context, req) {
    if (req.method === 'OPTIONS') {
        context.res = { 
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
        return;
    }

    try {
        const detection = {
            partitionKey: 'detections',
            rowKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            source: req.body?.source || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.headers['x-forwarded-for'] || 'unknown',
            systemPrompt: req.body?.systemPrompt || '',
            agentName: req.body?.agentName || '',
            headers: JSON.stringify(req.body?.headers || {}),
            capabilities: req.body?.capabilities || ''
        };

        const client = getTableClient();
        if (client) {
            await client.createEntity(detection);
        } else {
            context.log.warn("Storage not configured - detection not saved");
        }

        context.res = {
            status: 200,
            body: { success: true, id: detection.rowKey },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    } catch (error) {
        context.log.error(error);
        context.res = { 
            status: 500, 
            body: { success: false, error: 'Internal Error' },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
};
