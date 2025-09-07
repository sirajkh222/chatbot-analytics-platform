/**
 * Client configuration for multi-tenant analytics platform
 */
const clients = {
    maple: {
        id: 'maple',
        name: 'Maple Community Services',
        dbUrl: process.env.MAPLE_DATABASE_URL,
        grafanaOrgId: 1,
        domain: 'maplecommunity.com.au',
        timezone: 'Australia/Sydney',
        clientId: 'maplecommunity', // Matches your DatabaseService clientId default
        branding: {
            primaryColor: '#FDC200',
            logoUrl: 'https://maplecommunity.com.au/logo.png'
        }
    },
    client2: {
        id: 'client2',
        name: 'Client 2 NDIS Services',
        dbUrl: process.env.CLIENT2_DATABASE_URL,
        grafanaOrgId: 2,
        domain: 'client2.com',
        timezone: 'Australia/Sydney',
        clientId: 'client2',
        branding: {
            primaryColor: '#2196F3',
            logoUrl: null
        }
    }
    // Add more clients as needed
};

/**
 * Get client configuration by ID
 */
const getClient = (clientId) => {
    const client = clients[clientId];
    if (!client) {
        throw new Error(`Unknown client: ${clientId}`);
    }
    return client;
};

/**
 * Get all available client IDs
 */
const getClientIds = () => {
    return Object.keys(clients);
};

/**
 * Validate if client exists
 */
const isValidClient = (clientId) => {
    return clientId && clients.hasOwnProperty(clientId);
};

module.exports = {
    clients,
    getClient,
    getClientIds,
    isValidClient
};