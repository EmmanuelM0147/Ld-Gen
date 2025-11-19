# Lead Manager Dashboard

A modern, full-stack dashboard for managing business leads with comprehensive filtering, analytics, and export capabilities.

## 🚀 Features

### **Lead Management**
- **View all leads** in a responsive, sortable table
- **Advanced filtering** by industry, company size, location, status, and quality score
- **Lead status tracking** (New, Contacted, Interested, Closed)
- **Add tags and notes** to leads for better organization
- **Bulk operations** for multiple leads

### **Data Export**
- **CSV export** with customizable fields
- **Excel export** with formatted worksheets
- **JSON export** for API integration
- **Filtered exports** based on current view

### **Analytics & Insights**
- **Dashboard overview** with key metrics
- **Lead source analysis** and performance tracking
- **Industry distribution** charts
- **Quality score distribution** and trends
- **Conversion funnel** visualization
- **Monthly trends** and growth metrics

### **User Experience**
- **Modern UI** built with React and Tailwind CSS
- **Responsive design** for all devices
- **Real-time updates** and notifications
- **Keyboard shortcuts** and accessibility features
- **Dark/light mode** support

## 🛠️ Tech Stack

### **Frontend**
- **React 18** with hooks and functional components
- **Tailwind CSS** for styling and responsive design
- **React Router** for navigation
- **React Table** for data table functionality
- **Lucide React** for icons
- **React Hot Toast** for notifications

### **Backend**
- **Node.js** with Express.js
- **PostgreSQL** database with connection pooling
- **JWT authentication** and security middleware
- **Rate limiting** and CORS protection
- **Input validation** with express-validator
- **File upload** and processing

### **Database**
- **PostgreSQL** with advanced queries
- **Connection pooling** for performance
- **JSON fields** for flexible data storage
- **Indexes** for fast filtering and search

## 📦 Installation

### **Prerequisites**
- Node.js 16+ and npm
- PostgreSQL 12+
- Git

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd lead-dashboard
```

### **2. Install Frontend Dependencies**
```bash
cd dashboard
npm install
```

### **3. Install Backend Dependencies**
```bash
cd ../backend
npm install
```

### **4. Environment Configuration**
Create `.env` files in both frontend and backend directories:

**Frontend (.env)**
```bash
REACT_APP_API_URL=http://localhost:5000/api
```

**Backend (.env)**
```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leads_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **5. Database Setup**
```sql
-- Create database
CREATE DATABASE leads_db;

-- Connect to database and run the schema from your existing database.py
-- The backend will automatically create tables if they don't exist
```

## 🚀 Running the Application

### **1. Start Backend Server**
```bash
cd backend
npm run dev
```
Server will start on http://localhost:5000

### **2. Start Frontend Development Server**
```bash
cd dashboard
npm start
```
Dashboard will open on http://localhost:3000

### **3. Production Build**
```bash
cd dashboard
npm run build
```

## 📊 Database Schema

The dashboard integrates with your existing lead management database structure:

### **Core Tables**
- `business_contacts` - Main lead information
- `company_emails` - Email addresses and validation
- `lead_enrichment` - Enriched company data
- `lead_quality_scores` - Quality scoring metrics
- `email_validation` - Email validation results
- `spam_detection` - Spam detection data

### **Additional Tables for Dashboard**
- `lead_tags` - Tags for lead organization
- `lead_notes` - Notes and comments on leads
- `lead_status_history` - Status change tracking

## 🔧 Configuration

### **Frontend Configuration**
- **API endpoints** in `src/services/api.js`
- **Export settings** in `src/utils/exportUtils.js`
- **Styling** in `tailwind.config.js`

### **Backend Configuration**
- **Database connection** in `config/database.js`
- **Rate limiting** in `server.js`
- **CORS settings** for cross-origin requests

## 📱 Usage Guide

### **Dashboard Overview**
1. **Navigate to Dashboard** - View key metrics and recent activity
2. **Monitor performance** - Track conversion rates and quality scores
3. **Quick actions** - Address leads needing attention

### **Lead Management**
1. **View all leads** - Browse leads with pagination and sorting
2. **Apply filters** - Filter by industry, size, location, status
3. **Edit leads** - Update information and change status
4. **Add notes** - Document interactions and follow-ups
5. **Tag leads** - Organize leads by categories

### **Data Export**
1. **Select format** - Choose CSV, Excel, or JSON
2. **Apply filters** - Export filtered data only
3. **Customize fields** - Include/exclude specific data
4. **Download** - Get formatted files for external use

### **Analytics**
1. **View charts** - Analyze lead sources and trends
2. **Track performance** - Monitor conversion rates
3. **Quality insights** - Understand lead quality distribution
4. **Time-based analysis** - Compare periods and growth

## 🔒 Security Features

- **JWT authentication** for API access
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization
- **CORS protection** for cross-origin requests
- **Helmet.js** for security headers
- **SQL injection protection** with parameterized queries

## 📈 Performance Features

- **Database connection pooling** for efficient queries
- **Pagination** for large datasets
- **Lazy loading** of components
- **Compression middleware** for responses
- **Caching strategies** for frequently accessed data

## 🧪 Testing

### **Frontend Testing**
```bash
cd dashboard
npm test
```

### **Backend Testing**
```bash
cd backend
npm test
```

## 🚀 Deployment

### **Frontend Deployment**
```bash
cd dashboard
npm run build
# Deploy the build folder to your hosting service
```

### **Backend Deployment**
```bash
cd backend
npm start
# Use PM2 or similar process manager for production
```

### **Environment Variables**
- Set `NODE_ENV=production`
- Configure production database credentials
- Set secure JWT secrets
- Configure CORS for production domain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the configuration options
3. Check that all dependencies are properly installed
4. Ensure your database is properly configured
5. Verify API endpoints are accessible

## 🔮 Future Enhancements

- **Real-time notifications** with WebSocket
- **Advanced reporting** with custom dashboards
- **Email integration** for automated follow-ups
- **Mobile app** for on-the-go lead management
- **AI-powered lead scoring** and recommendations
- **Integration with CRM systems** (Salesforce, HubSpot)
- **Advanced analytics** with machine learning insights
