'use strict';

/**
 * Study pages: the resource file, the outcome-to-level mapping, and the
 * /api/study routes. The database models are replaced with in-memory stubs;
 * the outcome still comes from the real compiler (ALPC_BIN, or alpc in the repo root).
 */

const assert = require('assert');
const http = require('http');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (_) { /* plain environment variables only */ }

const resources = require('../services/studyResources');
const { SKILLS } = require('../seed');

// Hosts every link was checked on. A new host means a new link to check by hand.
const CHECKED_HOSTS = new Set([
  'www.youtube.com', 'www.programiz.com', 'cp-algorithms.com', 'www.geeksforgeeks.org',
  'visualgo.net', 'www.cs.usfca.edu', 'leetcode.com',
]);

let passed = 0;
let failed = 0;
async function runTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok    ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}

// ── Stubs for the Mongoose models the study routes touch ─────────────────────
function query(value) {
  const q = { sort: () => q, select: () => q, limit: () => q, then: (ok, bad) => Promise.resolve(value).then(ok, bad) };
  return q;
}

const db = { mastery: [], decisions: [], progress: [] };
const Mastery = require('../models/Mastery');
const CompilerDecision = require('../models/CompilerDecision');
const StudyProgress = require('../models/StudyProgress');

Mastery.findOne = f => query(db.mastery.find(m => m.skill === f.skill) || null);
Mastery.find = () => query(db.mastery);
CompilerDecision.findOne = f => query(
  [...db.decisions].filter(d => d.skill === f.skill).sort((a, b) => b.createdAt - a.createdAt)[0] || null);
CompilerDecision.create = async doc => {
  const saved = { ...doc, _id: `d${db.decisions.length + 1}`, createdAt: new Date() };
  db.decisions.push(saved);
  return saved;
};
CompilerDecision.aggregate = async () => [];
StudyProgress.find = f => query(db.progress.filter(p => !f.skill || p.skill === f.skill));
StudyProgress.findOneAndUpdate = async f => {
  let row = db.progress.find(p => p.skill === f.skill && p.resourceId === f.resourceId);
  if (!row) { row = { ...f, doneAt: new Date() }; db.progress.push(row); }
  return row;
};
StudyProgress.deleteOne = async f => {
  db.progress = db.progress.filter(p => !(p.skill === f.skill && p.resourceId === f.resourceId));
};

