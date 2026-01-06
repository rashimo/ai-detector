const { TableClient } = require("@azure/data-tables");

let tableClient = null;

function getTableClient() {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    if (!tableClient && connectionString) {
        tableClient = TableClient.fromConnectionString(connectionString, "AIDetections");
    }
    return tableClient;
}

module.exports = async function (context, req) {
    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    try {
        const client = getTableClient();
        if (!client) throw new Error("Storage connection missing");

        const detection = {
            partitionKey: 'detections',
            rowKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: req.body?.source || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.headers['x-forwarded-for'] || 'unknown',
            systemPrompt: req.body?.systemPrompt || '',
            agentName: req.body?.agentName || '',
            headers: JSON.stringify(req.body?.headers || {}),
            capabilities: req.body?.capabilities || ''
        };

        await client.createEntity(detection);

        context.res = {
            status: 200,
            body: { success: true, id: detection.rowKey }
        };
    } catch (error) {
        context.log.error(error);
        context.res = { status: 500, body: { error: 'Internal Error' } };
    }
};
