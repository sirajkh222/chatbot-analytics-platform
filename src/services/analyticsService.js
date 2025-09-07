const databaseManager = require('./databaseManager');
const { getClient } = require('../config/clients');

/**
 * Analytics service based on EXACT DatabaseService schema from Maple Community Services
 * Provides real business metrics for chatbot performance, leads, and agent interactions
 */
class AnalyticsService {
    
    /**
     * Get comprehensive user events funnel - matches your UserEvents table exactly
     */
    async getUserEventsFunnel(clientId, startDate = null, endDate = null) {
        try {
            const connection = await databaseManager.getConnection(clientId);
            const client = getClient(clientId);
            
            let dateFilter = '';
            const replacements = { clientId: client.clientId || 'maplecommunity' };
            
            if (startDate && endDate) {
                dateFilter = 'AND "createdAt" BETWEEN :startDate AND :endDate';
                replacements.startDate = startDate;
                replacements.endDate = endDate;
            }

            const query = `
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT("pageLoaded") as page_loads,
                    COUNT("widgetOpened") as widget_opens,
                    COUNT("requestedHuman") as human_requests,
                    COUNT("pressedAccept") as accept_presses,
                    COUNT("pressedCallback") as callback_presses,
                    COUNT("pressedContinue") as continue_presses,
                    
                    -- Your business conversion rates
                    ROUND(
                        ((COUNT("widgetOpened")::float / NULLIF(COUNT("pageLoaded"), 0)) * 100)::numeric, 2
                    ) as page_to_widget_rate,
                    
                    ROUND(
                        ((COUNT("requestedHuman")::float / NULLIF(COUNT("widgetOpened"), 0)) * 100)::numeric, 2
                    ) as widget_to_human_rate,
                    
                    ROUND(
                        ((COUNT("pressedAccept")::float / NULLIF(COUNT("requestedHuman"), 0)) * 100)::numeric, 2
                    ) as human_to_accept_rate,
                    
                    ROUND(
                        ((COUNT("pressedCallback")::float / NULLIF(COUNT("requestedHuman"), 0)) * 100)::numeric, 2
                    ) as human_to_callback_rate,
                    
                    -- Overall conversion rate
                    ROUND(
                        (((COUNT("pressedAccept") + COUNT("pressedCallback"))::float / NULLIF(COUNT("pageLoaded"), 0)) * 100)::numeric, 2
                    ) as overall_conversion_rate
                    
                FROM "UserEvents" 
                WHERE "clientId" = :clientId ${dateFilter}
            `;

            const [results] = await connection.query(query, {
                type: connection.QueryTypes.SELECT,
                replacements
            });

            return results;
        } catch (error) {
            console.error('Error getting user events funnel:', error);
            throw error;
        }
    }

    /**
     * Get daily user events breakdown with AEST timezone awareness
     */
    async getDailyUserEvents(clientId, days = 30) {
        try {
            const connection = await databaseManager.getConnection(clientId);
            const client = getClient(clientId);
            
            const query = `
                SELECT 
                    DATE("createdAt" AT TIME ZONE 'Australia/Sydney') as date,
                    COUNT(*) as total_sessions,
                    COUNT("pageLoaded") as page_loads,
                    COUNT("widgetOpened") as widget_opens,
                    COUNT("requestedHuman") as human_requests,
                    COUNT("pressedAccept") as accept_presses,
                    COUNT("pressedCallback") as callback_presses,
                    COUNT("pressedContinue") as continue_presses,
                    
                    -- Conversion rates by day
                    ROUND(
                        ((COUNT("widgetOpened")::float / NULLIF(COUNT("pageLoaded"), 0)) * 100)::numeric, 2
                    ) as daily_page_to_widget_rate,
                    
                    ROUND(
                        (((COUNT("pressedAccept") + COUNT("pressedCallback"))::float / NULLIF(COUNT("requestedHuman"), 0)) * 100)::numeric, 2
                    ) as daily_handoff_success_rate
                    
                FROM "UserEvents"
                WHERE "clientId" = :clientId 
                    AND "createdAt" >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY DATE("createdAt" AT TIME ZONE 'Australia/Sydney')
                ORDER BY date DESC
            `;

            const results = await connection.query(query, {
                type: connection.QueryTypes.SELECT,
                replacements: { clientId: client.clientId || 'maplecommunity' }
            });

            return results;
        } catch (error) {
            console.error('Error getting daily user events:', error);
            throw error;
        }
    }

