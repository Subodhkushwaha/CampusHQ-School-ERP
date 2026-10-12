require('module-alias/register');
const { describe, it } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const { globSync } = require('glob');

// Set minimal env vars before requiring app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_value_for_unit_tests';
process.env.FRONTEND_URL = 'https://campus-hq-school-erp.vercel.app';

// Load models before app
const modelsFiles = globSync(path.join(__dirname, '../src/models/**/*.js').replace(/\\/g, '/'));
for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

const app = require('../src/app');

function makeRequest(server, options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path || '/',
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (_) {
          parsed = rawData;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

describe('Backend Endpoints & CORS Integration', () => {
  let server;

  it('starts the Express HTTP test listener', (t, done) => {
    server = app.listen(0, '127.0.0.1', () => {
      done();
    });
  });

  it('GET / returns 200 with API status and health link', async () => {
    const res = await makeRequest(server, { path: '/' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'running');
    assert.strictEqual(res.body.health, '/api/health');
  });

  it('GET /api/health and /health report system status', async () => {
    const res1 = await makeRequest(server, { path: '/api/health' });
    assert.ok(res1.statusCode === 200 || res1.statusCode === 503);
    assert.ok(res1.body.status === 'ok' || res1.body.status === 'degraded');
    assert.ok('database' in res1.body);

    const res2 = await makeRequest(server, { path: '/health' });
    assert.strictEqual(res2.statusCode, res1.statusCode);
  });

  it('GET /nonexistent-route returns 404 with proper message', async () => {
    const res = await makeRequest(server, { path: '/nonexistent-route' });
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Requested API endpoint does not exist');
  });

  it('GET /api/unknown without token returns 401 unauthorized immediately', async () => {
    const res = await makeRequest(server, { path: '/api/unknown' });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.jwtExpired, true);
  });

  it('CORS allows requests from production Vercel frontend origin', async () => {
    const res = await makeRequest(server, {
      path: '/api/health',
      headers: { Origin: 'https://campus-hq-school-erp.vercel.app' },
    });
    assert.strictEqual(
      res.headers['access-control-allow-origin'],
      'https://campus-hq-school-erp.vercel.app'
    );
  });

  it('CORS allows preview deployment Vercel origins', async () => {
    const res = await makeRequest(server, {
      path: '/api/health',
      headers: { Origin: 'https://campus-hq-preview-branch-1.vercel.app' },
    });
    assert.strictEqual(
      res.headers['access-control-allow-origin'],
      'https://campus-hq-preview-branch-1.vercel.app'
    );
  });

  it('CORS rejects unauthorized origin cleanly without 500 error', async () => {
    const res = await makeRequest(server, {
      path: '/api/health',
      headers: { Origin: 'https://unauthorized-malicious-site.example.com' },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 503);
    assert.strictEqual(res.headers['access-control-allow-origin'], undefined);
  });

  it('OPTIONS preflight request responds with 200 and allowed methods', async () => {
    const res = await makeRequest(server, {
      path: '/api/login',
      method: 'OPTIONS',
      headers: {
        Origin: 'https://campus-hq-school-erp.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(
      res.headers['access-control-allow-origin'],
      'https://campus-hq-school-erp.vercel.app'
    );
    assert.ok(res.headers['access-control-allow-methods'].includes('POST'));
  });

  it('POST /api/login rejects empty body with 400 validation error', async () => {
    const res = await makeRequest(
      server,
      {
        path: '/api/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://campus-hq-school-erp.vercel.app',
        },
      },
      {}
    );
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  it('closes HTTP test listener', (t, done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });
});
