'use strict';

// Default 4-tier outcomes used when no custom pathway is defined
const DEFAULT_OUTCOMES = [
  { name: 'remedial', adjustment: 0 },
  { name: 'practice', adjustment: 0 },
  { name: 'core',     adjustment: 0 },
  { name: 'advanced', adjustment: 0 },
];

const DEFAULT_RULES = [
  { variable: 'performance', operator: '<',  value: 50,  outcome: 'remedial' },
  { variable: 'performance', operator: '<',  value: 70,  outcome: 'practice' },
  { variable: 'performance', operator: '<',  value: 85,  outcome: 'core'     },
  { variable: 'performance', operator: '>=', value: 85,  outcome: 'advanced' },
];

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(outcomes, rules) {
  const names = new Set(outcomes.map(o => (typeof o === 'string' ? o : o.name)));
  const errors = [];
  for (const rule of rules) {
    if (!names.has(rule.outcome)) {
      errors.push(`Rule references undeclared outcome '${rule.outcome}'`);
    }
  }
  return errors;
}

/** "performance < 50", or "performance < 50 AND mastery < 40" when the rule has a second comparison. */
function ruleCondition(rule) {
  const first = `${rule.variable} ${rule.operator} ${rule.value}`;
  const a = rule.also;
  if (a && a.variable && (a.connector === 'AND' || a.connector === 'OR')) {
    return `${first} ${a.connector} ${a.variable} ${a.operator} ${a.value}`;
  }
  return first;
}

// ─── Path-Lang generator ──────────────────────────────────────────────────────
/**
 * Generate a valid Path-Lang source string.
 * Enforces Backward Design: OUTCOME declarations come BEFORE all SET and IF.
 *
 * @param {object} opts
 * @param {Array}  opts.outcomes  – [{ name, adjustment }] or ['name', ...]
 * @param {object} opts.variables – { performance: 72, mastery: 58, ... }
 * @param {Array}  opts.rules     – [{ variable, operator, value, outcome }]
 * @returns {string}
 */
function generatePathLang({ outcomes, variables = {}, rules }) {
  const lines = [];

  // ① Outcome declarations (Backward Design: must precede all branches)
  for (const o of outcomes) {
    const name = typeof o === 'string' ? o : o.name;
    const adj  = typeof o === 'object' ? (o.adjustment || 0) : 0;
    if (adj > 0)      lines.push(`OUTCOME ${name} += ${adj};`);
    else if (adj < 0) lines.push(`OUTCOME ${name} -= ${Math.abs(adj)};`);
    else              lines.push(`OUTCOME ${name};`);
  }

  lines.push('');

  // ② Profile variable assignments (state must be last so it reads as 0 base)
  const { state, ...profileVars } = variables;
  for (const [k, v] of Object.entries(profileVars)) {
    lines.push(`SET ${k} = ${Math.round(v)};`);
  }
  lines.push(`SET state = ${Math.round(state != null ? state : 0)};`);

  lines.push('');

  // ③ Conditional branch rules
  for (const rule of rules) {
    if (rule.variable && rule.outcome) {
      lines.push(`IF ${ruleCondition(rule)} GOTO ${rule.outcome};`);
    }
  }

  return lines.join('\n');
}

// ─── Student variable mapper ──────────────────────────────────────────────────
function buildStudentVariables({ performance, mastery, attempts, completionRate }) {
  const vars = {};
  if (performance != null) {
    vars.performance = Math.round(Math.max(0, Math.min(100, performance)));
  }
  if (mastery != null) {
    // LearnSmart stores mastery as 0–1; convert to 0–100 for Path-Lang
    const pct = mastery <= 1 ? mastery * 100 : mastery;
    vars.mastery = Math.round(Math.max(0, Math.min(100, pct)));
  }
  if (attempts != null) {
    vars.attempts = Math.round(Math.max(0, attempts));
  }
  if (completionRate != null) {
    vars.completion_rate = Math.round(Math.max(0, Math.min(100, completionRate)));
  }
  return vars;
}

// ─── Top-level generator ──────────────────────────────────────────────────────
/**
 * Generate a Path-Lang program for a student on a given topic.
 * Uses custom pathway rules if provided, otherwise falls back to defaults.
 */
function generateForStudent({ studentData, pathway = null }) {
  const outcomes = pathway ? pathway.outcomes : DEFAULT_OUTCOMES;
  const rules    = pathway ? pathway.rules    : DEFAULT_RULES;

  const errors = validate(outcomes, rules);
  if (errors.length > 0) {
    throw new Error(`Pathway validation failed: ${errors.join('; ')}`);
  }

  const variables = buildStudentVariables(studentData);
  return generatePathLang({ outcomes, variables, rules });
}

module.exports = {
  generatePathLang,
  ruleCondition,
  generateForStudent,
  buildStudentVariables,
  validate,
  DEFAULT_OUTCOMES,
  DEFAULT_RULES,
};
