const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import routes
const dashboardRoutes = require('./routes/dashboard');
const leadsRoutes = require('./routes/leads');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');
const settingsRoutes = require('./routes/settings');
const databaseRoutes = require('./routes/database');
const emailMarketingRoutes = require('./routes/emailMarketing');
const leadProspectingRoutes = require('./routes/leadProspecting'); // Re-enabled - now uses Supabase
const webScrapingRoutes = require('./routes/webScraping');

// Import Supabase configuration
const { supabaseConfig } = require('./config/supabase-config');

const app = express();

// Get port from test config or environment
const PORT = process.env.PORT || supabaseConfig.server.port || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || supabaseConfig.server.frontendUrl || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging middleware
app.use(morgan('combined'));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    database: 'Supabase API',
    supabaseUrl: supabaseConfig.supabase.url
  });
});

// API routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/email-marketing', emailMarketingRoutes);
app.use('/api/lead-prospecting', leadProspectingRoutes); // Re-enabled - now uses Supabase
app.use('/api/web-scraping', webScrapingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Connected to Supabase: ${supabaseConfig.supabase.url}`);
  console.log(`📝 Database tables will be created automatically when needed`);
  console.log(`✅ Lead Prospecting routes enabled and using Supabase`);
});

module.exports = app;

