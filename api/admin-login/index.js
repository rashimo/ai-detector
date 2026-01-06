const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = async function (context, req) {
    // Moved inside to ensure process.env is populated
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    try {
        const { password } = req.body || {};
        const providedHash = hashPassword(password || '');

        if (adminPasswordHash && providedHash === adminPasswordHash) {
            // Use the hash itself as the secret key
            const token = jwt.sign({ role: 'admin' }, adminPasswordHash, { expiresIn: '24h' });

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
        context.log.error('Login error:', error);
        context.res = {
            status: 500,
            body: { success: false, error: 'Server error' }
        };
    }
};
