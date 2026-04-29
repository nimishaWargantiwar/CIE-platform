// ==========================================
// MongoDB Connection
// ==========================================

const mongoose = require('mongoose');
const dns = require('node:dns');
const { MONGO_URI } = require('./env');

const CONNECT_OPTIONS = {
  // Production-recommended settings
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

function isSrvDnsError(err) {
  const msg = `${err?.message || ''}`;
  return /querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT/i.test(msg);
}

async function connectWithUri(uri) {
  return mongoose.connect(uri, CONNECT_OPTIONS);
}

const connectDB = async () => {
  try {
    let conn;

    try {
      conn = await connectWithUri(MONGO_URI);
    } catch (initialErr) {
      const isSrvUri = `${MONGO_URI || ''}`.startsWith('mongodb+srv://');
      if (!(isSrvUri && isSrvDnsError(initialErr))) {
        throw initialErr;
      }

      // Some networks block SRV DNS lookups via system resolvers. Retry with public DNS.
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      conn = await connectWithUri(MONGO_URI);
    }

    const logger = require('../services/logger');
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`, {
      database: conn.connection.name,
    });
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
