const mongoose = require('mongoose');

const pathwaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  topic: { type: String, required: true },
  description: { type: String, default: '' },
  outcomes: [{
    name: { type: String, required: true },
    adjustment: { type: Number, default: 0 },
  }],
  rules: [{
    variable: { type: String, required: true },
    operator: { type: String, enum: ['<', '>', '==', '>=', '<=', '!='], required: true },
    value: { type: Number, required: true },
    outcome: { type: String, required: true },
  }],
  defaultPathLang: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Pathway', pathwaySchema);