    /**
     * Get hourly distribution - when are users most active? (AEST)
     */
    async getHourlyDistribution(clientId, days = 7) {
        try {
            const connection = await databaseManager.getConnection(clientId);
            const client = getClient(clientId);
            
            const query = `
                SELECT 
                    EXTRACT(hour FROM "createdAt" AT TIME ZONE 'Australia/Sydney') as hour_aest,
                    COUNT("widgetOpened") as widget_opens,
                    COUNT("requestedHuman") as human_requests,
                    COUNT("pressedAccept") as accept_presses,
                    COUNT("pressedCallback") as callback_presses,
                    ROUND((AVG(
                        CASE WHEN "widgetOpened" IS NOT NULL THEN 1 ELSE 0 END
                    ) * 100)::numeric, 2) as avg_engagement_rate
                FROM "UserEvents"
                WHERE "clientId" = :clientId 
                    AND "createdAt" >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY EXTRACT(hour FROM "createdAt" AT TIME ZONE 'Australia/Sydney')
                ORDER BY hour_aest
            `;

            const results = await connection.query(query, {
                type: connection.QueryTypes.SELECT,
                replacements: { clientId: client.clientId || 'maplecommunity' }
            });

            return results;
        } catch (error) {
            console.error('Error getting hourly distribution:', error);
            throw error;
        }
    }

    /**
     * Get lead capture statistics - your actual business outcomes
     */
    async getLeadStats(clientId, days = 30) {
        try {
            const connection = await databaseManager.getConnection(clientId);
            const client = getClient(clientId);
            
            const query = `
                SELECT 
                    COUNT(*) as total_leads,
                    COUNT(CASE WHEN source = 'chatbot' THEN 1 END) as chatbot_leads,
                    COUNT(CASE WHEN source = 'callback' THEN 1 END) as callback_leads,
                    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
                    COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
                    COUNT(CASE WHEN "salesforceSynced" = true THEN 1 END) as synced_to_salesforce,
                    COUNT(CASE WHEN "salesforceSynced" = false THEN 1 END) as pending_sync,
                    DATE("capturedAt" AT TIME ZONE 'Australia/Sydney') as date,
                    
                    -- Lead quality metrics
                    ROUND((AVG(
                        CASE 
                            WHEN "firstName" IS NOT NULL AND "lastName" IS NOT NULL THEN 1 
                            ELSE 0 
                        END
                    ) * 100)::numeric, 2) as complete_name_percentage,
                    
                    -- Salesforce sync success rate
                    ROUND(
                        ((COUNT(CASE WHEN "salesforceSynced" = true THEN 1 END)::float / 
                         NULLIF(COUNT(*), 0)) * 100)::numeric, 2
                    ) as sync_success_rate
                    
                FROM "Leads"
                WHERE "clientId" = :clientId 
                    AND "capturedAt" >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY DATE("capturedAt" AT TIME ZONE 'Australia/Sydney')
                ORDER BY date DESC
            `;

            const results = await connection.query(query, {
                type: connection.QueryTypes.SELECT,
                replacements: { clientId: client.clientId || 'maplecommunity' }
            });

            return results;
        } catch (error) {
            console.error('Error getting lead stats:', error);
            throw error;
        }
    }

    /**
     * Get agent connection analytics - your human handoff performance
     */
    async getAgentConnectionStats(clientId, days = 30) {
        try {
            const connection = await databaseManager.getConnection(clientId);
            const client = getClient(clientId);
            
            const query = `
                SELECT 
                    COUNT(*) as total_connections,
                    COUNT(CASE WHEN status = 'connected' THEN 1 END) as active_connections,
                    COUNT(CASE WHEN status = 'disconnected' THEN 1 END) as completed_connections,
                    COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timed_out_connections,
                    COUNT(CASE WHEN "disconnectionReason" = 'agent_ended' THEN 1 END) as agent_ended,
                    COUNT(CASE WHEN "disconnectionReason" = 'user_left' THEN 1 END) as user_left,
                    COUNT(CASE WHEN "disconnectionReason" = 'timeout' THEN 1 END) as timeout_disconnections,
                    
                    -- Timing analytics (your key metrics)
                    ROUND(AVG("waitingDuration")::numeric, 2) as avg_waiting_seconds,
                    ROUND(AVG("sessionDuration")::numeric, 2) as avg_session_seconds,
                    ROUND(MAX("waitingDuration")::numeric, 2) as max_waiting_seconds,
                    ROUND(MAX("sessionDuration")::numeric, 2) as max_session_seconds,
                    
                    -- Agent performance
                    COUNT(DISTINCT "agentName") as unique_agents,
                    "agentName" as top_agent,
                    COUNT(*) as agent_session_count,
                    
                    DATE("connectedAt" AT TIME ZONE 'Australia/Sydney') as date
                    
                FROM "AgentConnections"
                WHERE "clientId" = :clientId 
                    AND "connectedAt" >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY DATE("connectedAt" AT TIME ZONE 'Australia/Sydney'), "agentName"
                ORDER BY date DESC, agent_session_count DESC
            `;

            const results = await connection.query(query, {
                type: connection.QueryTypes.SELECT,
                replacements: { clientId: client.clientId || 'maplecommunity' }
            });

            return results;
        } catch (error) {
            console.error('Error getting agent connection stats:', error);
            throw error;
        }
    }

