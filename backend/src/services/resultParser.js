'use strict';

// ─── Token parser ─────────────────────────────────────────────────────────────
// Parses --dump-tokens stdout: each line is  `line N: TOKEN_TYPE "lexeme"`
function parseTokens(stdout) {
  const tokens = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(/^line (\d+): (\S+) "(.*)"\s*$/);
    if (m) {
      tokens.push({ line: parseInt(m[1], 10), type: m[2], lexeme: m[3] });
    } else if (line.trim() === 'EOF') {
      tokens.push({ line: null, type: 'EOF', lexeme: '' });
    }
  }
  return tokens;
}

// ─── Parse trace ──────────────────────────────────────────────────────────────
// Parses --parse-trace stdout into an array of non-empty lines.
function parseTrace(stdout) {
  return stdout.split('\n').map(l => l.trim()).filter(Boolean);
}

// ─── AST parser ───────────────────────────────────────────────────────────────
// Parses --dump-ast indented text into a nested {label, depth, children} tree.
function parseAst(stdout) {
  const lines = stdout.split('\n').filter(l => l.trim());
  if (!lines.length) return null;

  // Strip tree-drawing prefix chars to get depth and label
  const nodes = lines.map(line => {
    const stripped = line.replace(/^[\u2502 \u251c\u2514\u2500\u2524\u251d]+/, '');
    // Each level of nesting is represented by ~4 chars of prefix
    const prefixLen = line.length - stripped.length;
    const depth = Math.max(0, Math.floor(prefixLen / 4));
    return { label: stripped.trim(), depth, children: [] };
  });

  // Build tree
  const root = { ...nodes[0], children: [] };
  const stack = [root];
  for (let i = 1; i < nodes.length; i++) {
    const node = { ...nodes[i], children: [] };
    // Pop stack until parent depth < node depth
    while (stack.length > 1 && stack[stack.length - 1].depth >= node.depth) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root;
}

// ─── Outcome deriver ──────────────────────────────────────────────────────────
// Re-evaluates the Path-Lang IF rules in source-order to determine which
// outcome was selected. This mirrors the ALPC runtime without duplicating the
// compiler — we use the ACTUAL alignmentScore from lli to confirm, but derive
// the outcome label by re-running the rules with the profile variables.
function deriveOutcome(pathLangSource, alignmentScore) {
  if (alignmentScore === null) return null;

  // Parse profile variable values from SET statements
  const vars = {};
  for (const m of pathLangSource.matchAll(/^SET (\w+) = (-?\d+);/gm)) {
    vars[m[1]] = parseInt(m[2], 10);
  }
  for (const m of pathLangSource.matchAll(/^SET (\w+) \+= (-?\d+);/gm)) {
    if (vars[m[1]] !== undefined) vars[m[1]] += parseInt(m[2], 10);
  }
  for (const m of pathLangSource.matchAll(/^SET (\w+) -= (-?\d+);/gm)) {
    if (vars[m[1]] !== undefined) vars[m[1]] -= parseInt(m[2], 10);
  }

  // Evaluate IF rules in order (same semantics as Path-Lang runtime)
  for (const m of pathLangSource.matchAll(/^IF (\w+) ([<>=!]+) (-?\d+) GOTO (\w+);/gm)) {
    const varName   = m[1];
    const op        = m[2];
    const threshold = parseInt(m[3], 10);
    const target    = m[4];
    const val       = vars[varName];
    if (val === undefined) continue;

    let taken = false;
    if      (op === '<')  taken = val < threshold;
    else if (op === '>')  taken = val > threshold;
    else if (op === '==') taken = val === threshold;
    else if (op === '>=') taken = val >= threshold;
    else if (op === '<=') taken = val <= threshold;

    if (taken) return target;
  }
  return null;
}

// ─── Full result enrichment ───────────────────────────────────────────────────
function parseCompilerResult(runnerResult, pathLangSource) {
  const stageMap = Object.fromEntries(runnerResult.stages.map(s => [s.id, s]));

  const tokens = stageMap.tokens && stageMap.tokens.status === 'success'
    ? parseTokens(stageMap.tokens.stdout)
    : [];

  const traceLines = stageMap.parse && stageMap.parse.status === 'success'
    ? parseTrace(stageMap.parse.stdout)
    : [];

  const ast = stageMap.ast && stageMap.ast.status === 'success'
    ? parseAst(stageMap.ast.stdout)
    : null;

  const outcome = deriveOutcome(pathLangSource, runnerResult.alignmentScore);

  const diagnostics = runnerResult.stages
    .filter(s => s.status === 'error' && s.stderr && s.stderr.trim())
    .map(s => ({ stage: s.id, message: s.stderr.trim() }));

  return {
    success:        runnerResult.success,
    outcome,
    alignmentScore: runnerResult.alignmentScore,
    binaryOutput:   runnerResult.binaryOutput,
    tokens,
    traceLines,
    ast,
    irSource:       runnerResult.irSource || '',
    stages:         runnerResult.stages,
    diagnostics,
  };
}

module.exports = { parseTokens, parseTrace, parseAst, deriveOutcome, parseCompilerResult };
