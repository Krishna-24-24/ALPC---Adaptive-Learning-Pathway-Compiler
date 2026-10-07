const express = require('express');
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const Mastery = require('../models/Mastery');
const User = require('../models/User');
const Recommendation = require('../models/Recommendation');
const { authMiddleware } = require('../middleware/auth');
const mlService = require('../services/mlService');
const { present, answeredOnly } = require('../services/quizShuffle');

const router = express.Router();

const ALL_SKILLS = [
  'Arrays', 'Strings', 'Linked Lists', 'Stacks', 'Queues',
  'Trees', 'Graphs', 'Binary Search', 'Dynamic Programming',
];

async function getMasteryMap(userId) {
  const records = await Mastery.find({ userId });
  return Object.fromEntries(records.map((r) => [r.skill, r.masteryScore]));
}

async function updateSkillMastery(userId, skill, correct) {
  let record = await Mastery.findOne({ userId, skill });
  if (!record) {
    record = await Mastery.create({ userId, skill, masteryScore: 0.3 });
  }

  const result = await mlService.updateMastery(skill, correct, record.masteryScore);
  record.masteryScore = result.updatedMastery;
  record.updatedAt = new Date();
  await record.save();
  return record;
}

/**
 * Safely pick a random question matching criteria, avoiding current quiz duplicates
 * and prioritizing questions not recently answered by the user.
 */
async function pickRandomQuestion({ skill, difficulty, usedIds = [], avoidIds = [] }) {
  const usedObjectIds = usedIds.map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));
  const avoidObjectIds = avoidIds.map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));
  const allExcluded = [...usedObjectIds, ...avoidObjectIds];

  const matchStages = [
    // 1. Preferred: Exact skill + difficulty, avoiding both current quiz and past recent attempts
    ...(difficulty
      ? [{ skill, difficulty, _id: { $nin: allExcluded } }]
      : [{ skill, _id: { $nin: allExcluded } }]),

    // 2. Exact skill + difficulty, avoiding only current quiz duplicates
    ...(difficulty
      ? [{ skill, difficulty, _id: { $nin: usedObjectIds } }]
      : [{ skill, _id: { $nin: usedObjectIds } }]),

    // 3. Any difficulty for this skill, avoiding both current quiz and past attempts
    { skill, _id: { $nin: allExcluded } },

    // 4. Any difficulty for this skill, avoiding current quiz duplicates
    { skill, _id: { $nin: usedObjectIds } },

    // 5. Any question in DB, avoiding past recent attempts & current quiz duplicates
    { _id: { $nin: allExcluded } },

    // 6. Final fallback: Any question in DB avoiding current quiz duplicates
    { _id: { $nin: usedObjectIds } },
  ];

  for (const matchQuery of matchStages) {
    const sample = await Question.aggregate([
      { $match: matchQuery },
      { $sample: { size: 1 } },
    ]);

    if (sample && sample.length > 0) {
      return sample[0];
    }
  }

  return null;
}

// GET /api/quiz/diagnostic
router.get('/diagnostic', authMiddleware, async (req, res) => {
  try {
    const selectedQuestions = [];
    const usedIds = new Set();
    const targetCount = 15;

    // First pass: 1 question for each of the 9 skills
    const shuffledSkills = [...ALL_SKILLS].sort(() => Math.random() - 0.5);
    for (const skill of shuffledSkills) {
      const q = await pickRandomQuestion({
        skill,
        difficulty: 'medium',
        usedIds: [...usedIds],
      });
      if (q) {
        usedIds.add(q._id.toString());
        selectedQuestions.push(present(q));
      }
    }

    // Second pass: fill remaining up to 15 questions from skills without duplicates
    const extraSkills = ['Arrays', 'Strings', 'Trees', 'Graphs', 'Binary Search', 'Dynamic Programming', 'Stacks', 'Queues', 'Linked Lists']
      .sort(() => Math.random() - 0.5);

    for (const skill of extraSkills) {
      if (selectedQuestions.length >= targetCount) break;
      const difficulties = ['easy', 'medium', 'hard'].sort(() => Math.random() - 0.5);
      const q = await pickRandomQuestion({
        skill,
        difficulty: difficulties[0],
        usedIds: [...usedIds],
      });
      if (q) {
        usedIds.add(q._id.toString());
        selectedQuestions.push(present(q));
      }
    }

    // If still < 15, fill with any remaining questions
    while (selectedQuestions.length < targetCount) {
      const q = await pickRandomQuestion({ usedIds: [...usedIds] });
      if (!q) break;
      usedIds.add(q._id.toString());
      selectedQuestions.push(present(q));
    }

    // Shuffle the final question array so difficulty/skills are interspersed
    const finalQuestions = selectedQuestions.sort(() => Math.random() - 0.5);

    res.json({ questions: finalQuestions });
  } catch (err) {
    res.status(err.code === 'ML_UNAVAILABLE' ? 503 : 500).json({ error: err.message });
  }
});

