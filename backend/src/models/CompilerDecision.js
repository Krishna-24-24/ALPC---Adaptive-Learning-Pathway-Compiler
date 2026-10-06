const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  id: String,
  status: { type: String, enum: ['success', 'error', 'skipped'] },
  stdout: String,
  stderr: String,
  exitCode: Number,
}, { _id: false });

const compilerDecisionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, required: true },
  pathwayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pathway' },
  pathLangSource: { type: String, required: true },
  outcome: { type: String, default: null },
  alignmentScore: { type: Number, default: null },
  binaryOutput: { type: String, default: null },
  stages: [stageSchema],
  performance: { type: Number },
  mastery: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

compilerDecisionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CompilerDecision', compilerDecisionSchema);
