const { initializeAllTables } = require('./config/database');

console.log('🚀 Creating all database tables...\n');

initializeAllTables()
  .then(() => {
    console.log('\n✅ All tables created successfully!');
    console.log('Your database is now ready to use.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to create tables:', error.message);
    console.log('\n🔧 Check your database connection and try again.');
    process.exit(1);
  });
