const DEFAULT_REVIEW_LIMIT = 6;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function cardIdForTask(task) {
  return String(task?.cardId || task?.id || "").trim();
}

function uniqueIds(values) {
  const seen = new Set();
  const ids = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = String(value || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function buildIndependentReviewQueue(tasks, snapshot, options = {}) {
  const limitValue = Number(options.limit);
  const limit = Number.isFinite(limitValue)
    ? Math.max(0, Math.floor(limitValue))
    : DEFAULT_REVIEW_LIMIT;
  if (!limit || !Array.isArray(tasks)) return [];

  const taskByCardId = new Map();
  tasks.forEach((task) => {
    const cardId = cardIdForTask(task);
    if (cardId && !taskByCardId.has(cardId)) taskByCardId.set(cardId, task);
  });

  return uniqueIds(snapshot?.session?.mistakeCardIds)
    .map((cardId) => taskByCardId.get(cardId))
    .filter(Boolean)
    .slice(0, limit);
}

export function summarizeIndependentSession(snapshot) {
  const session = snapshot?.session || {};
  const presentations = session.presentations && typeof session.presentations === "object"
    ? session.presentations
    : {};
  const results = Array.isArray(session.cardResults) ? session.cardResults : [];
  const independentCorrect = results.filter((item) => item?.result === "independent-correct").length;
  const guidedCorrect = results.filter((item) => item?.result === "guided-correct").length;
  const gaveUp = results.filter((item) => item?.result === "gave-up").length;
  const hintCount = Object.values(presentations)
    .reduce((total, presentation) => total + Math.max(0, finiteNumber(presentation?.hintUsed)), 0);

  return {
    presented: Object.keys(presentations).length,
    completed: results.length,
    independentCorrect,
    guidedCorrect,
    gaveUp,
    hintCount,
    firstAnswerRate: results.length ? Math.round((independentCorrect / results.length) * 100) : 0,
    mistakeCardIds: uniqueIds(session.mistakeCardIds)
  };
}
