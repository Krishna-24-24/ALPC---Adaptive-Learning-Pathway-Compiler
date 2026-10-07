'use strict';

const Mastery = require('../models/Mastery');
const CompilerDecision = require('../models/CompilerDecision');
const alpcRunner = require('./alpcRunner');
const { generateForStudent } = require('./pathwayGenerator');

/**
 * Write a Path-Lang program from a student's numbers, compile and run it,
 * and save the decision. The outcome is whatever the program printed.
 *
 * @returns {{ parsed: object, source: string, decisionId: string|null, performance: number, mastery: number }}
 */
async function decide({ userId, skill, pathway = null, performance, mastery, attempts, completionRate }) {
  let masteryScore = mastery;
  if (masteryScore == null) {
    const rec = await Mastery.findOne({ userId, skill });
    masteryScore = rec ? rec.masteryScore : 0.3;
  }

  let perfScore = performance;
  if (perfScore == null) {
    perfScore = (masteryScore <= 1 ? masteryScore : masteryScore / 100) * 100;
  }

  const source = generateForStudent({
    studentData: { performance: perfScore, mastery: masteryScore, attempts, completionRate },
    pathway,
  });

  const parsed = await alpcRunner.compile(source);

  let decisionId = null;
  try {
    const saved = await CompilerDecision.create({
      userId,
      skill,
      pathwayId:      pathway ? pathway._id : undefined,
      pathLangSource: source,
      outcome:        parsed.outcome,
      alignmentScore: parsed.alignmentScore,
      binaryOutput:   parsed.binaryOutput,
      stages: parsed.stages.map(s => ({
        id:       s.id,
        status:   s.status,
        stdout:   (s.stdout || '').slice(0, 4000),
        stderr:   (s.stderr || '').slice(0, 1000),
        exitCode: s.exitCode,
      })),
      performance: perfScore,
      mastery:     masteryScore,
    });
    decisionId = saved._id;
  } catch (saveErr) {
    console.warn('[alpc] Failed to save CompilerDecision:', saveErr.message);
  }

  return { parsed, source, decisionId, performance: perfScore, mastery: masteryScore };
}

/**
 * The decision the study page should follow for a topic: the latest one made
 * with the default pathway, unless the student's mastery for the topic has
 * changed since. Then a new program is compiled.
 */
async function currentDecision({ userId, skill }) {
  const [latest, mastery] = await Promise.all([
    CompilerDecision.findOne({ userId, skill, pathwayId: { $exists: false } })
      .sort({ createdAt: -1 })
      .select('outcome alignmentScore createdAt performance mastery stages'),
    Mastery.findOne({ userId, skill }),
  ]);

  const stale = !latest
    || (mastery && mastery.updatedAt > latest.createdAt)
    || latest.stages.some(s => s.status === 'error');

  if (!stale) {
    return {
      decisionId: latest._id, outcome: latest.outcome, alignmentScore: latest.alignmentScore,
      createdAt: latest.createdAt, reused: true, error: null,
    };
  }

  const { parsed, decisionId } = await decide({ userId, skill });
  const failed = parsed.stages.find(s => s.status === 'error');
  return {
    decisionId, outcome: parsed.outcome, alignmentScore: parsed.alignmentScore,
    createdAt: new Date(), reused: false,
    error: failed ? (parsed.diagnostics[0]?.message || failed.stderr || 'The compiler failed.') : null,
  };
}

module.exports = { decide, currentDecision };
