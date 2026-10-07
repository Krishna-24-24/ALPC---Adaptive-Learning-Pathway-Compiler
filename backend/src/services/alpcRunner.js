'use strict';

// Runs the real ALPC compiler and lli, and turns their output into the shape
// the frontend uses. Nothing here re-implements compiler logic: tokens, AST,
// diagnostics and IR come from `alpc --json`, and the score and outcome come
// from the lines the compiled program prints when lli runs it.

const { execFile } = require('child_process');
const { promisify } = require('util');
const { mkdtemp, writeFile, rm } = require('fs/promises');
const { tmpdir } = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

// Default: the compiler built at the repo root (`make` / build.bat). Override
// with ALPC_BIN / LLI_BIN in backend/.env when the binaries live elsewhere.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const ALPC_BIN = process.env.ALPC_BIN
  || path.join(REPO_ROOT, process.platform === 'win32' ? 'alpc.exe' : 'alpc');
const LLI_BIN  = process.env.LLI_BIN  || 'lli';
const OPT_BIN  = process.env.OPT_BIN  || 'opt';
const MSYS_MINGW_BIN = process.env.MSYS_MINGW_BIN || 'C:/msys64/mingw64/bin';
const MSYS_USR_BIN   = process.env.MSYS_USR_BIN   || 'C:/msys64/usr/bin';

const MAX_SOURCE_BYTES = 32 * 1024;
const EXEC_TIMEOUT_MS  = 10000;
const MAX_BUFFER       = 4 * 1024 * 1024;

function buildEnv() {
  return {
    ...process.env,
    PATH: [MSYS_MINGW_BIN, MSYS_USR_BIN, process.env.PATH || ''].join(path.delimiter),
  };
}

async function runBin(bin, args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      cwd, env: buildEnv(), timeout: EXEC_TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true,
    });
    return { stdout: stdout || '', stderr: stderr || '', exitCode: 0, signal: null };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        stdout: '',
        stderr: bin === LLI_BIN
          ? `LLVM interpreter not found: "${bin}". Install LLVM (MSYS2: pacman -S mingw-w64-x86_64-llvm) or set LLI_BIN in backend/.env.`
          : `Compiler binary not found: "${bin}". Build ALPC first (make or build.bat) or set ALPC_BIN in backend/.env.`,
        exitCode: 127,
        signal: null,
      };
    }
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || 'unknown error',
      exitCode: typeof err.code === 'number' ? err.code : 1,
      signal: err.signal || (err.killed ? 'SIGTERM' : null),
    };
  }
}

/**
 * Parse what the compiled program printed:
 *   line 1  the alignment score, in decimal, or in binary when the program used `; b`
 *   line 2  "outcome <name>" or "outcome none"
 * The binary flag comes from the compiler, because a decimal score such as 10
 * also consists only of 0s and 1s.
 */
function parseRunOutput(stdout, binaryMode) {
  const lines = stdout.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  let alignmentScore = null;
  let binaryOutput = null;
  if (binaryMode && /^[01]+$/.test(first)) {
    binaryOutput = first;
    alignmentScore = parseInt(first, 2);
  } else if (/^-?\d+$/.test(first)) {
    alignmentScore = parseInt(first, 10);
  }
  const m = /^outcome (\w+)$/.exec(lines[1] || '');
  const outcome = m && m[1] !== 'none' ? m[1] : null;
  return { alignmentScore, binaryOutput, outcome, reportedOutcome: !!m };
}

const DIAG_STAGE = { lexical: 'tokens', syntax: 'parse', semantic: 'parse' };

/** `alpc --dump-ast`-style label for one AST node from the --json output. */
/** A condition tree from --json as source text: "(a < 1 OR b > 2)". */
function condText(c) {
  if (!c) return '';
  if (c.op) return `(${condText(c.lhs)} ${c.op} ${condText(c.rhs)})`;
  return `${c.var} ${c.rel} ${c.value}`;
}

function astLabel(node) {
  const fields = Object.entries(node)
    .filter(([k]) => !['kind', 'col', 'targetCol', 'cond'].includes(k))
    .map(([k, v]) => (typeof v === 'string' ? `${k}="${v}"` : `${k}=${v}`));
  // A compound condition has no flat var/rel/value, so show the whole tree.
  if (node.cond && node.cond.op) fields.splice(1, 0, `cond="${condText(node.cond)}"`);
  return `${node.kind}  ${fields.join('  ')}`;
}

/** Runs `alpc --json` on a source string. Returns the parsed JSON or a failure stage. */
async function runCompiler(source, workDir) {
  await writeFile(path.join(workDir, 'input.edu'), source, 'utf8');
  const res = await runBin(ALPC_BIN, ['--json', 'input.edu'], workDir);
  if (res.exitCode === 127) return { error: res.stderr };
  try {
    return { json: JSON.parse(res.stdout) };
  } catch {
    const old = /unknown mode: --json/.test(res.stderr);
    return {
      error: old
        ? 'This alpc binary is older than the --json mode. Rebuild the compiler with make or npm run build:compiler.'
        : `The compiler did not return valid output (exit ${res.exitCode}). ${res.stderr.trim()}`,
    };
  }
}

function diagnosticsOf(json) {
  return (json.diagnostics || []).map(d => ({
    stage: DIAG_STAGE[d.kind] || 'parse',
    kind: d.kind,
    code: d.code,
    line: d.line,
    col: d.col,
    message: d.line > 0 ? `line ${d.line}${d.col > 0 ? `, col ${d.col}` : ''}: ${d.message}` : d.message,
  }));
}

