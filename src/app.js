const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const analyticsController = require('./controllers/analyticsController');
const { clientAuth, optionalClientAuth } = require('./middleware/clientAuth');
const { getClientIds } = require('./config/clients');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Chatbot Analytics Platform',
        version: '1.0.0',
        description: 'Multi-client analytics platform for chatbot services',
        availableClients: getClientIds(),
        endpoints: {
            health: '/health',
            clients: '/clients',
            grafana: '/grafana',
            analytics: '/api/:clientId/*'
        },
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', analyticsController.health);

// List all clients (admin endpoint)
app.get('/clients', analyticsController.listClients);

// Client-specific analytics API routes - based on your actual DatabaseService
app.get('/api/:clientId/funnel', clientAuth, analyticsController.getUserEventsFunnel);
app.get('/api/:clientId/daily', clientAuth, analyticsController.getDailyUserEvents);
app.get('/api/:clientId/hourly', clientAuth, analyticsController.getHourlyDistribution);
app.get('/api/:clientId/leads', clientAuth, analyticsController.getLeadStats);
app.get('/api/:clientId/agents', clientAuth, analyticsController.getAgentStats);
app.get('/api/:clientId/conversations', clientAuth, analyticsController.getConversationStats);
app.get('/api/:clientId/links', clientAuth, analyticsController.getLinkClickStats);
app.get('/api/:clientId/overview', clientAuth, analyticsController.getDashboardOverview);
app.get('/api/:clientId/test', clientAuth, analyticsController.testDataSource);

// Grafana proxy with client routing
const grafanaProxy = createProxyMiddleware({
    target: process.env.GRAFANA_URL || 'http://localhost:3000',
    changeOrigin: true,
    ws: true,
    secure: true,
    cookieDomainRewrite: false,
    cookiePathRewrite: false,
    pathRewrite: (path, req) => {
        // Extract client ID from path
        const clientId = req.params.clientId;
        
        // Remove client ID from path for Grafana
        return path.replace(`/${clientId}`, '');
    },
    onProxyReq: (proxyReq, req, res) => {
        // Add client context to Grafana requests
        if (req.clientId) {
            proxyReq.setHeader('X-Client-Id', req.clientId);
        }
        // Forward all cookies
        if (req.headers.cookie) {
            proxyReq.setHeader('Cookie', req.headers.cookie);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        // Forward Set-Cookie headers
        if (proxyRes.headers['set-cookie']) {
            res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
        }
    },
    onError: (err, req, res) => {
        console.error('Grafana proxy error:', err);
        res.status(502).json({
            error: 'Grafana service unavailable',
            message: 'Unable to connect to Grafana dashboard'
        });
    }
});

// Client-specific Grafana routes
app.use('/:clientId/grafana', clientAuth, (req, res, next) => {
    // Log access
    console.log(`📊 Grafana access for client: ${req.clientId}`);
    next();
}, grafanaProxy);

// Direct Grafana access (fallback)
app.use('/grafana', optionalClientAuth, grafanaProxy);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Application error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: 'The requested resource does not exist',
        availableEndpoints: {
            root: '/',
            health: '/health',
            clients: '/clients',
            analytics: '/api/:clientId/*',
            grafana: '/:clientId/grafana'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Chatbot Analytics Platform running on port ${PORT}`);
    console.log(`📊 Available clients: ${getClientIds().join(', ')}`);
    console.log(`📈 Grafana URL: ${process.env.GRAFANA_URL || 'http://localhost:3000'}`);
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Example URLs:`);
        getClientIds().forEach(clientId => {
            console.log(`   - Analytics API: http://localhost:${PORT}/api/${clientId}/funnel`);
            console.log(`   - Grafana Dashboard: http://localhost:${PORT}/${clientId}/grafana`);
        });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    
    try {
        const databaseManager = require('./services/databaseManager');
        await databaseManager.closeAll();
        console.log('✅ Database connections closed');
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
    }
    
    process.exit(0);
});

module.exports = app;