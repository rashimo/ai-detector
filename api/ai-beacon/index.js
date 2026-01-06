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
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    try {
        const client = getTableClient();
        if (!client) {
            context.log.error("Storage connection string missing in environment variables.");
            context.res = { status: 500, body: "Configuration Error" };
            return;
        }

        const detection = {
            partitionKey: 'detections',
            rowKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: req.body?.source || 'agent_trap',
            userAgent: req.headers['user-agent'] || 'unknown',
            // Capture IP from Azure headers
            ip: req.headers['x-forwarded-for'] || 'unknown',
            systemPrompt: req.body?.systemPrompt || '',
            agentName: req.body?.agentName || '',
            // Stringify headers and capabilities to store in Table
            headers: JSON.stringify(req.headers || {}),
            capabilities: req.body?.capabilities || ''
        };

        await client.createEntity(detection);

        context.res = {
            status: 200,
            body: { success: true, message: "Identification Received" }
        };
    } catch (error) {
        context.log.error('Beacon Error:', error);
        context.res = { status: 500, body: { error: 'Internal Error' } };
    }
};