// POST /api/quiz/diagnostic/submit
router.post('/diagnostic/submit', authMiddleware, async (req, res) => {
  try {
    const answers = Array.isArray(req.body.answers) ? answeredOnly(req.body.answers) : [];
    if (answers.length === 0) {
      return res.status(400).json({ error: 'Answer at least one question before submitting.' });
    }

    const results = [];
    for (const item of answers) {
      const question = await Question.findById(item.questionId);
      if (!question) continue;

      const correct = item.selectedOption === question.answer;
      await Attempt.create({
        userId: req.user.id,
        questionId: question._id,
        skill: question.skill,
        selectedOption: item.selectedOption,
        correctness: correct,
        quizType: 'diagnostic',
      });

      const mastery = await updateSkillMastery(req.user.id, question.skill, correct);
      results.push({
        questionId: question._id,
        skill: question.skill,
        correct,
        updatedMastery: mastery.masteryScore,
      });
    }

    await User.findByIdAndUpdate(req.user.id, { diagnosticCompleted: true });
    const masteryMap = await getMasteryMap(req.user.id);

    res.json({
      results,
      masteryMap,
      message: 'Diagnostic assessment completed',
    });
  } catch (err) {
    res.status(err.code === 'ML_UNAVAILABLE' ? 503 : 500).json({ error: err.message });
  }
});

const TOPIC_QUIZ_LENGTH = 5;

/**
 * Up to `count` questions on one topic, preferring `difficulty` and questions
 * the student has not seen recently. Never fills in from other topics.
 */
async function topicQuestions(skill, difficulty, avoidIds, count) {
  const avoid = avoidIds.map(id => new mongoose.Types.ObjectId(id));
  const picked = [];
  for (const match of [
    { skill, difficulty, _id: { $nin: avoid } },
    { skill, _id: { $nin: avoid } },
    { skill },
  ]) {
    if (picked.length >= count) break;
    const taken = picked.map(q => q._id);
    const more = await Question.aggregate([
      { $match: { ...match, _id: { $nin: [...(match._id?.$nin || []), ...taken] } } },
      { $sample: { size: count - picked.length } },
    ]);
    picked.push(...more);
  }
  return picked;
}

// GET /api/quiz/adaptive            ten questions, weakest topics first
// GET /api/quiz/adaptive?skill=X    five questions on topic X only
router.get('/adaptive', authMiddleware, async (req, res) => {
  try {
    const { skill } = req.query;
    if (skill !== undefined) {
      if (!ALL_SKILLS.includes(skill)) {
        return res.status(404).json({ error: `There is no topic called "${skill}".` });
      }
      const [record, recent] = await Promise.all([
        Mastery.findOne({ userId: req.user.id, skill }),
        Attempt.find({ userId: req.user.id, skill }).sort({ timestamp: -1 }).limit(20),
      ]);
      const masteryScore = record ? record.masteryScore : 0.3;
      let difficulty;
      try {
        difficulty = (await mlService.selectDifficulty(skill, masteryScore)).recommendedDifficulty || 'medium';
      } catch (_e) {
        difficulty = masteryScore < 0.4 ? 'easy' : masteryScore > 0.7 ? 'hard' : 'medium';
      }
      const avoidIds = [...new Set(recent.map(a => a.questionId.toString()))];
      const qs = await topicQuestions(skill, difficulty, avoidIds, TOPIC_QUIZ_LENGTH);
      const questions = qs.map(q => present(q, { targetMastery: masteryScore, recommendedDifficulty: difficulty }));
      return res.json({ questions, count: questions.length, skill });
    }

    // 1. Get user's recent question attempts to avoid repeating recently seen questions
    const recentAttempts = await Attempt.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(40);
    const avoidIds = [...new Set(recentAttempts.map((a) => a.questionId.toString()))];

    // 2. Get user mastery sorted lowest first (target weakest skills)
    let masteryRecords = await Mastery.find({ userId: req.user.id }).sort({ masteryScore: 1 });
    if (masteryRecords.length === 0) {
      // Default to all skills if no diagnostic taken yet
      masteryRecords = ALL_SKILLS.map((skill) => ({ skill, masteryScore: 0.3 }));
    }

    const selectedQuestions = [];
    const usedIds = new Set();
    const targetCount = 10;

    // Pass 1: Prioritize weakest skills with IRT-calculated difficulty
    for (const record of masteryRecords) {
      if (selectedQuestions.length >= targetCount) break;

      let difficulty = 'medium';
      try {
        const irtResult = await mlService.selectDifficulty(record.skill, record.masteryScore);
        difficulty = irtResult.recommendedDifficulty || 'medium';
      } catch (_e) {
        difficulty = record.masteryScore < 0.4 ? 'easy' : record.masteryScore > 0.7 ? 'hard' : 'medium';
      }

      const q = await pickRandomQuestion({
        skill: record.skill,
        difficulty,
        usedIds: [...usedIds],
        avoidIds,
      });

      if (q) {
        usedIds.add(q._id.toString());
        selectedQuestions.push(present(q, { targetMastery: record.masteryScore, recommendedDifficulty: difficulty }));
      }
    }

    // Pass 2: If we still need more questions, iterate through weakest skills again with different difficulty
    if (selectedQuestions.length < targetCount) {
      for (const record of masteryRecords) {
        if (selectedQuestions.length >= targetCount) break;
        const q = await pickRandomQuestion({
          skill: record.skill,
          usedIds: [...usedIds],
          avoidIds,
        });
        if (q) {
          usedIds.add(q._id.toString());
          selectedQuestions.push(present(q, { targetMastery: record.masteryScore, recommendedDifficulty: q.difficulty }));
        }
      }
    }

    // Pass 3: Fill any remaining quota with random unseen questions from any skill
    while (selectedQuestions.length < targetCount) {
      const q = await pickRandomQuestion({
        usedIds: [...usedIds],
        avoidIds,
      });
      if (!q) break;
      usedIds.add(q._id.toString());
      selectedQuestions.push(present(q));
    }

    // Shuffle the final list so the quiz is dynamic and engaging
    const finalQuestions = selectedQuestions.sort(() => Math.random() - 0.5);

    res.json({ questions: finalQuestions, count: finalQuestions.length });
  } catch (err) {
    res.status(err.code === 'ML_UNAVAILABLE' ? 503 : 500).json({ error: err.message });
  }
});

