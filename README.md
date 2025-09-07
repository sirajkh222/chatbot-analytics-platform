# Chatbot Analytics Platform

Multi-client analytics platform for chatbot services with Grafana dashboards and PostgreSQL data sources.

## Features

- **Multi-Client Support**: Separate databases and dashboards per client
- **User Events Analytics**: Complete funnel analysis from page load to conversion
- **Grafana Integration**: Professional dashboards with real-time data
- **RESTful API**: Clean analytics API for custom integrations
- **Docker Deployment**: Easy deployment with Docker Compose
- **Railway Ready**: Configured for Railway platform deployment

## Quick Start

### Local Development

1. **Clone and Setup**
   ```bash
   git clone <repo-url>
   cd chatbot-analytics-platform
   cp .env.example .env
   ```

2. **Configure Environment**
   ```bash
   # Edit .env with your database URLs
   MAPLE_DB_URL=postgresql://user:pass@host:5432/maple_chatbot
   CLIENT2_DB_URL=postgresql://user:pass@host:5432/client2_chatbot
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Access Dashboards**
   - Maple Analytics: http://localhost:3001/maple/grafana
   - Client2 Analytics: http://localhost:3001/client2/grafana
   - API Health: http://localhost:3001/health

### Railway Deployment

1. **Connect Repository** to Railway
2. **Set Environment Variables**:
   ```
   MAPLE_DB_URL=your_maple_database_url
   CLIENT2_DB_URL=your_client2_database_url
   GRAFANA_ADMIN_PASSWORD=secure_password
   ```
3. **Deploy** - Railway will automatically build and deploy

## API Endpoints

### Analytics API
- `GET /api/{clientId}/funnel` - Conversion funnel data
- `GET /api/{clientId}/daily` - Daily user events
- `GET /api/{clientId}/hourly` - Hourly distribution  
- `GET /api/{clientId}/leads` - Lead capture statistics
- `GET /api/{clientId}/test` - Data source health check

### Management
- `GET /health` - Service health check
- `GET /clients` - List available clients
- `GET /{clientId}/grafana` - Client-specific Grafana access

## Dashboard Features

### User Events Analytics Dashboard
- **Conversion Funnel**: Page loads → Widget opens → Human requests → Actions
- **Conversion Rates**: Percentage calculations for each funnel step
- **Time Series**: Daily and hourly trends
- **Heatmap**: Activity patterns by hour of day
- **Session Table**: Detailed session-level data

### Key Metrics
- Page Load Rate
- Widget Open Rate  
- Human Request Rate
- Accept vs Callback Rate
- Session Duration
- Peak Activity Hours

## Client Configuration

Add new clients in `src/config/clients.js`:

```javascript
clientname: {
    id: 'clientname',
    name: 'Client Display Name',
    dbUrl: process.env.CLIENTNAME_DB_URL,
    grafanaOrgId: 3,
    domain: 'client.com',
    timezone: 'Australia/Sydney',
    branding: {
        primaryColor: '#FF5722',
        logoUrl: 'https://client.com/logo.png'
    }
}
```

## Database Schema

The platform expects these tables in each client database:

### UserEvents Table
- `sessionId` (PRIMARY KEY)
- `pageLoaded` (TIMESTAMP)  
- `widgetOpened` (TIMESTAMP)
- `requestedHuman` (TIMESTAMP)
- `pressedAccept` (TIMESTAMP)
- `pressedCallback` (TIMESTAMP)
- `pressedContinue` (TIMESTAMP)
- `createdAt`, `updatedAt` (TIMESTAMPS)

### Additional Tables (Optional)
- `Leads` - Lead capture data
- `ChatLog` - Conversation history
- `AgentConnection` - Human handoff tracking

## Architecture

```
┌─────────────────────────────────────┐
│     Analytics Platform (Railway)   │
├─────────────────────────────────────┤
│  Express API + Grafana Proxy       │
│  - Multi-client routing             │
│  - Database connection management   │
│  - Authentication & permissions     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│        Grafana Instance            │
│  - Organization per client          │
│  - Provisioned dashboards          │
│  - PostgreSQL data sources         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     Client Databases               │
│  🏥 Maple DB    🏢 Client2 DB      │
│  📊 UserEvents  📊 UserEvents      │
│  📋 Leads       📋 Leads           │
└─────────────────────────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with multiple clients
5. Submit a pull request

## License

MIT License - see LICENSE file for details