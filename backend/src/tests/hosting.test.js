'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');
const { hostingConfig } = require('../config/hosting');
const { rateLimit } = require('../middleware/rateLimit');

test('production requires an exact frontend origin', () => {
  for (const origin of ['', '*', 'https://app.example/', 'https://app.example/path', 'null']) {
    assert.throws(() => hostingConfig({ NODE_ENV: 'production', FRONTEND_URL: origin }));
  }
  assert.equal(hostingConfig({ FRONTEND_URL: 'https://app.example' }).origin, 'https://app.example');
  assert.equal(hostingConfig({}).origin, 'http://localhost:3000');
});

test('proxy trust is explicit, defaults off, and rejects invalid values', () => {
  assert.equal(hostingConfig({}).trustProxy, 0);
  assert.equal(hostingConfig({ TRUST_PROXY_HOPS: '1' }).trustProxy, 1);
  for (const value of ['true', '-1', '1.5', 'NaN']) {
    assert.throws(() => hostingConfig({ TRUST_PROXY_HOPS: value }));
  }
});

test('one trusted proxy separates visitors and ignores spoofed leftmost IPs', async () => {
  const app = express();
  const config = hostingConfig({ FRONTEND_URL: 'https://app.example', TRUST_PROXY_HOPS: '1' });
  app.set('trust proxy', config.trustProxy);
  app.use(cors({ origin: config.origin, credentials: true }));
  app.use(rateLimit({ windowMs: 60000, max: 1, name: 'test' }));
  app.get('/', (req, res) => res.json({ ip: req.ip }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const first = await fetch(url, { headers: { 'X-Forwarded-For': '198.51.100.1', Origin: 'https://app.example' } });
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('access-control-allow-origin'), 'https://app.example');
    assert.equal((await first.json()).ip, '198.51.100.1');
    assert.equal((await fetch(url, { headers: { 'X-Forwarded-For': '198.51.100.2' } })).status, 200);
    const spoof = await fetch(url, { headers: { 'X-Forwarded-For': '203.0.113.99, 198.51.100.1' } });
    assert.equal(spoof.status, 429);
    assert.ok(spoof.headers.get('retry-after'));
    const disallowed = await fetch(url, { headers: { 'X-Forwarded-For': '198.51.100.3', Origin: 'https://other.example' } });
    assert.notEqual(disallowed.headers.get('access-control-allow-origin'), 'https://other.example');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('ML client uses the public Render hostname and configurable cold-start timeout', () => {
  const axios = require('axios');
  const create = axios.create;
  const original = { ...process.env };
  const modulePath = require.resolve('../services/mlService');
  let config;
  axios.create = options => {
    config = options;
    return { interceptors: { response: { use() {} } } };
  };
  function load() { delete require.cache[modulePath]; require(modulePath); }
  try {
    delete process.env.ML_SERVICE_URL;
    process.env.ML_SERVICE_HOST = 'example-ml.onrender.com';
    process.env.ML_TIMEOUT_MS = '120000';
    load();
    assert.equal(config.baseURL, 'https://example-ml.onrender.com');
    assert.equal(config.timeout, 120000);
    process.env.ML_SERVICE_URL = 'http://localhost:8000';
    load();
    assert.equal(config.baseURL, 'http://localhost:8000');
    process.env.ML_TIMEOUT_MS = '-1';
    assert.throws(load, /positive integer/);
  } finally {
    axios.create = create;
    process.env = original;
    delete require.cache[modulePath];
  }
});
