'use strict';

/**
 * A question as sent to the browser, with its options in a fresh random order.
 * `optionIndex[i]` is the stored index of the option shown at position i; the
 * browser sends that stored index back, so the answer key never leaves the
 * server and the right answer is not always in the same place.
 */
function present(q, extra = {}) {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    id: q._id,
    skill: q.skill,
    difficulty: q.difficulty,
    text: q.text,
    options: order.map(i => q.options[i]),
    optionIndex: order,
    ...extra,
  };
}

/** Answers with a usable option index; anything else (unanswered) is ignored. */
function answeredOnly(answers) {
  return answers.filter(a => a && a.questionId && Number.isInteger(a.selectedOption) && a.selectedOption >= 0);
}

module.exports = { present, answeredOnly };
