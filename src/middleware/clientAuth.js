const { isValidClient } = require('../config/clients');

/**
 * Middleware to validate and authenticate client access
 */
const clientAuth = (req, res, next) => {
    const clientId = req.params.clientId || req.query.clientId || req.headers['x-client-id'];
    
    if (!clientId) {
        return res.status(400).json({
            error: 'Client ID is required',
            message: 'Please provide client ID via URL parameter, query string, or header'
        });
    }
    
    if (!isValidClient(clientId)) {
        return res.status(404).json({
            error: 'Unknown client',
            message: `Client '${clientId}' not found`
        });
    }
    
    // Add client ID to request object
    req.clientId = clientId;
    next();
};

/**
 * Optional client auth - doesn't fail if no client provided
 */
const optionalClientAuth = (req, res, next) => {
    const clientId = req.params.clientId || req.query.clientId || req.headers['x-client-id'];
    
    if (clientId && isValidClient(clientId)) {
        req.clientId = clientId;
    }
    
    next();
};

module.exports = {
    clientAuth,
    optionalClientAuth
};