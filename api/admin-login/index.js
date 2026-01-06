const crypto = require('crypto');

// Store sessions in memory (for production, use Redis or Table Storage)
const sessions = new Map();

// Hash function for password
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate session token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
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
        return;
    }

    if (req.method !== 'POST') {
        context.res.status = 405;
        context.res.body = { error: 'Method not allowed' };
        return;
    }

    try {
        const { password } = req.body;

        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        const providedHash = hashPassword(password);

        if (providedHash === adminPasswordHash) {
            // Generate session token
            const token = generateToken();
            const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
            
            sessions.set(token, { expiry, ip: req.headers['x-forwarded-for'] || 'unknown' });

            // Clean up expired sessions
            for (const [key, value] of sessions.entries()) {
                if (value.expiry < Date.now()) {
                    sessions.delete(key);
                }
            }

            context.log('Admin login successful');

            context.res.status = 200;
            context.res.body = {
                success: true,
                token: token
            };
        } else {
            context.log('Admin login failed - invalid password');
            
            context.res.status = 401;
            context.res.body = {
                success: false,
                error: 'Invalid password'
            };
        }

    } catch (error) {
        context.log.error('Login error:', error);
        context.res.status = 500;
        context.res.body = {
            success: false,
            error: 'Internal server error'
        };
    }

    // Export sessions for use in other functions
    context.bindings.sessions = sessions;
};

// Export for other functions to validate tokens
module.exports.validateToken = function(token) {
    const session = sessions.get(token);
    if (!session) return false;
    if (session.expiry < Date.now()) {
        sessions.delete(token);
        return false;
    }
    return true;
};

module.exports.sessions = sessions;
