'use strict';

const express  = require('express');
const Pathway  = require('../models/Pathway');
const CompilerDecision = require('../models/CompilerDecision');
const { authMiddleware } = require('../middleware/auth');
const alpcRunner         = require('../services/alpcRunner');
const { generateForStudent, generatePathLang, validate } = require('../services/pathwayGenerator');
const { decide } = require('../services/decide');
const { rateLimit } = require('../middleware/rateLimit');

// Public routes that run the compiler: limit each client.
const compileLimit = rateLimit({ windowMs: 60_000, max: Number(process.env.COMPILE_PER_MINUTE) || 30, name: 'compile' });
const checkLimit   = rateLimit({ windowMs: 60_000, max: Number(process.env.CHECK_PER_MINUTE) || 150, name: 'check' });

const router = express.Router();

// ─── Outcome → Content Mapping ────────────────────────────────────────────────
// Configurable: describes what each compiler outcome means for LearnSmart.
const OUTCOME_CONTENT = {
  remedial: {
    label: 'Remedial Path',
    tier: 'remedial',
    color: 'rose',
    description: 'Go back over the basics of this topic before moving on.',
    steps: [
      'Review foundational concepts',
      'Watch the concept video',
      'Attempt easy practice questions',
      'Re-take diagnostic quiz',
    ],
    nextAction: 'Start with the basics',
  },
  practice: {
    label: 'Practice Path',
    tier: 'practice',
    color: 'amber',
    description: 'You have the idea. More guided practice will make it stick.',
    steps: [
      'Review core concepts',
      'Attempt medium-difficulty practice quiz',
      'Identify and review mistakes',
      'Attempt full adaptive quiz',
    ],
    nextAction: 'Keep practising',
  },
  core: {
    label: 'Core Path',
    tier: 'core',
    color: 'indigo',
    description: 'You are ready for the main lesson on this topic.',
    steps: [
      'Complete the standard lesson',
      'Attempt intermediate assessment',
      'Review errors and explanations',
      'Proceed to next topic',
    ],
    nextAction: 'Continue learning',
  },
  advanced: {
    label: 'Advanced Path',
    tier: 'advanced',
    color: 'emerald',
    description: 'You have mastered the basics. Move on to harder problems.',
    steps: [
      'Tackle the advanced lesson',
      'Solve the challenge problems',
      'Explore related topics',
      'Mentor or review peer solutions',
    ],
    nextAction: 'Push further',
  },
};

function getContent(outcome) {
  if (!outcome) return null;
  return OUTCOME_CONTENT[outcome.toLowerCase()] || {
    label: outcome,
    tier: outcome,
    color: 'gray',
    description: `Selected pathway: ${outcome}`,
    steps: [],
    nextAction: 'Proceed',
  };
}

// Everything the frontend shows for one run, straight from the compiler and lli.
function payload(result, extra = {}) {
  return { ...result, content: getContent(result.outcome), ...extra };
}

// ─── POST /api/alpc/compile ──────────────────────────────────────────────────
// Compile and run raw Path-Lang source. No auth required (playground).
router.post('/compile', compileLimit, async (req, res) => {
  try {
    const { source } = req.body;
    if (typeof source !== 'string' || !source.trim()) {
      return res.status(400).json({ error: '"source" string is required' });
    }
    return res.json(payload(await alpcRunner.compile(source, { optimize: true })));
  } catch (err) {
    if (!err.status) console.error('[alpc/compile]', err.message);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── POST /api/alpc/check ────────────────────────────────────────────────────
// Compile only, no execution: diagnostics with line and column for the editor.
router.post('/check', checkLimit, async (req, res) => {
  try {
    const { source } = req.body;
    if (typeof source !== 'string') {
      return res.status(400).json({ error: '"source" string is required' });
    }
    if (!source.trim()) return res.json({ success: true, diagnostics: [], backwardDesign: null });
    return res.json(await alpcRunner.check(source));
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── POST /api/alpc/pathway/generate ─────────────────────────────────────────
// Generate Path-Lang from student state, compile it, persist result. Auth required.
router.post('/pathway/generate', authMiddleware, async (req, res) => {
  try {
    const { skill, pathwayId, performance, mastery, attempts, completionRate } = req.body;
    if (!skill) return res.status(400).json({ error: '"skill" is required' });

    const pathway = pathwayId ? await Pathway.findById(pathwayId) : null;
    const { parsed, source, decisionId } = await decide({
      userId: req.user.id, skill, pathway, performance, mastery, attempts, completionRate,
    });

    return res.json(payload(parsed, { source, decisionId }));
  } catch (err) {
    console.error('[alpc/pathway/generate]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/alpc/decisions ─────────────────────────────────────────────────
router.get('/decisions', authMiddleware, async (req, res) => {
  try {
    const decisions = await CompilerDecision.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-stages.stdout -stages.stderr');
    return res.json({ decisions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/alpc/decisions/:id ─────────────────────────────────────────────
router.get('/decisions/:id', authMiddleware, async (req, res) => {
  try {
    if (!/^[0-9a-f]{24}$/i.test(req.params.id)) return res.status(404).json({ error: 'Decision not found' });
    const decision = await CompilerDecision.findOne({ _id: req.params.id, userId: req.user.id });
    if (!decision) return res.status(404).json({ error: 'Decision not found' });
    return res.json({ decision, content: getContent(decision.outcome) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/alpc/pathways ───────────────────────────────────────────────────
router.get('/pathways', authMiddleware, async (req, res) => {
  try {
    const pathways = await Pathway.find().sort({ createdAt: -1 }).limit(50);
    return res.json({ pathways });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/alpc/pathways ──────────────────────────────────────────────────
router.post('/pathways', authMiddleware, async (req, res) => {
  try {
    const { name, topic, description, outcomes, rules } = req.body;
    if (!name || !topic || !outcomes || !rules) {
      return res.status(400).json({ error: 'name, topic, outcomes, and rules are required' });
    }
    const errors = validate(outcomes, rules);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const defaultPathLang = generatePathLang({
      outcomes,
      variables: { performance: 50, state: 0 },
      rules,
    });
    const pathway = await Pathway.create({
      name, topic, description: description || '',
      outcomes, rules, defaultPathLang,
      createdBy: req.user.id,
    });
    return res.status(201).json({ pathway });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/alpc/pathways/:id/simulate ────────────────────────────────────
router.post('/pathways/:id/simulate', authMiddleware, async (req, res) => {
  try {
    const pathway = await Pathway.findById(req.params.id);
    if (!pathway) return res.status(404).json({ error: 'Pathway not found' });

    const { performance = 50, mastery = 0.5, attempts, completionRate } = req.body;
    const source = generateForStudent({
      studentData: { performance, mastery, attempts, completionRate },
      pathway,
    });
    const parsed = await alpcRunner.compile(source);
    return res.json(payload(parsed, { source }));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
