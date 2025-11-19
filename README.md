# 🚀 **LdPy - Comprehensive B2B Lead Generation & Sales Engagement Platform**

A powerful, enterprise-grade platform designed to help businesses find, engage, and close more customers through verified contact data, intelligent lead generation, and multi-channel sales outreach.

## ✨ **Key Features**

### 🔍 **Advanced Lead Generation**
- **Multi-source prospecting** from Google, LinkedIn, Yellow Pages, and more
- **Real-time lead generation** with live progress updates
- **Intelligent filtering** by industry, company size, location, and technology stack
- **Bulk lead generation** with customizable parameters
- **Persistent lead storage** that survives browser sessions

### 🌐 **Web Scraping & Data Extraction**
- **Multi-source scraping** from Google Maps, LinkedIn, Yelp, Yellow Pages, Crunchbase, and job boards
- **Contact page extraction** for emails, phones, and addresses from company websites
- **Anti-detection features** with rotating user agents, proxy rotation, and stealth mode
- **Rate limiting** and respectful scraping practices
- **Structured data storage** with deduplication and raw data preservation
- **Performance monitoring** with success rates and response time tracking

### ✅ **Contact Verification & Data Enrichment**
- **Multi-provider verification** using Hunter.io, Clearbit, ZeroBounce, and more
- **Email validation** with confidence scoring
- **Phone number verification** via Twilio and Numverify
- **Company data enrichment** from Crunchbase, Apollo, ZoomInfo, and LinkedIn
- **Technology stack detection** and company insights
- **Funding information** and growth stage analysis

### 📧 **Multi-Channel Sales Engagement**
- **Email campaigns** with personalized templates and tracking
- **LinkedIn outreach** with connection requests and messaging
- **Phone call scheduling** and follow-up management
- **Multi-channel sequences** with intelligent timing and automation
- **Response tracking** and engagement analytics
- **CRM integration** for seamless workflow management

### 🎯 **Sales Campaign Management**
- **Campaign creation** with target audience segmentation
- **Outreach sequences** with customizable steps and delays
- **Template management** for emails and LinkedIn messages
- **Performance tracking** with real-time metrics
- **A/B testing** capabilities for optimization
- **Automated follow-ups** based on engagement

### 🔗 **CRM Integrations**
- **Salesforce** integration for lead and opportunity management
- **HubSpot** integration for contact and company data
- **Pipedrive** integration for deal pipeline management
- **Zoho CRM** integration for comprehensive CRM functionality
- **Bidirectional sync** for real-time data consistency
- **Custom field mapping** for seamless integration

### 📊 **Advanced Analytics & Reporting**
- **Lead generation metrics** with qualification and conversion rates
- **Sales performance analytics** with win rates and revenue tracking
- **Campaign performance** with open rates, click rates, and engagement
- **ROI analysis** with cost per lead and customer lifetime value
- **Custom dashboards** with real-time data visualization
- **Export capabilities** in CSV, Excel, and JSON formats

### 🛡️ **Data Quality & Security**
- **Verified contact information** with confidence scoring
- **Data freshness** with automatic re-verification
- **Duplicate detection** and intelligent merging
- **GDPR compliance** with data retention policies
- **Secure API access** with rate limiting and authentication
- **Audit logging** for all data operations

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Dashboard                       │
│  React.js + Tailwind CSS + Real-time Updates              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Backend Services                         │
│  Node.js + Express + Supabase + Real-time APIs            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Core Services Layer                         │
│  • Contact Verification Service                            │
│  • B2B Contact Database Service                            │
│  • Sales Engagement Service                                │
│  • Analytics Service                                       │
│  • Lead Prospecting Service                                │
│  • Web Scraping Service                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                External API Integrations                    │
│  • Hunter.io • Clearbit • ZeroBounce                       │
│  • Twilio • Numverify • Crunchbase                        │
│  • Apollo • ZoomInfo • LinkedIn                           │
│  • Salesforce • HubSpot • Pipedrive • Zoho                │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **Quick Start Guide**

### 1. **Prerequisites**
- Node.js 16+ and npm
- Supabase account and project
- Redis (optional, for caching)
- SMTP credentials for email functionality

### 2. **Installation**

```bash
# Clone the repository
git clone https://github.com/yourusername/ldpy.git
cd ldpy

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../dashboard
npm install
```

### 3. **Environment Configuration**

```bash
# Copy environment template
cp backend/env_template.txt backend/.env

# Edit .env file with your API keys and configuration
nano backend/.env
```

**Required API Keys:**
- **Contact Verification**: Hunter.io, Clearbit, ZeroBounce
- **Phone Verification**: Twilio, Numverify
- **Company Data**: Crunchbase, Apollo, ZoomInfo
- **CRM Integration**: Salesforce, HubSpot, Pipedrive, Zoho

### 4. **Database Setup**

The application uses **Supabase** as its primary database. Follow these steps:

```bash
# 1. Create Supabase project at supabase.com
# 2. Copy your project credentials from Settings → API
# 3. Configure environment variables
cd backend
cp env_template.txt .env
# Edit .env with your Supabase credentials

# 4. Run the table setup script in Supabase SQL Editor
# Copy contents of setup-supabase-tables.sql and run in Supabase dashboard

# 5. Verify connection
npm start
# Check console for successful Supabase connection
```

**📚 Detailed Setup Guide**: See `backend/SUPABASE_SETUP.md` for complete instructions.

