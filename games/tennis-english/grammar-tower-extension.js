const CONTEXT_VERSION = 1;
const CONTEXT_TYPE = 'grammar-tower';

const requireText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
};

export const AI_GENERATION_POLICY = Object.freeze({
  allowedTypes: Object.freeze(['explanation', 'example-candidate', 'npc-copy']),
  forbiddenFields: Object.freeze([
    'answer',
    'targetCardId',
    'distractorIds',
    'correctOption',
    'cardId',
    'mastery',
    'reviewInterval'
  ]),
  requiresHumanReview: true
});

export function createGrammarTowerContext({
  themeId,
  themeTitle,
  floorId,
  floorNumber,
  chapterId,
  nodeId,
  returnTo
} = {}) {
  if (!Number.isInteger(floorNumber) || floorNumber < 1) {
    throw new Error('floorNumber must be a positive integer');
  }
  return {
    contextType: CONTEXT_TYPE,
    version: CONTEXT_VERSION,
    themeId: requireText(themeId, 'themeId'),
    themeTitle: requireText(themeTitle, 'themeTitle'),
    floorId: requireText(floorId, 'floorId'),
    floorNumber,
    chapterId: requireText(chapterId, 'chapterId'),
    returnContext: {
      chapterId: requireText(chapterId, 'chapterId'),
      nodeId: requireText(nodeId, 'nodeId'),
      returnTo: requireText(returnTo, 'returnTo')
    }
  };
}

export function validateAiDraft(draft = {}) {
  if (!AI_GENERATION_POLICY.allowedTypes.includes(draft.type)) {
    throw new Error(`AI draft type is not allowed: ${draft.type || 'missing'}`);
  }
  for (const field of AI_GENERATION_POLICY.forbiddenFields) {
    if (Object.prototype.hasOwnProperty.call(draft, field)) {
      throw new Error(`AI draft cannot contain ${field}`);
    }
  }
  const text = requireText(draft.text, 'text');
  return {
    accepted: true,
    type: draft.type,
    text,
    source: draft.source || 'ai-candidate',
    requiresHumanReview: AI_GENERATION_POLICY.requiresHumanReview,
    canSetAnswer: false
  };
}
