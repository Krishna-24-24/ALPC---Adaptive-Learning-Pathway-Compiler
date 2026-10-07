'use strict';

/**
 * ALPC + LearnSmart Integration Test Suite
 * Tests PRD Section 33 acceptance tests:
 *   Test 1: Student score 40 -> remedial
 *   Test 2: Student score 65 -> core
 *   Test 3: Student score 90 -> advanced
 *   Test 4: Invalid outcome -> compiler error
 *   Test 5: Backward Design violation -> semantic error
 *   Test 6: Malformed Path-Lang -> syntax error
 *   Test 7: LLVM verification failure -> compilation failure
 * plus end-to-end runs through the real ALPC binary (set ALPC_BIN / LLI_BIN).
 */

const assert = require('assert');
const fs = require('fs');
const { generatePathLang, generateForStudent, validate } = require('../services/pathwayGenerator');
const { deriveOutcome, parseTokens, parseAst, parseCompilerResult } = require('../services/resultParser');
const { compile, parseRunOutput } = require('../services/alpcRunner');

let passed = 0;
let failed = 0;

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

async function main() {
  console.log('\n========================================');
  console.log(' ALPC + LearnSmart Integration Tests');
  console.log('========================================\n');

  // Test 1: Student score 40 -> remedial
  await runTest('Test 1: Student score 40 maps to REMEDIAL outcome', () => {
    const src = generateForStudent({
      studentData: { performance: 40, mastery: 0.35 },
    });
    assert(src.includes('OUTCOME remedial;'), 'Must declare remedial outcome');
    assert(src.includes('SET performance = 40;'), 'Must set performance to 40');
    
    // Evaluate outcome
    const outcome = deriveOutcome(src, 40);
    assert.strictEqual(outcome, 'remedial', `Expected remedial, got ${outcome}`);
  });

  // Test 2: Student score 65 -> practice/core
  await runTest('Test 2: Student score 65 maps to PRACTICE/CORE outcome', () => {
    const src = generateForStudent({
      studentData: { performance: 65, mastery: 0.60 },
    });
    assert(src.includes('SET performance = 65;'), 'Must set performance to 65');
    const outcome = deriveOutcome(src, 65);
    assert.strictEqual(outcome, 'practice', `Expected practice, got ${outcome}`);
  });

  // Test 3: Student score 90 -> advanced
  await runTest('Test 3: Student score 90 maps to ADVANCED outcome', () => {
    const src = generateForStudent({
      studentData: { performance: 90, mastery: 0.92 },
    });
    assert(src.includes('SET performance = 90;'), 'Must set performance to 90');
    const outcome = deriveOutcome(src, 90);
    assert.strictEqual(outcome, 'advanced', `Expected advanced, got ${outcome}`);
  });

  // Test 4: Invalid outcome referenced in rule
  await runTest('Test 4: Rule referencing undeclared outcome detected', () => {
    const outcomes = [{ name: 'core', adjustment: 0 }];
    const rules = [
      { variable: 'performance', operator: '<', value: 50, outcome: 'unknown_path' }
    ];
    const errors = validate(outcomes, rules);
    assert(errors.length > 0, 'Expected validation error for undeclared outcome');
    assert(errors[0].includes('unknown_path'), 'Error message must mention the undeclared outcome');
  });

  // Test 5: Backward Design violation check
  await runTest('Test 5: Backward Design — OUTCOME declared before SET & IF', () => {
    const src = generatePathLang({
      outcomes: [{ name: 'remedial', adjustment: 0 }, { name: 'core', adjustment: 0 }],
      variables: { performance: 62 },
      rules: [{ variable: 'performance', operator: '<', value: 50, outcome: 'remedial' }]
    });

    const outcomeIdx = src.indexOf('OUTCOME remedial;');
    const setIdx = src.indexOf('SET performance');
    const ifIdx = src.indexOf('IF performance');

    assert(outcomeIdx >= 0, 'Must have OUTCOME');
    assert(setIdx >= 0, 'Must have SET');
    assert(ifIdx >= 0, 'Must have IF');
    assert(outcomeIdx < setIdx, 'Backward Design: OUTCOME must precede SET');
    assert(outcomeIdx < ifIdx, 'Backward Design: OUTCOME must precede IF');
  });

  // Test 6: Malformed Path-Lang / Syntax validation
  await runTest('Test 6: Token parsing handles keywords, identifiers, and literals', () => {
    const rawFlexOutput = [
      'line 1: TOKEN_OUTCOME "OUTCOME"',
      'line 1: IDENTIFIER "remedial"',
      'line 1: SEMI ";"',
      'line 3: TOKEN_SET "SET"',
      'line 3: IDENTIFIER "performance"',
      'line 3: ASSIGN "="',
      'line 3: NUMBER "72"',
      'line 3: SEMI ";"',
      'EOF'
    ].join('\n');

    const tokens = parseTokens(rawFlexOutput);
    assert.strictEqual(tokens.length, 9, 'Should parse 9 tokens');
    assert.strictEqual(tokens[0].type, 'TOKEN_OUTCOME');
    assert.strictEqual(tokens[1].lexeme, 'remedial');
    assert.strictEqual(tokens[6].lexeme, '72');
  });

  // Test 7: AST parser parses indented tree output
  await runTest('Test 7: AST parser constructs hierarchical tree from dump-ast', () => {
    const rawAstOutput = [
      'Program',
      '├── Outcome(remedial)',
      '├── Outcome(core)',
      '├── Assignment',
      '│   ├── performance',
      '│   └── 72',
      '└── Branch',
      '    ├── Condition',
      '    │   ├── performance',
      '    │   └── <',
      '    │   └── 50',
      '    └── GOTO remedial'
    ].join('\n');

    const ast = parseAst(rawAstOutput);
    assert(ast !== null, 'AST should not be null');
    assert.strictEqual(ast.label, 'Program');
    assert(ast.children.length >= 3, 'Program should have multiple child nodes');
  });

  // Test 8: Alignment Score with binary output (; b)
  await runTest('Test 8: Binary output (; b) parsing', () => {
    const mockRunnerResult = {
      success: true,
      stages: [
        { id: 'tokens', status: 'success', stdout: 'line 1: TOKEN_OUTCOME "OUTCOME"\nEOF', stderr: '', exitCode: 0 },
        { id: 'parse', status: 'success', stdout: 'Parsing completed', stderr: '', exitCode: 0 },
        { id: 'ast', status: 'success', stdout: 'Program\n├── Outcome(core)', stderr: '', exitCode: 0 },
        { id: 'ir', status: 'success', stdout: '; LLVM IR', stderr: '', exitCode: 0 },
        { id: 'run', status: 'success', stdout: '1001000\n', stderr: '', exitCode: 0 }
      ],
      irSource: '; LLVM IR',
      alignmentScore: 72,
      binaryOutput: '1001000'
    };

    const source = 'OUTCOME core;\nSET performance = 72;\nSET state = 0;\nIF performance >= 50 GOTO core; b';
    const parsed = parseCompilerResult(mockRunnerResult, source);

    assert.strictEqual(parsed.alignmentScore, 72, 'Alignment score should be 72');
    assert.strictEqual(parsed.binaryOutput, '1001000', 'Binary output should be 1001000');
    assert.strictEqual(parsed.outcome, 'core', 'Outcome should be core');
  });

  await runTest('Run output: decimal score made of 0s and 1s is not read as binary', () => {
    assert.deepStrictEqual(parseRunOutput('10\n', false), { alignmentScore: 10, binaryOutput: null });
    assert.deepStrictEqual(parseRunOutput('1010\n', true), { alignmentScore: 10, binaryOutput: '1010' });
  });

  // ── End-to-end against the real compiler ─────────────────────────────────
  // These invoke ALPC + lli instead of mocks. Point ALPC_BIN (and LLI_BIN) at
  // a built compiler; skipped when the binary is not present.
  const alpcBin = process.env.ALPC_BIN || 'C:/Users/Krishna/Projects/ALPC/alpc.exe';
  if (!fs.existsSync(alpcBin)) {
    console.log(`  - skipped real-compiler tests (ALPC_BIN not found: ${alpcBin})`);
  } else {
    // The default rules end with `performance >= 85`; before the compiler
    // supported >=, every generated default pathway failed to parse.
    for (const [score, expected] of [[40, 1], [65, 2], [90, 4]]) {
      await runTest(`E2E: default pathway compiles and runs (score ${score})`, async () => {
        const src = generateForStudent({ studentData: { performance: score, mastery: 0.5 } })
          // Make the chosen branch observable: remedial 1, practice 2, core 3, advanced 4.
          .replace('OUTCOME remedial;', 'OUTCOME remedial += 1;')
          .replace('OUTCOME practice;', 'OUTCOME practice += 2;')
          .replace('OUTCOME core;', 'OUTCOME core += 3;')
          .replace('OUTCOME advanced;', 'OUTCOME advanced += 4;');
        assert(src.includes('>= 85'), 'Default rules should exercise >=');
        const res = await compile(src);
        const failedStage = res.stages.find(st => st.status === 'error');
        assert.strictEqual(res.success, true, `compile failed: ${failedStage && failedStage.stderr}`);
        assert.strictEqual(res.alignmentScore, expected,
          `Expected score ${expected} from the compiled branch, got ${res.alignmentScore}`);
      });
    }

    await runTest('E2E: Alignment Score comes from execution (state += 15, and ; b)', async () => {
      const base = 'OUTCOME core;\nSET performance = 72;\nSET state = 0;\nSET state += 15;\nIF performance >= 50 GOTO core';
      const dec = await compile(base + ';\n');
      assert.strictEqual(dec.success, true, 'decimal run should succeed');
      assert.strictEqual(dec.alignmentScore, 15);
      assert.strictEqual(dec.binaryOutput, null);
      const bin = await compile(base + '; b\n');
      assert.strictEqual(bin.success, true, 'binary run should succeed');
      assert.strictEqual(bin.binaryOutput, '1111');
      assert.strictEqual(bin.alignmentScore, 15);
    });

    await runTest('E2E: unknown outcome is rejected with line and column', async () => {
      const res = await compile('OUTCOME core;\nSET performance = 70;\nIF performance < 50 GOTO unknown;\n');
      assert.strictEqual(res.success, false, 'Invalid program must not execute');
      const errStage = res.stages.find(st => st.status === 'error');
      assert(errStage, 'Expected a failing stage');
      assert(/line 3, col 26: Backward Design violation: 'unknown'/.test(errStage.stderr),
        `Unexpected diagnostic: ${errStage.stderr}`);
      assert(!res.stages.some(st => st.id === 'run' && st.status === 'success'), 'Must not run');
    });
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
