const { TableClient } = require("@azure/data-tables");
const jwt = require('jsonwebtoken');

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
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        };
        return;
    }

    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        context.res = { 
            status: 401, 
            body: { success: false, error: 'Unauthorized' },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, adminPasswordHash);
    } catch (err) {
        context.res = { 
            status: 401, 
            body: { success: false, error: 'Session expired' },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
        return;
    }

    try {
        const client = getTableClient();
        if (!client) {
            // No storage configured - return empty
            context.res = {
                status: 200,
                body: { success: true, detections: [], count: 0 },
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
            return;
        }

        const detections = [];
        const entities = client.listEntities({ queryOptions: { filter: "PartitionKey eq 'detections'" } });
        
        for await (const entity of entities) {
            detections.push({
                timestamp: entity.timestamp,
                source: entity.source,
                agentName: entity.agentName || 'Unknown',
                ipAddress: entity.ip,
                systemPrompt: entity.systemPrompt,
                headers: entity.headers ? JSON.parse(entity.headers) : {},
                capabilities: entity.capabilities,
                id: entity.rowKey
            });
        }

        const sorted = detections
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        context.res = {
            status: 200,
            body: { success: true, detections: sorted, count: sorted.length },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    } catch (error) {
        context.log.error('Fetch error:', error);
        context.res = { 
            status: 500, 
            body: { success: false, error: 'Failed to fetch data' },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
};
