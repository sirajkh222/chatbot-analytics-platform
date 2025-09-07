const { Sequelize, DataTypes } = require('sequelize');
const { getClient } = require('../config/clients');

/**
 * Multi-client database connection manager
 * Handles separate database connections for each client
 */
class DatabaseManager {
    constructor() {
        this.connections = new Map();
        this.models = new Map();
    }

    /**
     * Get or create database connection for a client
     */
    async getConnection(clientId) {
        if (!this.connections.has(clientId)) {
            const client = getClient(clientId);
            
            const sequelize = new Sequelize(client.dbUrl, {
                dialect: 'postgres',
                logging: false,
                dialectOptions: {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                }
            });

            // Test connection
            try {
                await sequelize.authenticate();
                console.log(`✅ Database connection established for client: ${clientId}`);
                this.connections.set(clientId, sequelize);
                
                // Initialize models for this client
                this.initializeModels(clientId, sequelize);
                
            } catch (error) {
                console.error(`❌ Unable to connect to database for client ${clientId}:`, error);
                throw error;
            }
        }

        return this.connections.get(clientId);
    }

    /**
     * Initialize database models for a client - EXACT match to your DatabaseService
     */
    initializeModels(clientId, sequelize) {
        const models = {};

        // TimezoneUtils equivalent (simplified for analytics)
        const nowInAEST = () => {
            return new Date(new Date().toLocaleString("en-US", {timeZone: "Australia/Sydney"}));
        };

        // UserEvents model - EXACT match to your DatabaseService
        models.UserEvents = sequelize.define('UserEvents', {
            sessionId: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            clientId: {
                type: DataTypes.STRING,
                defaultValue: 'maplecommunity' // Matches your default
            },
            pageLoaded: {
                type: DataTypes.DATE,
                allowNull: true
            },
            widgetOpened: {
                type: DataTypes.DATE,
                allowNull: true
            },
            requestedHuman: {
                type: DataTypes.DATE,
                allowNull: true
            },
            pressedAccept: {
                type: DataTypes.DATE,
                allowNull: true
            },
            pressedCallback: {
                type: DataTypes.DATE,
                allowNull: true
            },
            pressedContinue: {
                type: DataTypes.DATE,
                allowNull: true
            }
        }, {
            timestamps: true,
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
            hooks: {
                beforeCreate: (userEvent, options) => {
                    userEvent.createdAt = nowInAEST();
                    userEvent.updatedAt = nowInAEST();
                },
                beforeUpdate: (userEvent, options) => {
                    userEvent.updatedAt = nowInAEST();
                }
            }
        });

        // Lead model - EXACT match to your DatabaseService
        models.Lead = sequelize.define('Lead', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            sessionId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            clientId: {
                type: DataTypes.STRING,
                defaultValue: 'maplecommunity'
            },
            firstName: {
                type: DataTypes.STRING,
                allowNull: true
            },
            lastName: {
                type: DataTypes.STRING,
                allowNull: true
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isEmail: true
                }
            },
            phone: {
                type: DataTypes.STRING,
                allowNull: false
            },
            capturedAt: {
                type: DataTypes.DATE,
                defaultValue: () => nowInAEST()
            },
            source: {
                type: DataTypes.STRING,
                defaultValue: 'chatbot'
            },
            status: {
                type: DataTypes.STRING,
                defaultValue: 'new'
            },
            notes: {
                type: DataTypes.TEXT
            },
            // Salesforce sync fields - from your schema
            salesforceId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            salesforceSynced: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            salesforceSyncDate: {
                type: DataTypes.DATE,
                allowNull: true
            },
            salesforceSyncError: {
                type: DataTypes.TEXT,
                allowNull: true
            }
        });

        // ChatLog model - EXACT match to your DatabaseService
        models.ChatLog = sequelize.define('ChatLog', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            sessionId: {
                type: DataTypes.STRING,
                allowNull: false,
                index: true
            },
            convoId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            clientId: {
                type: DataTypes.STRING,
                defaultValue: 'maplecommunity'
            },
            messageType: {
                type: DataTypes.ENUM('user', 'bot', 'human', 'system'),
                allowNull: false
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {}
            },
            timestamp: {
                type: DataTypes.DATE,
                defaultValue: () => nowInAEST()
            },
            // Salesforce sync fields from your schema
            salesforceSynced: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            salesforceSyncDate: {
                type: DataTypes.DATE,
                allowNull: true
            }
        });

        // AgentConnection model - EXACT match to your DatabaseService
        models.AgentConnection = sequelize.define('AgentConnection', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            sessionId: {
                type: DataTypes.STRING,
                allowNull: false,
                index: true
            },
            persistentUserId: {
                type: DataTypes.STRING,
                allowNull: true,
                index: true
            },
            clientId: {
                type: DataTypes.STRING,
                defaultValue: 'maplecommunity'
            },
            agentName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            agentId: {
                type: DataTypes.STRING
            },
            // Slack-specific fields from your schema
            threadTs: {
                type: DataTypes.STRING,
                allowNull: true
            },
            messageTs: {
                type: DataTypes.STRING,
                allowNull: true
            },
            conversationSummary: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            // Timing fields from your schema
            handoffRequestedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            connectedAt: {
                type: DataTypes.DATE,
                defaultValue: () => nowInAEST()
            },
            disconnectedAt: {
                type: DataTypes.DATE
            },
            waitingDuration: {
                type: DataTypes.INTEGER // seconds between request and connection
            },
            sessionDuration: {
                type: DataTypes.INTEGER // seconds of actual chat time
            },
            status: {
                type: DataTypes.ENUM('connected', 'disconnected', 'failed', 'timeout'),
                defaultValue: 'connected'
            },
            disconnectionReason: {
                type: DataTypes.ENUM('agent_ended', 'user_left', 'timeout', 'system_error'),
                allowNull: true
            },
            // Salesforce sync fields from your schema
            salesforceSynced: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            salesforceSyncDate: {
                type: DataTypes.DATE,
                allowNull: true
            }
        });

        // LinksClicked model - from your DatabaseService
        models.LinksClicked = sequelize.define('LinksClicked', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            sessionId: {
                type: DataTypes.STRING,
                allowNull: false,
                index: true
            },
            clientId: {
                type: DataTypes.STRING,
                defaultValue: 'maplecommunity'
            },
            url: {
                type: DataTypes.STRING,
                allowNull: false
            },
            dateCreated: {
                type: DataTypes.DATE,
                defaultValue: () => nowInAEST()
            }
        });

        this.models.set(clientId, models);
    }

    /**
     * Get models for a specific client
     */
    getModels(clientId) {
        return this.models.get(clientId);
    }

    /**
     * Execute query with client-specific connection
     */
    async query(clientId, sql, options = {}) {
        const connection = await this.getConnection(clientId);
        return await connection.query(sql, options);
    }

    /**
     * Close all database connections
     */
    async closeAll() {
        for (const [clientId, connection] of this.connections) {
            try {
                await connection.close();
                console.log(`✅ Database connection closed for client: ${clientId}`);
            } catch (error) {
                console.error(`❌ Error closing connection for client ${clientId}:`, error);
            }
        }
        this.connections.clear();
        this.models.clear();
    }
}

module.exports = new DatabaseManager();