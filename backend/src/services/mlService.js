const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 5000,
});

// Replace low-level network errors with one that says what to do.
client.interceptors.response.use(undefined, (err) => {
  if (['ECONNREFUSED', 'ENOTFOUND', 'ECONNABORTED', 'ETIMEDOUT'].includes(err.code)) {
    const e = new Error(
      `The mastery service is not reachable at ${ML_SERVICE_URL}. Start it with npm run dev:ml and try again; your answers are still on the page.`
    );
    e.code = 'ML_UNAVAILABLE';
    throw e;
  }
  throw err;
});

async function updateMastery(skill, correct, currentMastery = 0.3) {
  const { data } = await client.post('/bkt/update', {
    skill,
    correct,
    currentMastery,
  });
  return data;
}

async function batchUpdateMastery(responses) {
  const { data } = await client.post('/bkt/batch-update', { responses });
  return data;
}

async function selectDifficulty(skill, mastery, availableDifficulties) {
  const { data } = await client.post('/irt/select-difficulty', {
    skill,
    mastery,
    availableDifficulties,
  });
  return data;
}

async function getAnalytics(masteryMap) {
  const { data } = await client.post('/analytics', { masteryMap });
  return data;
}

async function getRecommendation(masteryMap, skill = null) {
  const { data } = await client.post('/recommendations', { masteryMap, skill });
  return data;
}

async function getBatchRecommendations(masteryMap) {
  const { data } = await client.post('/recommendations/batch', { masteryMap });
  return data;
}

module.exports = {
  updateMastery,
  batchUpdateMastery,
  selectDifficulty,
  getAnalytics,
  getRecommendation,
  getBatchRecommendations,
};
