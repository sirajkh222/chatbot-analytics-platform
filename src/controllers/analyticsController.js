const analyticsService = require('../services/analyticsService');
const { getClient } = require('../config/clients');

/**
 * Analytics API controller for Grafana data sources
 */
class AnalyticsController {
    
    /**
     * Health check endpoint
     */
    async health(req, res) {
        try {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'chatbot-analytics-platform'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get user events funnel data
     */
    async getUserEventsFunnel(req, res) {
        try {
            const { clientId } = req;
            const { startDate, endDate } = req.query;
            
            const data = await analyticsService.getUserEventsFunnel(
                clientId, 
                startDate ? new Date(startDate) : null,
                endDate ? new Date(endDate) : null
            );
            
            res.json({
                client: getClient(clientId).name,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getUserEventsFunnel:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get daily user events
     */
    async getDailyUserEvents(req, res) {
        try {
            const { clientId } = req;
            const { days = 30 } = req.query;
            
            const data = await analyticsService.getDailyUserEvents(clientId, parseInt(days));
            
            res.json({
                client: getClient(clientId).name,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getDailyUserEvents:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get hourly distribution
     */
    async getHourlyDistribution(req, res) {
        try {
            const { clientId } = req;
            const { days = 7 } = req.query;
            
            const data = await analyticsService.getHourlyDistribution(clientId, parseInt(days));
            
            res.json({
                client: getClient(clientId).name,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getHourlyDistribution:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get lead statistics - your actual business outcomes
     */
    async getLeadStats(req, res) {
        try {
            const { clientId } = req;
            const { days = 30 } = req.query;
            
            const data = await analyticsService.getLeadStats(clientId, parseInt(days));
            
            res.json({
                client: getClient(clientId).name,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getLeadStats:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get agent connection analytics - human handoff performance
     */
    async getAgentStats(req, res) {
        try {
            const { clientId } = req;
            const { days = 30 } = req.query;
            
            const data = await analyticsService.getAgentConnectionStats(clientId, parseInt(days));
            
            res.json({
                client: getClient(clientId).name,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getAgentStats:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get conversation analytics - ChatLog insights
     */
    async getConversationStats(req, res) {
        try {
            const { clientId } = req;
            const { days = 30 } = req.query;
            
            const data = await analyticsService.getConversationStats(clientId, parseInt(days));
            
            res.json({
                client: getClient(clientId).name,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getConversationStats:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get link click analytics - content engagement
     */
    async getLinkClickStats(req, res) {
        try {
            const { clientId } = req;
            const { days = 30 } = req.query;
            
            const data = await analyticsService.getLinkClickStats(clientId, parseInt(days));
            
            res.json({
                client: getClient(clientId).name,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getLinkClickStats:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get comprehensive dashboard overview - all metrics
     */
    async getDashboardOverview(req, res) {
        try {
            const { clientId } = req;
            const { days = 30 } = req.query;
            
            const data = await analyticsService.getDashboardOverview(clientId, parseInt(days));
            
            res.json({
                client: getClient(clientId).name,
                ...data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getDashboardOverview:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Grafana data source test endpoint
     */
    async testDataSource(req, res) {
        try {
            const { clientId } = req;
            const client = getClient(clientId);
            
            // Test database connection
            const databaseManager = require('../services/databaseManager');
            await databaseManager.getConnection(clientId);
            
            res.json({
                status: 'success',
                message: `Data source connected successfully for ${client.name}`,
                clientId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error testing data source:', error);
            res.status(500).json({ 
                status: 'error',
                error: error.message 
            });
        }
    }

    /**
     * List available clients (for admin purposes)
     */
    async listClients(req, res) {
        try {
            const { clients, getClientIds } = require('../config/clients');
            
            const clientList = getClientIds().map(id => ({
                id,
                name: clients[id].name,
                domain: clients[id].domain,
                grafanaOrgId: clients[id].grafanaOrgId
            }));
            
            res.json({
                clients: clientList,
                total: clientList.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error listing clients:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AnalyticsController();