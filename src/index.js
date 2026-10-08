require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;

function buildMongoUri() {
  const configuredUri = process.env.MONGODB_URI?.trim();
  if (configuredUri) return configuredUri;

  const username = process.env.MONGODB_USERNAME?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();
  const host = process.env.MONGODB_HOST?.trim() || 'cluster0.xxxxx.mongodb.net';
  const dbName = process.env.MONGODB_DB_NAME?.trim() || 'saferidego';

  if (username && password) {
    return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/${dbName}?retryWrites=true&w=majority`;
  }

  return null;
}

async function main() {
  const mongoUri = buildMongoUri();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in server/.env. Set it to your Atlas connection string or define MONGODB_USERNAME/MONGODB_PASSWORD. Remember to URL-encode any reserved characters in the Atlas password.');
  }

  try {
    await mongoose.connect(mongoUri);
  } catch (err) {
    if (err.message && /bad auth|authentication failed|login failed/i.test(err.message)) {
      throw new Error(`MongoDB authentication failed. Check the Atlas database user credentials in server/.env and URL-encode any reserved characters in the password. Original error: ${err.message}`);
    }
    throw err;
  }

  console.log('MongoDB connected');
  app.listen(PORT, '0.0.0.0', () => console.log(`SafeRideGo API running on port ${PORT}`));
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
}

module.exports = { buildMongoUri, main };
