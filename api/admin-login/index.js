const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Use the hash as the secret for signing tokens
const JWT_SECRET = process.env.ADMIN_PASSWORD_HASH;

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = async function (context, req) {
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    try {
        const { password } = req.body || {};
        const providedHash = hashPassword(password || '');

        if (providedHash === adminPasswordHash && adminPasswordHash) {
            // Generate a stateless JWT token valid for 24h
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

            context.res = {
                status: 200,
                body: { success: true, token: token }
            };
        } else {
            context.res = {
                status: 401,
                body: { success: false, error: 'Invalid password' }
            };
        }
    } catch (error) {
        context.res = {
            status: 500,
            body: { success: false, error: 'Server error' }
        };
    }
};
