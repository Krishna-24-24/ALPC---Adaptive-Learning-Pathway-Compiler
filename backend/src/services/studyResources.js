'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'resources.json');
const LEVELS = ['intro', 'practice', 'core', 'advanced'];
const TYPES = ['video', 'article', 'visualization', 'problems'];

let cache = { mtimeMs: -1, data: null };

/** resources.json, re-read whenever the file changes so edits need no restart. */
function load() {
  const { mtimeMs } = fs.statSync(FILE);
  if (mtimeMs !== cache.mtimeMs) {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const problems = problemsIn(data);
    if (problems.length) throw new Error(`resources.json: ${problems.join('; ')}`);
    cache = { mtimeMs, data };
  }
  return cache.data;
}

/** Everything wrong with a resources file, as readable sentences. */
function problemsIn(data) {
  const out = [];
  if (!data || typeof data.topics !== 'object') return ['"topics" is missing'];
  for (const [outcome, levels] of Object.entries(data.levelsForOutcome || {})) {
    for (const l of levels) if (!LEVELS.includes(l)) out.push(`outcome ${outcome} names unknown level "${l}"`);
  }
  for (const [topic, list] of Object.entries(data.topics)) {
    const ids = new Set();
    list.forEach((r, i) => {
      const where = `${topic} #${i + 1}`;
      if (!r.id) out.push(`${where} has no id`);
      else if (ids.has(r.id)) out.push(`${where} repeats id "${r.id}"`);
      ids.add(r.id);
      if (!LEVELS.includes(r.level)) out.push(`${where} has unknown level "${r.level}"`);
      if (!TYPES.includes(r.type)) out.push(`${where} has unknown type "${r.type}"`);
      if (!/^https:\/\//.test(r.url || '')) out.push(`${where} needs an https url`);
      if (!r.title) out.push(`${where} has no title`);
    });
  }
  return out;
}

function topicNames() {
  return Object.keys(load().topics);
}

function forTopic(skill) {
  return load().topics[skill] || null;
}

/** The levels an outcome sends a student to; null when the outcome is not mapped. */
function levelsFor(outcome) {
  return (outcome && load().levelsForOutcome?.[outcome]) || null;
}

/**
 * Split a topic's resources into the ones the outcome chose and the rest.
 * An unmapped or missing outcome chooses nothing, so every resource is "other".
 */
function select(skill, outcome) {
  const all = forTopic(skill) || [];
  const levels = levelsFor(outcome);
  if (!levels) return { levels: null, chosen: [], others: all };
  const rank = r => levels.indexOf(r.level);
  const chosen = all.filter(r => levels.includes(r.level)).sort((a, b) => rank(a) - rank(b));
  const others = all.filter(r => !levels.includes(r.level));
  return { levels, chosen, others };
}

module.exports = { load, problemsIn, topicNames, forTopic, levelsFor, select, LEVELS, TYPES };