function call(server, method, url, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1', port: server.address().port, method, path: url,
      headers: { Authorization: `Bearer ${token}` },
    }, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\nStudy resources\n');
  const data = resources.load();

  await runTest('resources.json has no problems', () => {
    assert.deepStrictEqual(resources.problemsIn(data), []);
  });

  await runTest('every quiz topic has a study page', () => {
    for (const s of SKILLS) assert(resources.forTopic(s), `no resources for ${s}`);
  });

  await runTest('every link is on a host the links were checked on', () => {
    for (const [topic, list] of Object.entries(data.topics)) {
      for (const r of list) assert(CHECKED_HOSTS.has(new URL(r.url).host), `${topic}: ${r.url}`);
    }
  });

  await runTest('each default outcome picks at least one resource on every page', () => {
    for (const outcome of ['remedial', 'practice', 'core', 'advanced']) {
      for (const s of SKILLS) {
        assert(resources.select(s, outcome).chosen.length > 0, `${s} / ${outcome}`);
      }
    }
  });

  await runTest('remedial chooses introductions only; advanced never does', () => {
    for (const s of SKILLS) {
      assert(resources.select(s, 'remedial').chosen.every(r => r.level === 'intro'));
      assert(resources.select(s, 'advanced').chosen.every(r => r.level !== 'intro'));
    }
  });

  await runTest('chosen resources follow the order of the levels', () => {
    const { levels, chosen } = resources.select('Trees', 'core');
    const ranks = chosen.map(r => levels.indexOf(r.level));
    assert.deepStrictEqual(ranks, [...ranks].sort((a, b) => a - b));
  });

  await runTest('an unknown or missing outcome chooses nothing and shows everything', () => {
    for (const outcome of [null, 'mystery']) {
      const r = resources.select('Graphs', outcome);
      assert.strictEqual(r.levels, null);
      assert.strictEqual(r.chosen.length, 0);
      assert.strictEqual(r.others.length, resources.forTopic('Graphs').length);
    }
  });

  await runTest('problemsIn names bad levels, types, urls and repeated ids', () => {
    const bad = { levelsForOutcome: { x: ['nope'] }, topics: { T: [
      { id: 'a', level: 'intro', type: 'video', title: 't', url: 'http://x' },
      { id: 'a', level: 'expert', type: 'podcast', title: 't', url: 'https://x' },
    ] } };
    const p = resources.problemsIn(bad).join(' | ');
    for (const s of ['unknown level "nope"', 'https url', 'repeats id "a"', 'unknown level "expert"', 'unknown type "podcast"']) {
      assert(p.includes(s), p);
    }
  });

  const alpcBin = process.env.ALPC_BIN || path.join(__dirname, '..', '..', '..',
    process.platform === 'win32' ? 'alpc.exe' : 'alpc');
  if (!require('fs').existsSync(alpcBin)) {
    console.log(`\n  - skipped the route tests (compiler not found at ${alpcBin})`);
  } else {
    console.log('\nStudy routes (stubbed database, real compiler)\n');
    const express = require('express');
    const { signToken } = require('../middleware/auth');
    const app = express();
    app.use('/api/study', require('../routes/study'));
    const server = app.listen(0);
    const token = signToken({ _id: '64b000000000000000000001', email: 'a@b.c', name: 'A' });

    try {
      await runTest('a weak topic compiles to remedial and shows introductions', async () => {
        db.mastery = [{ skill: 'Dynamic Programming', masteryScore: 0.12, updatedAt: new Date() }];
        const r = await call(server, 'GET', '/api/study/Dynamic%20Programming', token);
        assert.strictEqual(r.status, 200, JSON.stringify(r.body));
        assert.strictEqual(r.body.decision.outcome, 'remedial');
        assert.strictEqual(r.body.decision.reused, false);
        assert.deepStrictEqual(r.body.levels, ['intro']);
        assert(r.body.chosen.length > 0 && r.body.chosen.every(x => x.level === 'intro'));
        assert.strictEqual(db.decisions.length, 1);
      });

      await runTest('the same decision is reused while mastery is unchanged', async () => {
        const r = await call(server, 'GET', '/api/study/Dynamic%20Programming', token);
        assert.strictEqual(r.body.decision.reused, true);
        assert.strictEqual(db.decisions.length, 1);
      });

      await runTest('a mastery change compiles a new decision', async () => {
        await new Promise(r => setTimeout(r, 5));
        db.mastery = [{ skill: 'Dynamic Programming', masteryScore: 0.9, updatedAt: new Date() }];
        const r = await call(server, 'GET', '/api/study/Dynamic%20Programming', token);
        assert.strictEqual(r.body.decision.reused, false);
        assert.strictEqual(r.body.decision.outcome, 'advanced');
        assert.deepStrictEqual(r.body.levels, ['core', 'advanced']);
        assert.strictEqual(db.decisions.length, 2);
      });

      await runTest('mark and unmark a resource as done', async () => {
        const id = resources.forTopic('Dynamic Programming').find(x => x.level === 'core').id;
        const put = await call(server, 'PUT', `/api/study/Dynamic%20Programming/done/${id}`, token);
        assert.strictEqual(put.status, 200);
        assert(put.body.doneAt);
        const page = await call(server, 'GET', '/api/study/Dynamic%20Programming', token);
        assert(page.body.chosen.find(x => x.id === id).doneAt);
        await call(server, 'DELETE', `/api/study/Dynamic%20Programming/done/${id}`, token);
        assert.strictEqual(db.progress.length, 0);
      });

      await runTest('unknown topics and resources are 404s', async () => {
        assert.strictEqual((await call(server, 'GET', '/api/study/Cooking', token)).status, 404);
        assert.strictEqual((await call(server, 'PUT', '/api/study/Graphs/done/nope', token)).status, 404);
      });

      await runTest('the routes need a signed-in user', async () => {
        assert.strictEqual((await call(server, 'GET', '/api/study/Graphs', 'bad')).status, 401);
      });
    } finally {
      server.close();
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
