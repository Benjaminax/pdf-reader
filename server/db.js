import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[DB Warning] MONGODB_URI is not set in environment variables. Database functionality will be disabled or fallback mode will be used.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'PDF', // Ensures database is set to PDF
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    return false;
  }
};

export default connectDB;