/** Compile only: tokens, trace, AST, diagnostics, IR. Fast enough to run while typing. */
async function check(source) {
  tooLarge(source);
  const workDir = await mkdtemp(path.join(tmpdir(), 'alpc-ls-'));
  try {
    const { json, error } = await runCompiler(source, workDir);
    if (error) return { success: false, diagnostics: [{ stage: 'tokens', kind: 'internal', code: 'compiler', line: 0, col: 0, message: error }], backwardDesign: null };
    return { success: json.success, diagnostics: diagnosticsOf(json), backwardDesign: json.checks?.backwardDesign ?? null, stages: json.stages };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Compile a Path-Lang program with ALPC and run it with lli.
 * Returns everything the frontend shows, all of it produced by the two tools.
 */
function tooLarge(source) {
  if (Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) {
    const err = new Error(`The program is too long. The limit is ${MAX_SOURCE_BYTES / 1024} KB.`);
    err.status = 413;
    throw err;
  }
}

/**
 * Runs LLVM's own optimizer (opt -O2) on the generated IR. Because every SET
 * is a constant, it usually folds the whole program into one print of the
 * score and one of the outcome. Returns { ir } or { error }.
 */
async function optimize(ir, workDir) {
  await writeFile(path.join(workDir, 'opt-in.ll'), ir, 'utf8');
  const res = await runBin(OPT_BIN, ['-O2', '-S', 'opt-in.ll', '-o', '-'], workDir);
  if (res.exitCode === 127) {
    return { error: `The LLVM optimizer was not found: "${OPT_BIN}". It ships with LLVM next to lli; set OPT_BIN in backend/.env if it lives elsewhere.` };
  }
  if (res.exitCode !== 0) return { error: res.stderr.trim() || `opt exited with ${res.exitCode}.` };
  return { ir: res.stdout };
}

async function compile(source, { optimize: withOptimizer = false } = {}) {
  tooLarge(source);

  const workDir = await mkdtemp(path.join(tmpdir(), 'alpc-ls-'));
  const result = {
    success: false, outcome: null, alignmentScore: null, binaryOutput: null,
    tokens: [], traceLines: [], ast: null, irSource: '', stages: [], diagnostics: [], backwardDesign: null,
    optimizedIr: null, optimizeError: null,
  };
  const stage = (id, status, stdout = '', stderr = '', exitCode = null) =>
    result.stages.push({ id, status, stdout, stderr, exitCode });

  try {
    const { json, error } = await runCompiler(source, workDir);
    if (error) {
      stage('tokens', 'error', '', error, 1);
      ['parse', 'ast', 'ir', 'run'].forEach(id => stage(id, 'skipped'));
      result.diagnostics = [{ stage: 'tokens', kind: 'internal', code: 'compiler', line: 0, col: 0, message: error }];
      return result;
    }

    result.tokens = json.tokens || [];
    result.traceLines = json.trace || [];
    result.diagnostics = diagnosticsOf(json);
    result.backwardDesign = json.checks?.backwardDesign ?? null;
    if (json.ast) {
      result.ast = {
        label: `Program binary_output=${json.ast.binaryOutput ? 1 : 0}`,
        depth: 0,
        children: (json.ast.stmts || []).map(n => ({ label: astLabel(n), depth: 1, children: [] })),
      };
    }

    const errorsFor = id => result.diagnostics.filter(d => d.stage === id).map(d => d.message).join('\n');
    const st = json.stages || {};
    const parseFailed = st.parser === 'error' || st.semantic === 'error';

    stage('tokens', st.lexer === 'success' ? 'success' : 'error',
      result.tokens.map(t => `line ${t.line}: ${t.type} "${t.lexeme}"`).concat('EOF').join('\n'), errorsFor('tokens'), st.lexer === 'success' ? 0 : 1);
    stage('parse', parseFailed ? 'error' : 'success', result.traceLines.join('\n'), errorsFor('parse'), parseFailed ? 1 : 0);
    if (!json.success) {
      stage('ast', parseFailed ? 'skipped' : 'success', parseFailed ? '' : [result.ast?.label, ...(result.ast?.children || []).map(c => '  ' + c.label)].join('\n'));
      stage('ir', 'skipped');
      stage('run', 'skipped');
      return result;
    }
    stage('ast', 'success', [result.ast.label, ...result.ast.children.map(c => '  ' + c.label)].join('\n'), '', 0);
    result.irSource = json.ir || '';
    stage('ir', 'success', result.irSource, '', 0);

    // The compiled @main returns the score, so lli's exit status is the score
    // (mod 256) and is non-zero for any non-zero score. Success means lli ran
    // to completion and printed both lines; the printed values are what count.
    await writeFile(path.join(workDir, 'input.ll'), result.irSource, 'utf8');
    const run = await runBin(LLI_BIN, ['input.ll'], workDir);
    const parsed = parseRunOutput(run.stdout, !!json.binaryOutput);
    const runOk = run.signal === null && run.exitCode !== 127 && parsed.alignmentScore !== null && parsed.reportedOutcome;
    stage('run', runOk ? 'success' : 'error', run.stdout, runOk ? '' : (run.stderr || 'The program did not print a score and an outcome. Rebuild the compiler so it reports the outcome.'), run.exitCode);

    if (runOk && withOptimizer) {
      const o = await optimize(result.irSource, workDir);
      result.optimizedIr = o.ir ?? null;
      result.optimizeError = o.error ?? null;
    }

    if (runOk) {
      result.success = true;
      result.alignmentScore = parsed.alignmentScore;
      result.binaryOutput = parsed.binaryOutput;
      result.outcome = parsed.outcome;
    } else {
      result.diagnostics.push({ stage: 'run', kind: 'runtime', code: 'run', line: 0, col: 0, message: result.stages.at(-1).stderr });
    }
    return result;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { compile, check, parseRunOutput, condText, MAX_SOURCE_BYTES };