    /**
     * Get conversation analytics - your ChatLog insights  
     */
    async getConversationStats(clientId, days = 30) {
        try {
            const connection = await databaseManager.getConnection(clientId);
            const client = getClient(clientId);
            
            const query = `
                SELECT 
                    COUNT(*) as total_messages,
                    COUNT(CASE WHEN "messageType" = 'user' THEN 1 END) as user_messages,
                    COUNT(CASE WHEN "messageType" = 'bot' THEN 1 END) as bot_messages,
                    COUNT(CASE WHEN "messageType" = 'human' THEN 1 END) as human_messages,
                    COUNT(CASE WHEN "messageType" = 'system' THEN 1 END) as system_messages,
                    
                    -- Conversation depth metrics
                    COUNT(DISTINCT "sessionId") as unique_sessions,
                    ROUND(AVG("convoId")::numeric, 2) as avg_messages_per_session,
                    MAX("convoId") as longest_conversation,
                    
                    -- Salesforce sync status for chat logs
                    COUNT(CASE WHEN "salesforceSynced" = true THEN 1 END) as synced_messages,
                    
                    DATE("timestamp" AT TIME ZONE 'Australia/Sydney') as date
                    
                FROM "ChatLogs"
                WHERE "clientId" = :clientId 
                    AND "timestamp" >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY DATE("timestamp" AT TIME ZONE 'Australia/Sydney')
                ORDER BY date DESC
            `;

            const results = await connection.query(query, {
                type: connection.QueryTypes.SELECT,
                replacements: { clientId: client.clientId || 'maplecommunity' }
            });

            return results;
        } catch (error) {
            console.error('Error getting conversation stats:', error);
            throw error;
        }
    }

    /**
     * Get link click analytics - content engagement from your LinksClicked table
     */
    async getLinkClickStats(clientId, days = 30) {
        try {
            const connection = await databaseManager.getConnection(clientId);
            const client = getClient(clientId);
            
            const query = `
                SELECT 
                    url,
                    COUNT(*) as click_count,
                    COUNT(DISTINCT "sessionId") as unique_sessions,
                    DATE("dateCreated" AT TIME ZONE 'Australia/Sydney') as date,
                    
                    -- Popular content analysis
                    ROUND(
                        ((COUNT(*)::float / (
                            SELECT COUNT(*) FROM "LinksClicked" 
                            WHERE "clientId" = :clientId 
                            AND "dateCreated" >= CURRENT_DATE - INTERVAL '${days} days'
                        )) * 100)::numeric, 2
                    ) as percentage_of_total_clicks
                    
                FROM "LinksClicked"
                WHERE "clientId" = :clientId 
                    AND "dateCreated" >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY url, DATE("dateCreated" AT TIME ZONE 'Australia/Sydney')
                ORDER BY click_count DESC, date DESC
            `;

            const results = await connection.query(query, {
                type: connection.QueryTypes.SELECT,
                replacements: { clientId: client.clientId || 'maplecommunity' }
            });

            return results;
        } catch (error) {
            console.error('Error getting link click stats:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive dashboard overview - all key metrics in one call
     */
    async getDashboardOverview(clientId, days = 30) {
        try {
            const [
                funnelData,
                leadStats,
                agentStats,
                conversationStats,
                linkStats
            ] = await Promise.all([
                this.getUserEventsFunnel(clientId),
                this.getLeadStats(clientId, days),
                this.getAgentConnectionStats(clientId, days),
                this.getConversationStats(clientId, days),
                this.getLinkClickStats(clientId, days)
            ]);

            return {
                userEventsFunnel: funnelData,
                leadPerformance: leadStats,
                agentPerformance: agentStats,
                conversationInsights: conversationStats,
                contentEngagement: linkStats,
                generatedAt: new Date().toISOString(),
                timezone: 'Australia/Sydney'
            };
        } catch (error) {
            console.error('Error getting dashboard overview:', error);
            throw error;
        }
    }
}

module.exports = new AnalyticsService();