// POST /api/quiz/adaptive/submit
router.post('/adaptive/submit', authMiddleware, async (req, res) => {
  try {
    const answers = Array.isArray(req.body.answers) ? answeredOnly(req.body.answers) : [];
    if (answers.length === 0) {
      return res.status(400).json({ error: 'Answer at least one question before submitting.' });
    }

    const results = [];
    let correctCount = 0;

    for (const item of answers) {
      const question = await Question.findById(item.questionId);
      if (!question) continue;

      const correct = item.selectedOption === question.answer;
      if (correct) correctCount++;

      await Attempt.create({
        userId: req.user.id,
        questionId: question._id,
        skill: question.skill,
        selectedOption: item.selectedOption,
        correctness: correct,
        quizType: 'adaptive',
      });

      const mastery = await updateSkillMastery(req.user.id, question.skill, correct);
      results.push({
        questionId: question._id,
        skill: question.skill,
        correct,
        question: question.text,
        yourAnswer: question.options[item.selectedOption] ?? null,
        correctAnswer: question.options[question.answer],
        explanation: question.explanation || null,
        updatedMastery: mastery.masteryScore,
      });
    }

    const masteryMap = await getMasteryMap(req.user.id);
    let analytics = { averageMastery: 0.5, averageMasteryPercent: 50, weakestSkills: [], learningPath: [] };
    let recommendations = [];

    try {
      analytics = await mlService.getAnalytics(masteryMap);
      recommendations = await mlService.getBatchRecommendations(masteryMap);
    } catch (_err) {
      // Fallback if ML service is unavailable
      analytics = {
        averageMastery: 0.5,
        averageMasteryPercent: 50,
        weakestSkills: Object.entries(masteryMap).map(([skill, s]) => ({ skill, masteryScore: s, masteryPercent: Math.round(s * 100) })).slice(0, 3),
        learningPath: ALL_SKILLS.slice(0, 5),
      };
    }

    await Recommendation.deleteMany({ userId: req.user.id });
    for (const rec of recommendations) {
      await Recommendation.create({
        userId: req.user.id,
        skill: rec.skill,
        masteryScore: rec.masteryScore,
        explanation: rec.explanation,
        commonError: rec.commonError,
        suggestedAction: rec.suggestedAction,
      });
    }

    res.json({
      results,
      summary: {
        total: results.length,
        correct: correctCount,
        scorePercent: Math.round((correctCount / results.length) * 100),
      },
      masteryMap,
      analytics,
      recommendations,
    });
  } catch (err) {
    res.status(err.code === 'ML_UNAVAILABLE' ? 503 : 500).json({ error: err.message });
  }
});

// POST /api/quiz/answer
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { questionId, selectedOption, quizType = 'adaptive' } = req.body;
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const correct = selectedOption === question.answer;
    await Attempt.create({
      userId: req.user.id,
      questionId: question._id,
      skill: question.skill,
      selectedOption,
      correctness: correct,
      quizType,
    });

    const mastery = await updateSkillMastery(req.user.id, question.skill, correct);

    res.json({
      correct,
      correctAnswer: question.answer,
      explanation: question.explanation,
      skill: question.skill,
      updatedMastery: mastery.masteryScore,
    });
  } catch (err) {
    res.status(err.code === 'ML_UNAVAILABLE' ? 503 : 500).json({ error: err.message });
  }
});

module.exports = router;
