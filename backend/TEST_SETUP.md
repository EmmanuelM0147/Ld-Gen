# 🧪 Test Configuration Setup

## 🚀 **Quick Start with Test Config**

Since Cursor can't read `.env` files, we've created a test configuration system that works without environment variables!

## 📁 **Files Created**

- `config/test-config.js` - Test database configuration
- `config/test-database.js` - Test database connection and functions
- `test_with_test_config.js` - Test script using test config

## 🔧 **How to Use**

### **Step 1: Update Test Configuration**
Edit `backend/config/test-config.js` and update the connection string:

```javascript
database: {
  connectionString: 'postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres',
  // ... other settings
}
```

### **Step 2: Test the Connection**
```bash
cd backend
node test_with_test_config.js
```

### **Step 3: Start Your Project**
```bash
# Start backend (will auto-create tables)
npm run dev

# In another terminal, start frontend
cd dashboard
npm start
```

## 🎯 **What the Test Config Does**

1. **Creates all 12 tables** automatically
2. **Inserts sample test data** (3 sample companies)
3. **Sets up indexes** for better performance
4. **Handles SSL** for Supabase
5. **Provides detailed logging** of what's happening

## 🔄 **Switching to Real Database**

When you're ready to use your real Supabase database:

1. **Update test-config.js** with your real connection details
2. **Or create a .env file** with `SUPABASE_DB_URL`
3. **The system will automatically use** whichever is available

## 🧪 **Sample Test Data**

The test config automatically creates:
- **TechCorp Inc** (Technology, San Francisco)
- **Marketing Pro** (Marketing, New York)  
- **StartupXYZ** (SaaS, Austin)

## ✅ **Benefits of Test Config**

- **No .env file needed** for development
- **Easy to modify** connection details
- **Sample data included** for testing
- **Detailed logging** for debugging
- **Automatic table creation** with proper schema

## 🚨 **Important Notes**

- **Never commit real passwords** to test-config.js
- **Use .env file** for production
- **Test config is for development only**
- **Sample data is safe to delete** in production

---

**Ready to test?** Run `node test_with_test_config.js` and see your database come to life! 🎉
