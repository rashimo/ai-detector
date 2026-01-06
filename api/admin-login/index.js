const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
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
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || 
            hashPassword('admin123'); // Default for testing

        const { password } = req.body || {};
        const providedHash = hashPassword(password || '');

        if (providedHash === adminPasswordHash) {
            const token = jwt.sign({ role: 'admin' }, adminPasswordHash, { expiresIn: '24h' });

            context.res = {
                status: 200,
                body: { success: true, token: token },
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        } else {
            context.res = {
                status: 401,
                body: { success: false, error: 'Invalid password' },
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
    } catch (error) {
        context.log.error('Login error:', error);
        context.res = {
            status: 500,
            body: { success: false, error: 'Server error' },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
};
