const mongoose = require('mongoose');

/** One row per resource a student has marked as done. */
const studyProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, required: true },
  resourceId: { type: String, required: true },
  doneAt: { type: Date, default: Date.now },
});

studyProgressSchema.index({ userId: 1, skill: 1, resourceId: 1 }, { unique: true });

module.exports = mongoose.model('StudyProgress', studyProgressSchema);