### 5. **Start the Application**

```bash
# Start backend server
cd backend
npm start

# Start frontend dashboard
cd dashboard
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📋 **API Endpoints**

### **Lead Generation**
- `POST /api/lead-prospecting/start` - Start lead prospecting
- `GET /api/lead-prospecting/progress/:id` - Real-time progress updates
- `GET /api/lead-prospecting/jobs` - List prospecting jobs
- `GET /api/leads` - Get leads with filtering

### **Contact Verification**
- `POST /api/verify/email` - Verify email address
- `POST /api/verify/phone` - Verify phone number
- `POST /api/enrich/company` - Enrich company data
- `POST /api/enrich/contact` - Enrich contact data

### **Sales Engagement**
- `POST /api/campaigns` - Create sales campaign
- `POST /api/campaigns/:id/send` - Send campaign emails
- `POST /api/sequences` - Create outreach sequence
- `GET /api/campaigns/:id/metrics` - Campaign performance

### **CRM Integration**
- `POST /api/crm/sync/:type` - Sync with CRM system
- `GET /api/crm/status` - CRM integration status
- `POST /api/crm/export` - Export data to CRM

### **Analytics**
- `GET /api/analytics/dashboard` - Dashboard summary
- `GET /api/analytics/leads` - Lead generation metrics
- `GET /api/analytics/sales` - Sales performance metrics
- `GET /api/analytics/campaigns` - Campaign performance metrics

## 🔧 **Configuration Options**

### **Lead Generation Settings**
```javascript
{
  "maxResults": 1000,
  "includeEmails": true,
  "enrichData": true,
  "verifyContacts": true,
  "sources": ["google", "linkedin", "yellowpages"],
  "filters": {
    "industry": ["Technology", "Healthcare"],
    "companySize": ["51-200", "201-500"],
    "location": ["United States", "United Kingdom"]
  }
}
```

### **Campaign Configuration**
```javascript
{
  "campaignType": "multi_channel",
  "sequence": [
    {
      "type": "email",
      "template": "initial_outreach",
      "delay": 0
    },
    {
      "type": "linkedin",
      "template": "connection_request",
      "delay": 2
    },
    {
      "type": "phone_call",
      "template": "follow_up",
      "delay": 5
    }
  ],
  "stopConditions": {
    "stopOnReply": true,
    "maxAttempts": 5
  }
}
```

## 📊 **Performance Metrics**

### **Lead Generation KPIs**
- **Lead Volume**: Total leads generated per period
- **Lead Quality**: Average quality score and qualification rate
- **Conversion Rate**: Leads converted to opportunities
- **Cost per Lead**: Total investment divided by leads generated
- **Source Effectiveness**: Performance by lead source

### **Sales Engagement KPIs**
- **Email Metrics**: Open rate, click rate, reply rate
- **LinkedIn Metrics**: Connection acceptance, message response rate
- **Phone Metrics**: Call completion rate, meeting booking rate
- **Sequence Performance**: Overall sequence effectiveness
- **Response Time**: Time to first response

### **ROI Metrics**
- **Cost per Lead**: Marketing investment per qualified lead
- **Cost per Opportunity**: Investment per sales opportunity
- **Customer Acquisition Cost**: Total cost to acquire a customer
- **Customer Lifetime Value**: Long-term revenue per customer
- **Payback Period**: Time to recover customer acquisition costs

## 🔒 **Security & Compliance**

### **Data Protection**
- **Encryption at rest** for sensitive data
- **TLS/SSL** for data in transit
- **API rate limiting** to prevent abuse
- **Authentication** with JWT tokens
- **Role-based access control** for team members

### **GDPR Compliance**
- **Data retention policies** with automatic cleanup
- **Right to be forgotten** implementation
- **Data export** capabilities for user requests
- **Consent management** for data processing
- **Audit logging** for compliance reporting

### **API Security**
- **API key management** with rotation
- **Request validation** and sanitization
- **CORS configuration** for frontend access
- **IP whitelisting** for sensitive endpoints
- **Request logging** for security monitoring

## 🚀 **Deployment Options**

### **Local Development**
```bash
npm run dev          # Start development server
npm run test         # Run test suite
npm run build        # Build for production
```

### **Docker Deployment**
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t ldpy-backend ./backend
docker build -t ldpy-frontend ./dashboard
```

### **Cloud Deployment**
- **AWS**: Deploy with Elastic Beanstalk or ECS
- **Google Cloud**: Use Cloud Run or Compute Engine
- **Azure**: Deploy with App Service or Container Instances
- **Heroku**: Simple deployment with git push

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
```bash
# Fork and clone the repository
git clone https://github.com/yourusername/ldpy.git
cd ldpy

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m "Add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Create a Pull Request
```

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support & Community**

- **Documentation**: [docs.ldpy.com](https://docs.ldpy.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/ldpy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ldpy/discussions)
- **Email**: support@ldpy.com

## 🙏 **Acknowledgments**

- **Data Providers**: Hunter.io, Clearbit, ZeroBounce, Twilio, Crunchbase
- **CRM Platforms**: Salesforce, HubSpot, Pipedrive, Zoho
- **Open Source**: React, Node.js, Supabase, and the open source community

---

**Built with ❤️ for sales teams and business growth**

*Transform your lead generation and sales engagement with LdPy - the comprehensive B2B platform that delivers verified results.*
