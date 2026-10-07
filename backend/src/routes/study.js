'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Mastery = require('../models/Mastery');
const CompilerDecision = require('../models/CompilerDecision');
const StudyProgress = require('../models/StudyProgress');
const { authMiddleware } = require('../middleware/auth');
const resources = require('../services/studyResources');
const { currentDecision } = require('../services/decide');

const router = express.Router();
router.use(authMiddleware);

const percent = m => (m == null ? null : Math.round(m * 100));

// GET /api/study: every topic with mastery, progress and the last outcome.
router.get('/', async (req, res) => {
  try {
    const names = resources.topicNames();
    const [mastery, done, decisions] = await Promise.all([
      Mastery.find({ userId: req.user.id }),
      StudyProgress.find({ userId: req.user.id }).select('skill resourceId'),
      CompilerDecision.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.user.id), pathwayId: { $exists: false } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$skill', outcome: { $first: '$outcome' } } },
      ]),
    ]);
    const m = Object.fromEntries(mastery.map(r => [r.skill, r.masteryScore]));
    const o = Object.fromEntries(decisions.map(d => [d._id, d.outcome]));

    const topics = names.map(skill => {
      const ids = new Set(resources.forTopic(skill).map(r => r.id));
      return {
        skill,
        masteryPercent: percent(m[skill]),
        resources: ids.size,
        done: done.filter(d => d.skill === skill && ids.has(d.resourceId)).length,
        outcome: o[skill] ?? null,
      };
    });
    res.json({ topics });
  } catch (err) {
    console.error('[study]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/study/:skill: the resources the compiled pathway chose for this student.
router.get('/:skill', async (req, res) => {
  try {
    const { skill } = req.params;
    if (!resources.forTopic(skill)) {
      return res.status(404).json({ error: `There is no study page for "${skill}".` });
    }
    const [decision, masteryRec, done] = await Promise.all([
      currentDecision({ userId: req.user.id, skill }),
      Mastery.findOne({ userId: req.user.id, skill }),
      StudyProgress.find({ userId: req.user.id, skill }).select('resourceId doneAt'),
    ]);
    const doneAt = Object.fromEntries(done.map(d => [d.resourceId, d.doneAt]));
    const mark = r => ({ ...r, doneAt: doneAt[r.id] || null });
    const { levels, chosen, others } = resources.select(skill, decision.outcome);

    res.json({
      skill,
      masteryPercent: percent(masteryRec?.masteryScore),
      decision,
      levels,
      chosen: chosen.map(mark),
      others: others.map(mark),
    });
  } catch (err) {
    console.error('[study/:skill]', err.message);
    res.status(500).json({ error: err.message });
  }
});

function known(skill, id) {
  return (resources.forTopic(skill) || []).some(r => r.id === id);
}

// PUT /api/study/:skill/done/:resourceId marks a resource done; DELETE unmarks it.
router.put('/:skill/done/:resourceId', async (req, res) => {
  try {
    const { skill, resourceId } = req.params;
    if (!known(skill, resourceId)) return res.status(404).json({ error: 'No such resource.' });
    const row = await StudyProgress.findOneAndUpdate(
      { userId: req.user.id, skill, resourceId },
      { $setOnInsert: { doneAt: new Date() } },
      { upsert: true, new: true },
    );
    res.json({ resourceId, doneAt: row.doneAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:skill/done/:resourceId', async (req, res) => {
  try {
    const { skill, resourceId } = req.params;
    await StudyProgress.deleteOne({ userId: req.user.id, skill, resourceId });
    res.json({ resourceId, doneAt: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
