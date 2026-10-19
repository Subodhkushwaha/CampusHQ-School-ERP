#!/usr/bin/env node
/**
 * CampusHQ School ERP - Safe MongoDB Diagnostic Tool
 * 
 * Tests MongoDB connectivity, parses connection details safely, checks DNS,
 * and categorizes errors without printing any secrets or credentials.
 */

const path = require('path');
const dns = require('dns').promises;
const mongoose = require('mongoose');

// Load environment files
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
require('dotenv').config({ path: '.env' });

function maskUri(uri) {
  if (!uri) return 'NOT_SET';
  try {
    return uri.replace(/\/\/([^:@]+):([^@]+)@/, '//****:****@');
  } catch {
    return '***[MASKED]***';
  }
}

function parseUriSafely(uri) {
  if (!uri) return null;
  try {
    const match = uri.match(/^([a-z0-9+]+):\/\/([^:@]+):([^@]+)@([^\/?#]+)(?:\/([^?#]*))?(?:\?(.*))?$/i);
    if (!match) {
      // Non-auth or standard URI format
      const simpleMatch = uri.match(/^([a-z0-9+]+):\/\/([^\/?#]+)(?:\/([^?#]*))?(?:\?(.*))?$/i);
      if (simpleMatch) {
        return {
          protocol: simpleMatch[1],
          hasAuth: false,
          host: simpleMatch[2],
          database: simpleMatch[3] || null,
          query: simpleMatch[4] || '',
        };
      }
      return null;
    }
    return {
      protocol: match[1],
      hasAuth: true,
      hasUsername: !!match[2],
      hasPassword: !!match[3],
      host: match[4],
      database: match[5] || null,
      query: match[6] || '',
    };
  } catch (err) {
    return null;
  }
}

async function runDiagnostic() {
  console.log('='.repeat(65));
  console.log(' CampusHQ School ERP - MongoDB Atlas Connectivity Diagnostic');
  console.log('='.repeat(65));

  // 1. Detect Variable Name
  const varNames = ['DATABASE', 'MONGODB_URI', 'MONGO_URI', 'DATABASE_URL'];
  let detectedVar = null;
  let rawUri = null;

  for (const name of varNames) {
    if (process.env[name]) {
      detectedVar = name;
      rawUri = process.env[name].trim();
      break;
    }
  }

  if (!detectedVar || !rawUri) {
    console.error('\n❌ ERROR: No MongoDB connection string found in environment variables.');
    console.error('   Checked: DATABASE, MONGODB_URI, MONGO_URI, DATABASE_URL');
    console.error('   Action: Set DATABASE (or MONGODB_URI) in backend/.env or Railway Service Variables.');
    process.exit(1);
  }

  console.log(`\n[1] Environment Variable Detected: '${detectedVar}'`);

  // 2. Parse URI Safely
  const parsed = parseUriSafely(rawUri);
  if (!parsed) {
    console.error('\n❌ ERROR: Connection string appears malformed or could not be parsed.');
    console.error(`   Sanitized URI: ${maskUri(rawUri)}`);
    process.exit(1);
  }

  console.log('\n[2] Connection Parameters (Sanitized):');
  console.log(`   - Protocol:        ${parsed.protocol}`);
  console.log(`   - Host:            ${parsed.host}`);
  console.log(`   - Authentication:  ${parsed.hasAuth ? 'Configured (User & Password present)' : 'None'}`);
  console.log(`   - Target Database: ${parsed.database ? parsed.database : '⚠️ NOT SPECIFIED (will default to "test")'}`);
  console.log(`   - Query Params:    ${parsed.query || 'none'}`);
  console.log(`   - Sanitized URI:   ${maskUri(rawUri)}`);

  // Verification checks on parsed values
  if (!parsed.database || parsed.database.trim() === '') {
    console.warn('\n⚠️ WARNING: No database name was specified in the connection string path!');
    console.warn('   Defaulting to "test" database. CampusHQ expects "/campushq".');
    console.warn('   Recommended fix: Append "/campushq" before the query params (e.g. mongodb.net/campushq?...)');
  } else if (parsed.database.toLowerCase() !== 'campushq') {
    console.warn(`\n⚠️ NOTE: Target database is '${parsed.database}'. Expected database name is 'campushq'.`);
  } else {
    console.log('   ✅ Target database matches expected: "campushq"');
  }

  // 3. DNS Lookup
  console.log('\n[3] Testing DNS Resolution for Host...');
  try {
    if (parsed.protocol === 'mongodb+srv') {
      const srvHost = `_mongodb._tcp.${parsed.host}`;
      console.log(`   - Resolving SRV records for: ${srvHost}`);
      const srvRecords = await dns.resolveSrv(srvHost);
      console.log(`   ✅ DNS SRV Resolution Successful: Found ${srvRecords.length} replica node(s).`);
      srvRecords.slice(0, 3).forEach((r, idx) => {
        console.log(`      Node ${idx + 1}: ${r.name}:${r.port}`);
      });
    } else {
      const addresses = await dns.lookup(parsed.host);
      console.log(`   ✅ DNS Host Resolution Successful: IP ${addresses.address}`);
    }
  } catch (dnsErr) {
    console.error(`   ❌ DNS Resolution Failed: ${dnsErr.message}`);
    console.error('      Verify your Atlas cluster hostname or check your DNS / internet configuration.');
  }

  // 3b. Low-Level TCP Port 27017 and TLS Probe
  console.log('\n[3b] Testing Direct TCP & TLS Handshake (Port 27017)...');
  const net = require('net');
  const tls = require('tls');
  let testNode = parsed.host;
  try {
    if (parsed.protocol === 'mongodb+srv') {
      const srvRecs = await dns.resolveSrv(`_mongodb._tcp.${parsed.host}`);
      if (srvRecs.length > 0) testNode = srvRecs[0].name;
    }
  } catch (_) {}

  const tcpCheck = await new Promise((res) => {
    const s = new net.Socket();
    s.setTimeout(4000);
    s.on('connect', () => { s.destroy(); res({ ok: true }); });
    s.on('timeout', () => { s.destroy(); res({ ok: false, err: 'ETIMEDOUT (firewall dropped connection)' }); });
    s.on('error', (e) => { s.destroy(); res({ ok: false, err: e.message }); });
    s.connect(27017, testNode);
  });

  if (tcpCheck.ok) {
    console.log(`   ✅ TCP Port 27017 Reachable on ${testNode}`);
    const tlsCheck = await new Promise((res) => {
      const s = tls.connect({ host: testNode, port: 27017, servername: testNode, timeout: 4000, rejectUnauthorized: true });
      s.on('secureConnect', () => { s.destroy(); res({ ok: true }); });
      s.on('timeout', () => { s.destroy(); res({ ok: false, err: 'TLS timeout' }); });
      s.on('error', (e) => { s.destroy(); res({ ok: false, err: e.message }); });
    });
    if (tlsCheck.ok) {
      console.log(`   ✅ TLS Encryption Handshake Successful (port 27017)`);
    } else {
      console.error(`   ❌ TLS Handshake Failed: ${tlsCheck.err}`);
    }
  } else {
    console.error(`   ❌ TCP Port 27017 Unreachable on ${testNode}: ${tcpCheck.err}`);
    console.error('      => Atlas firewall is dropping TCP packets from this host.');
  }

  const targetDbName = process.env.DB_NAME || (parsed.database && parsed.database.toLowerCase() !== 'test' ? parsed.database : 'campushq');
  console.log(`\n[4] Attempting Live Connection to MongoDB Cluster (database: "${targetDbName}", timeout: 10s)...`);
  const startTime = Date.now();

  try {
    await mongoose.connect(rawUri, {
      dbName: targetDbName,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    const elapsed = Date.now() - startTime;
    console.log(`   ✅ Connected successfully in ${elapsed}ms!`);

    // Verify ping
    const admin = mongoose.connection.db.admin();
    const pingResult = await admin.ping();
    console.log(`   ✅ Ping response: ${JSON.stringify(pingResult)}`);

    // Verify current DB name and list collections
    const activeDbName = mongoose.connection.db.databaseName;
    console.log(`   ✅ Active Connected Database: "${activeDbName}"`);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   ✅ Accessible Collections count: ${collections.length}`);
    if (collections.length > 0) {
      const sampleNames = collections.slice(0, 8).map((c) => c.name);
      console.log(`      Sample collections: ${sampleNames.join(', ')}`);
    }

    console.log('\n' + '='.repeat(65));
    console.log(' 🎉 DIAGNOSTIC RESULT: CONNECTION FULLY FUNCTIONAL');
    console.log('='.repeat(65));
    console.log('\nAtlas connectivity is verified and operational.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (connErr) {
    const elapsed = Date.now() - startTime;
    console.error(`\n   ❌ Connection Attempt Failed after ${elapsed}ms:`);
    console.error(`      Error Name:    ${connErr.name}`);
    console.error(`      Error Message: ${connErr.message}`);

    console.log('\n' + '='.repeat(65));
    console.log(' 🔍 ROOT CAUSE ANALYSIS & RECOMMENDED ACTION:');
    console.log('='.repeat(65));

    const msg = (connErr.message || '').toLowerCase();
    const name = connErr.name || '';

    if (
      name === 'MongoServerSelectionError' ||
      msg.includes('could not connect to any servers') ||
      msg.includes('connection timed out') ||
      msg.includes('serverselectionerror')
    ) {
      console.log('\n▶ ISSUE: FIREWALL / IP WHITELIST BLOCKED (Common on Railway & Render)');
      console.log('  The MongoDB Atlas cluster refused or timed out the connection.');
      console.log('  Cloud container platforms use dynamic IP addresses that change on deploy and restart.');
      console.log('\n  REQUIRED ACTION:');
      console.log('  1. Open MongoDB Atlas -> Security -> Network Access:');
      console.log('     https://cloud.mongodb.com/v2/6acc08ed7cc765b497d87a41#/security/network/accessList');
      console.log('  2. Click "+ Add IP Address".');
      console.log('  3. Click "Allow Access From Anywhere" (CIDR: 0.0.0.0/0).');
      console.log('  4. Click "Confirm" and wait 60 seconds for status to show "Active".');
      console.log('  5. On Railway/Render, trigger redeploy.');
    } else if (
      msg.includes('authentication failed') ||
      msg.includes('bad auth') ||
      connErr.code === 18 ||
      connErr.codeName === 'AuthenticationFailed'
    ) {
      console.log('\n▶ ISSUE: DATABASE AUTHENTICATION FAILED');
      console.log('  Username or password in the connection string was rejected by Atlas.');
      console.log('\n  REQUIRED ACTION:');
      console.log('  1. Open MongoDB Atlas -> Security -> Database Users:');
      console.log('     https://cloud.mongodb.com/v2/6acc08ed7cc765b497d87a41#/security/database/users');
      console.log('  2. Verify that the database user exists.');
      console.log('  3. If your password contains special characters (@, :, /, ?, #, %), ensure');
      console.log('     they are URL-encoded in the connection string.');
      console.log('  4. Ensure the user has "Read and write to any database" or access to "campushq".');
      console.log('  5. Update DATABASE in Render Environment variables.');
    } else if (connErr.code === 'ENOTFOUND' || msg.includes('querysrv enotfound')) {
      console.log('\n▶ ISSUE: INVALID CLUSTER HOSTNAME / DNS FAILURE');
      console.log('  The cluster hostname does not exist or DNS lookup failed.');
      console.log('\n  REQUIRED ACTION:');
      console.log('  1. Open MongoDB Atlas -> Database -> Connect -> Drivers.');
      console.log('  2. Copy the exact standard connection string.');
      console.log('  3. Verify the hostname matches Cluster0.');
    } else {
      console.log('\n▶ UNCLASSIFIED ERROR:');
      console.log(`  ${connErr.message}`);
    }

    process.exit(1);
  }
}

runDiagnostic();
