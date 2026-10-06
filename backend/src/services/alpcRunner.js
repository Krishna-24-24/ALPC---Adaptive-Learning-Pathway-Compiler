'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const { mkdtemp, writeFile, rm } = require('fs/promises');
const { tmpdir } = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

const ALPC_BIN = process.env.ALPC_BIN || 'C:/Users/Krishna/Projects/ALPC/alpc.exe';
const LLI_BIN  = process.env.LLI_BIN  || 'lli';
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
      cwd,
      env: buildEnv(),
      timeout: EXEC_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
    });
    return { stdout: stdout || '', stderr: stderr || '', exitCode: 0 };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        stdout: '',
        stderr: `Compiler binary not found: "${bin}". Build ALPC first (make) or configure ALPC_BIN in backend/.env.`,
        exitCode: 127,
      };
    }
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || 'unknown error',
      exitCode: typeof err.code === 'number' ? err.code : 1,
    };
  }
}

/**
 * Parse lli stdout: either a decimal integer (normal mode) or
 * a binary string like "1111" (; b mode).
 */
function parseRunOutput(stdout) {
  const raw = stdout.trim();
  if (!raw) return { alignmentScore: null, binaryOutput: null };

  if (/^[01]+$/.test(raw)) {
    return {
      binaryOutput: raw,
      alignmentScore: parseInt(raw, 2),
    };
  }
  const n = parseInt(raw, 10);
  return {
    alignmentScore: isNaN(n) ? null : n,
    binaryOutput: null,
  };
}

/**
 * Compile a Path-Lang source string through the full ALPC pipeline.
 * Runs all 5 stages sequentially: tokens → parse → ast → ir → lli
 * Returns a structured result with per-stage output.
 */
async function compile(source) {
  if (Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) {
    throw new Error(`Source too large (max ${MAX_SOURCE_BYTES} bytes)`);
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'alpc-ls-'));
  const srcPath = path.join(workDir, 'input.edu');
  const irPath  = path.join(workDir, 'input.ll');

  const stages = [];
  let irSource       = '';
  let alignmentScore = null;
  let binaryOutput   = null;

  const skipped = (ids) => ids.forEach(id =>
    stages.push({ id, status: 'skipped', stdout: '', stderr: '', exitCode: null })
  );

  try {
    await writeFile(srcPath, source, 'utf8');

    // ── Stage 1: Tokens ────────────────────────────────────────────
    const tokRes = await runBin(ALPC_BIN, ['--dump-tokens', 'input.edu'], workDir);
    stages.push({ id: 'tokens', status: tokRes.exitCode === 0 ? 'success' : 'error', ...tokRes });
    if (tokRes.exitCode !== 0) {
      skipped(['parse', 'ast', 'ir', 'run']);
      return { success: false, stages, irSource, alignmentScore, binaryOutput };
    }

    // ── Stage 2: Parse trace ───────────────────────────────────────
    const parseRes = await runBin(ALPC_BIN, ['--parse-trace', 'input.edu'], workDir);
    stages.push({ id: 'parse', status: parseRes.exitCode === 0 ? 'success' : 'error', ...parseRes });
    if (parseRes.exitCode !== 0) {
      skipped(['ast', 'ir', 'run']);
      return { success: false, stages, irSource, alignmentScore, binaryOutput };
    }

    // ── Stage 3: AST ──────────────────────────────────────────────
    const astRes = await runBin(ALPC_BIN, ['--dump-ast', 'input.edu'], workDir);
    stages.push({ id: 'ast', status: astRes.exitCode === 0 ? 'success' : 'error', ...astRes });
    if (astRes.exitCode !== 0) {
      skipped(['ir', 'run']);
      return { success: false, stages, irSource, alignmentScore, binaryOutput };
    }

    // ── Stage 4: LLVM IR ──────────────────────────────────────────
    const irRes = await runBin(ALPC_BIN, ['--emit-ir', 'input.edu'], workDir);
    stages.push({ id: 'ir', status: irRes.exitCode === 0 ? 'success' : 'error', ...irRes });
    if (irRes.exitCode !== 0) {
      skipped(['run']);
      return { success: false, stages, irSource, alignmentScore, binaryOutput };
    }
    irSource = irRes.stdout;

    // ── Stage 5: lli execution ────────────────────────────────────
    await writeFile(irPath, irSource, 'utf8');
    const runRes = await runBin(LLI_BIN, ['input.ll'], workDir);
    const runOk  = runRes.exitCode === 0;
    stages.push({ id: 'run', status: runOk ? 'success' : 'error', ...runRes });

    if (runOk) {
      const parsed = parseRunOutput(runRes.stdout);
      alignmentScore = parsed.alignmentScore;
      binaryOutput   = parsed.binaryOutput;
    }

    return { success: runOk, stages, irSource, alignmentScore, binaryOutput };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { compile };
