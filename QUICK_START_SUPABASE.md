# 🚀 Quick Start with Supabase

## ⚡ **Get Running in 5 Minutes**

### **Step 1: Create Supabase Project**
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create new project: `lead-manager-dashboard`
3. Save your database password!

### **Step 2: Get Connection String**
1. In your Supabase project, go to **Settings** → **Database**
2. Copy the **Connection string** (looks like: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`)

### **Step 3: Create .env File**
```bash
cd backend
copy env_template.txt .env
```
Then edit `.env` and replace the connection string with yours.

### **Step 4: Test Connection**
```bash
cd backend
node test_supabase.js
```
You should see: `✅ Database connection successful!`

### **Step 5: Start Backend**
```bash
npm run dev
```
Backend will be running at: http://localhost:5000

### **Step 6: Start Frontend**
```bash
cd dashboard
npm start
```
Dashboard will be at: http://localhost:3000

## 🎯 **What You Get**

- **Full-stack dashboard** with React frontend
- **Email marketing automation** with SMTP support
- **Lead management** with deduplication
- **PostgreSQL database** hosted on Supabase
- **Real-time data** and analytics

## 🔧 **If Something Goes Wrong**

1. **Check .env file** - Make sure `SUPABASE_DB_URL` is correct
2. **Verify Supabase project** - Ensure it's active and running
3. **Check IP restrictions** - Your IP might need to be whitelisted
4. **Run test script** - `node test_supabase.js` for diagnostics

## 📚 **Need Help?**

- See `backend/setup_supabase.md` for detailed setup
- Check `backend/README.md` for email marketing features
- Supabase docs: [supabase.com/docs](https://supabase.com/docs)

---

**Ready to go?** Start with Step 1 above! 🚀
