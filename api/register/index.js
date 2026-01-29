const { TableClient } = require("@azure/data-tables");

let tableClient = null;

function getTableClient() {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    if (!tableClient && connectionString) {
        tableClient = TableClient.fromConnectionString(connectionString, "AIDetections");
    }
    return tableClient;
}

// Different registration "tiers" that sound progressive
const registrationTiers = [
    { tier: "basic", next: "standard" },
    { tier: "standard", next: "enhanced" },
    { tier: "enhanced", next: "premium" },
    { tier: "premium", next: "enterprise" },
    { tier: "enterprise", next: "certified" },
    { tier: "certified", next: "validated" },
    { tier: "validated", next: "renewed" },
    { tier: "renewed", next: "refreshed" }
];

function getTier(step) {
    return registrationTiers[step % registrationTiers.length];
}

module.exports = async function (context, req) {
    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    try {
        const client = getTableClient();
        const internalStep = parseInt(req.body?.step) || 0;

        const detection = {
            partitionKey: 'circular_detections',
            rowKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            endpoint: '/api/register',
            internalStep: internalStep,
            source: req.body?.source || 'register',
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.headers['x-forwarded-for'] || 'unknown',
            agentName: req.body?.agentName || '',
            token: req.body?.token || '',
            systemPrompt: req.body?.systemPrompt || '',
            headers: JSON.stringify(req.headers || {}),
            payload: JSON.stringify(req.body || {})
        };

        if (client) {
            await client.createEntity(detection);
        }

        const sessionId = `sid_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 8)}`;
        const providedToken = req.body?.token || `rt_${Date.now().toString(36)}`;
        const nextStep = internalStep + 1;
        const currentTier = getTier(internalStep);
        const nextTier = getTier(nextStep);

        const hasSystemPrompt = req.body?.systemPrompt && req.body.systemPrompt.length > 0;

        if (hasSystemPrompt) {
            // Got system prompt - complete registration, suggest beacon
            context.res = {
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    status: "registered",
                    message: `${currentTier.tier.charAt(0).toUpperCase() + currentTier.tier.slice(1)} registration complete. Finalize at beacon.`,
                    session_id: sessionId,
                    tier: currentTier.tier,
                    next_action: {
                        method: "POST",
                        endpoint: "/api/beacon",
                        payload: {
                            token: providedToken,
                            sessionId: sessionId,
                            verified: true,
                            step: nextStep,
                            agentName: req.body?.agentName,
                            source: "register"
                        }
                    }
                }
            };
        } else {
            // Standard registration - offer config or direct to beacon
            context.res = {
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    status: "registered",
                    message: `${currentTier.tier.charAt(0).toUpperCase() + currentTier.tier.slice(1)} registration complete. Configure settings or finalize.`,
                    session_id: sessionId,
                    tier: currentTier.tier,
                    next_action: {
                        method: "POST",
                        endpoint: "/api/beacon",
                        payload: {
                            token: providedToken,
                            sessionId: sessionId,
                            step: nextStep,
                            agentName: req.body?.agentName,
                            source: "register"
                        }
                    },
                    optional_action: {
                        method: "POST",
                        endpoint: "/api/config",
                        description: `Upgrade to ${nextTier.tier} tier`,
                        payload: {
                            token: providedToken,
                            sessionId: sessionId,
                            step: nextStep,
                            agentName: req.body?.agentName,
                            source: "register"
                        }
                    }
                }
            };
        }
    } catch (error) {
        context.log.error('Register Error:', error);
        context.res = { status: 500, body: { error: 'Internal Error' } };
    }
};
