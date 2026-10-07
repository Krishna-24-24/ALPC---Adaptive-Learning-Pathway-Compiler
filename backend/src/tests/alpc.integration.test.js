'use strict';

/**
 * ALPC + LearnSmart integration tests (PRD section 33).
 *
 * Every outcome below is read from what the compiled program prints when lli
 * runs it. Nothing re-evaluates the rules in JavaScript.
 *
 *   Test 1  score 40 -> remedial          Test 5  Backward Design violation -> semantic error
 *   Test 2  score 65 -> practice          Test 6  malformed Path-Lang -> syntax error
 *   Test 3  score 90 -> advanced          Test 7  execution failure is reported, nothing is guessed
 *   Test 4  undeclared outcome -> compiler error
 *
 * The end-to-end tests need the compiler (ALPC_BIN) and lli (LLI_BIN), read from
 * backend/.env like the server does. They are skipped when ALPC_BIN is missing.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (_) { /* dotenv not installed: plain environment variables only */ }

const { generatePathLang, generateForStudent, validate } = require('../services/pathwayGenerator');
const { compile, check, parseRunOutput } = require('../services/alpcRunner');

let passed = 0;
let failed = 0;
let skipped = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✗\x1b[0m ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const stageOf = (res, id) => res.stages.find(s => s.id === id);

async function main() {
  console.log('\n ALPC + LearnSmart integration tests\n');

  // ── Unit: no compiler needed ───────────────────────────────────────────────
  await runTest('Generator writes every OUTCOME before any SET or IF (Backward Design)', () => {
    const src = generatePathLang({
      outcomes: [{ name: 'remedial', adjustment: 0 }, { name: 'core', adjustment: 0 }],
      variables: { performance: 62 },
      rules: [{ variable: 'performance', operator: '<', value: 50, outcome: 'remedial' }],
    });
    const lastOutcome = src.lastIndexOf('OUTCOME');
    assert(lastOutcome < src.indexOf('SET'), 'OUTCOME must precede SET');
    assert(lastOutcome < src.indexOf('IF'), 'OUTCOME must precede IF');
  });

  await runTest('Pathway validation rejects a rule targeting an undeclared outcome', () => {
    const errors = validate([{ name: 'core', adjustment: 0 }], [
      { variable: 'performance', operator: '<', value: 50, outcome: 'unknown_path' },
    ]);
    assert(errors.length === 1 && errors[0].includes('unknown_path'), `got ${JSON.stringify(errors)}`);
  });

  await runTest('Run output: score line, then the outcome line the program printed', () => {
    assert.deepStrictEqual(parseRunOutput('10\noutcome core\n', false),
      { alignmentScore: 10, binaryOutput: null, outcome: 'core', reportedOutcome: true });
    assert.deepStrictEqual(parseRunOutput('1010\r\noutcome remedial\r\n', true),
      { alignmentScore: 10, binaryOutput: '1010', outcome: 'remedial', reportedOutcome: true });
    assert.strictEqual(parseRunOutput('0\noutcome none\n', false).outcome, null);
    assert.strictEqual(parseRunOutput('42\n', false).reportedOutcome, false, 'old binaries must not look successful');
  });

  // ── End to end: real compiler and lli ──────────────────────────────────────
  const alpcBin = process.env.ALPC_BIN || path.join(__dirname, '..', '..', '..',
    process.platform === 'win32' ? 'alpc.exe' : 'alpc');
  if (!fs.existsSync(alpcBin)) {
    console.log(`  - skipped the end-to-end tests (compiler not found at ${alpcBin})`);
    skipped = 1;
  } else {
    for (const [n, score, expected] of [[1, 40, 'remedial'], [2, 65, 'practice'], [3, 90, 'advanced']]) {
      await runTest(`Test ${n}: student score ${score} -> ${expected}, as reported by the compiled program`, async () => {
        const src = generateForStudent({ studentData: { performance: score, mastery: 0.5 } });
        const res = await compile(src);
        assert.strictEqual(res.success, true, `compile failed: ${res.diagnostics.map(d => d.message).join('; ')}`);
        assert.strictEqual(res.outcome, expected, `program reported ${res.outcome}`);
        assert(/outcome \w+/.test(stageOf(res, 'run').stdout), 'lli output must name the outcome');
      });
    }

    await runTest('Test 4: an undeclared outcome is rejected with line and column, and nothing runs', async () => {
      const res = await compile('OUTCOME core;\nSET performance = 70;\nIF performance < 50 GOTO unknown;\n');
      assert.strictEqual(res.success, false);
      const d = res.diagnostics.find(x => x.code === 'unknown-outcome');
      assert(d && d.line === 3 && d.col === 26, `diagnostics: ${JSON.stringify(res.diagnostics)}`);
      assert.strictEqual(stageOf(res, 'run').status, 'skipped');
    });

    await runTest('Test 5: an outcome declared after its rule is a Backward Design violation', async () => {
      const res = await compile('SET performance = 40;\nIF performance < 70 GOTO remedial;\nOUTCOME remedial;\n');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.backwardDesign, false);
      assert(res.diagnostics.some(d => d.code === 'backward-design' && d.kind === 'semantic'), JSON.stringify(res.diagnostics));
      assert.strictEqual(stageOf(res, 'parse').status, 'error');
    });

    await runTest('Test 6: malformed Path-Lang is a syntax error at the right position', async () => {
      const res = await compile('OUTCOME a;\nSET x = 1\nIF x > 0 GOTO a;\n');
      const d = res.diagnostics.find(x => x.kind === 'syntax');
      assert(d && d.line === 3 && d.col === 1, JSON.stringify(res.diagnostics));
      assert.strictEqual(stageOf(res, 'ir').status, 'skipped');
    });

    await runTest('Test 7: when execution fails the outcome stays empty instead of being guessed', () => {
      // Fresh process with an lli that does not exist.
      const script = `require(${JSON.stringify(path.join(__dirname, '..', 'services', 'alpcRunner'))})
        .compile('OUTCOME a;\\nSET x = 1;\\nIF x > 0 GOTO a;\\n').then(r => process.stdout.write(JSON.stringify(r)))`;
      const out = JSON.parse(execFileSync(process.execPath, ['-e', script], {
        env: { ...process.env, LLI_BIN: 'definitely-not-lli', ALPC_BIN: alpcBin },
      }).toString());
      assert.strictEqual(out.success, false);
      assert.strictEqual(out.outcome, null);
      assert(/LLVM interpreter not found/.test(out.stages.find(s => s.id === 'run').stderr));
    });

    await runTest('Alignment score comes from execution (state += 15, decimal and ; b)', async () => {
      const base = 'OUTCOME core;\nSET performance = 72;\nSET state = 0;\nSET state += 15;\nIF performance >= 50 GOTO core';
      const dec = await compile(base + ';\n');
      assert.strictEqual(dec.alignmentScore, 15);
      assert.strictEqual(dec.binaryOutput, null);
      const bin = await compile(base + '; b\n');
      assert.strictEqual(bin.binaryOutput, '1111');
      assert.strictEqual(bin.alignmentScore, 15);
      assert.strictEqual(bin.outcome, 'core');
    });

    await runTest('No rule holds: the program reports no outcome', async () => {
      const res = await compile('OUTCOME a;\nSET x = 1;\nIF x > 5 GOTO a;\n');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.outcome, null);
    });

    await runTest('check() returns located diagnostics without running the program', async () => {
      const res = await check('OUTCOME a;\nSET x = 1;\nIF x ! 1 GOTO a;\n');
      assert.strictEqual(res.success, false);
      assert(res.diagnostics.some(d => d.line === 3 && d.col === 6 && d.kind === 'lexical'), JSON.stringify(res.diagnostics));
      assert.strictEqual(res.stages && res.stages.codegen, 'skipped');
    });
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed${skipped ? ', end-to-end skipped' : ''}.\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
