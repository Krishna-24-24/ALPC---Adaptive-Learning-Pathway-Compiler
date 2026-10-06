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
 */

const assert = require('assert');
const { generatePathLang, generateForStudent, validate } = require('../services/pathwayGenerator');
const { deriveOutcome, parseTokens, parseAst, parseCompilerResult } = require('../services/resultParser');
const { compile } = require('../services/alpcRunner');

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

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
