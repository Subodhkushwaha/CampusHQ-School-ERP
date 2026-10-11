const mongoose = require('mongoose');

async function connectDB() {
  const dbUri = process.env.DATABASE || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!dbUri) {
    const errorMsg =
      'Configuration Error: DATABASE environment variable is not defined.\n' +
      'Please set DATABASE in backend/.env to a valid MongoDB connection string.\n' +
      'Example: DATABASE="mongodb://127.0.0.1:27017/campushq" or a MongoDB Atlas URI.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const timeoutMs = isProduction ? 15000 : 10000;

  // Mask credentials completely from URI for safe logging
  const safeMaskUri = (uri) => {
    try {
      return uri.replace(/\/\/([^:@]+):([^@]+)@/, '//****:****@');
    } catch {
      return '***[MASKED]***';
    }
  };

  const sanitizedUri = safeMaskUri(dbUri);

  // Extract host and database name safely
  let hostInfo = 'unknown';
  let dbNameFromUri = null;
  try {
    const match = dbUri.match(/@([^\/?#]+)(?:\/([^?#]*))?/);
    if (match) {
      hostInfo = match[1];
      if (match[2] && match[2].trim() && match[2].trim().toLowerCase() !== 'test') {
        dbNameFromUri = match[2].trim();
      }
    }
  } catch (_) {}

  // Ensure database is always 'campushq' unless explicitly overridden by DB_NAME env var
  const targetDbName = process.env.DB_NAME || dbNameFromUri || 'campushq';

  console.log(`Attempting MongoDB connection to host: ${hostInfo}, database: ${targetDbName}...`);

  const mongooseOptions = {
    dbName: targetDbName,
    serverSelectionTimeoutMS: timeoutMs,
    socketTimeoutMS: 45000,
    maxPoolSize: isProduction ? 20 : 10,
  };

  try {
    await mongoose.connect(dbUri, mongooseOptions);
    console.log(`Connected to MongoDB successfully at ${sanitizedUri}`);

    // Register runtime listeners for connection resilience
    mongoose.connection.on('error', (err) => {
      console.error('Runtime MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Waiting for automatic reconnect...');
    });
  } catch (err) {
    console.error('\n' + '='.repeat(68));
    console.error(`DATABASE CONNECTION FAILED: Unable to connect to MongoDB`);
    console.error(`Target Host:     ${hostInfo}`);
    console.error(`Target Database: ${targetDbName}`);
    console.error(`Sanitized URI:   ${sanitizedUri}`);
    console.error(`Error Name:      ${err.name}`);
    console.error(`Error Details:   ${err.message}`);

    // Run active deep diagnostic probe to pinpoint exact failure layer
    await runActiveDiagnostics(hostInfo);

    const msg = (err.message || '').toLowerCase();
    const name = err.name || '';

    if (
      name === 'MongoServerSelectionError' ||
      msg.includes('could not connect to any servers') ||
      msg.includes('serverselectionerror') ||
      msg.includes('timed out')
    ) {
      console.error('\n▶ DIAGNOSIS: ATLAS FIREWALL / NETWORK ACCESS RESTRICTION');
      console.error('  Your MongoDB Atlas cluster rejected incoming traffic from this server IP.');
      console.error('  Render runs on dynamic cloud IP addresses (AWS/GCP) that change over time.');
      console.error('\n▶ REQUIRED FIX IN MONGODB ATLAS:');
      console.error('  1. Go to: https://cloud.mongodb.com/v2/6acc08ed7cc765b497d87a41#/security/network/accessList');
      console.error('  2. Click "Add IP Address"');
      console.error('  3. Select "Allow Access From Anywhere" (0.0.0.0/0)');
      console.error('  4. Click "Confirm" and wait 1 minute for it to become Active.');
    } else if (
      msg.includes('authentication failed') ||
      msg.includes('bad auth') ||
      err.code === 8000 ||
      err.code === 18 ||
      err.codeName === 'AtlasError' ||
      err.codeName === 'AuthenticationFailed'
    ) {
      console.error('\n▶ DIAGNOSIS: DATABASE CREDENTIALS REJECTED');
      console.error('  Atlas rejected the username or password in your DATABASE connection string.');
      console.error('  Please verify your user in Atlas Security -> Database Access.');
    } else if (err.code === 'ENOTFOUND' || msg.includes('querysrv enotfound')) {
      console.error('\n▶ DIAGNOSIS: DNS RESOLUTION FAILURE');
      console.error(`  Unable to resolve DNS for cluster host: ${hostInfo}.`);
    }

    if (hostInfo && hostInfo.includes('o3narw1')) {
      console.error('\n⚠️ NOTICE: Host "cluster0.o3narw1.mongodb.net" is being used.');
      console.error('  The populated campus database was configured on "cluster0.lmgftc8.mongodb.net".');
      console.error('  If o3narw1 is an empty or alternate cluster, ensure it has matching credentials and collections.');
    }

    console.error('='.repeat(68) + '\n');
    throw new Error(`Database Connection Failed: ${err.message}`);
  }
}

async function runActiveDiagnostics(host) {
  const dns = require('dns').promises;
  const net = require('net');
  const tls = require('tls');

  console.error('\n--- ACTIVE RUNTIME DIAGNOSTIC PROBE ---');
  let targetNode = host;

  // 1. DNS Probe
  try {
    if (host.includes('mongodb.net')) {
      const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${host}`);
      if (srvRecords && srvRecords.length > 0) {
        targetNode = srvRecords[0].name;
        console.error(`[1. DNS / SRV]:   SUCCESS (${srvRecords.length} nodes resolved, primary test node: ${targetNode})`);
      }
    } else {
      await dns.lookup(host);
      console.error(`[1. DNS LOOKUP]: SUCCESS (resolved ${host})`);
    }
  } catch (dnsErr) {
    console.error(`[1. DNS / SRV]:   FAILED (${dnsErr.message})`);
    return;
  }

  // 2. TCP Port 27017 Socket Probe
  const tcpResult = await new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(4000);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ success: true });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'ETIMEDOUT: Port 27017 connection timed out (firewall drop)' });
    });
    socket.on('error', (e) => {
      socket.destroy();
      resolve({ success: false, error: `${e.code || 'ERR'}: ${e.message}` });
    });
    socket.connect(27017, targetNode);
  });

  if (tcpResult.success) {
    console.error(`[2. TCP PORT 27017]: SUCCESS (socket connected to ${targetNode}:27017)`);
  } else {
    console.error(`[2. TCP PORT 27017]: FAILED (${tcpResult.error})`);
    console.error('    => ROOT CAUSE CONFIRMED: Atlas firewall is dropping TCP packets from this host.');
    return;
  }

  // 3. TLS Handshake Probe
  const tlsResult = await new Promise((resolve) => {
    const socket = tls.connect({
      host: targetNode,
      port: 27017,
      servername: targetNode,
      timeout: 4000,
      rejectUnauthorized: true,
    });
    socket.on('secureConnect', () => {
      socket.destroy();
      resolve({ success: true });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'TLS handshake timed out' });
    });
    socket.on('error', (e) => {
      socket.destroy();
      resolve({ success: false, error: `${e.code || 'ERR'}: ${e.message}` });
    });
  });

  if (tlsResult.success) {
    console.error(`[3. TLS HANDSHAKE]: SUCCESS (TLS encryption established)`);
  } else {
    console.error(`[3. TLS HANDSHAKE]: FAILED (${tlsResult.error})`);
    if (tlsResult.error && tlsResult.error.includes('ALERT_INTERNAL_ERROR')) {
      console.error('    => ATLAS TLS ALERT 80 (Internal Error):');
      console.error('       Atlas SNI proxies emit Alert 80 when the source IP is rejected by');
      console.error('       the cluster\'s Network Access allowlist, or if the cluster is provisioning/inactive.');
    }
  }
}

module.exports = connectDB;
