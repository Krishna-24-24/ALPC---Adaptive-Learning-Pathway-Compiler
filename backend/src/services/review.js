'use strict';

/**
 * Which topics are due for review. A topic is due once it has gone unpractised
 * for longer than its interval, and weaker topics get shorter intervals:
 *
 *   mastery below 40%   every 2 days
 *   40% to 69%          every 4 days
 *   70% and above       every 7 days
 *
 * The idea is spaced repetition: practise just before you would forget, and
 * more often for what you know least.
 */
const DAY = 24 * 60 * 60 * 1000;

function intervalDays(masteryScore) {
  if (masteryScore < 0.4) return 2;
  if (masteryScore < 0.7) return 4;
  return 7;
}

/**
 * @param {{skill: string, masteryScore: number}[]} mastery
 * @param {Record<string, Date>} lastPracticed  latest attempt per topic
 * @param {Date} now
 * @returns {{skill, masteryPercent, lastPracticed, daysSince, intervalDays}[]} most overdue first
 */
function dueForReview(mastery, lastPracticed, now = new Date()) {
  return mastery
    .filter(m => lastPracticed[m.skill])
    .map(m => {
      const last = new Date(lastPracticed[m.skill]);
      const daysSince = Math.floor((now - last) / DAY);
      return {
        skill: m.skill,
        masteryPercent: Math.round(m.masteryScore * 100),
        lastPracticed: last.toISOString(),
        daysSince,
        intervalDays: intervalDays(m.masteryScore),
      };
    })
    .filter(r => r.daysSince >= r.intervalDays)
    .sort((a, b) => b.daysSince / b.intervalDays - a.daysSince / a.intervalDays);
}

module.exports = { dueForReview, intervalDays };
