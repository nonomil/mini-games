import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameRoot = path.join(root, 'games', 'tennis-english');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

assert.ok(exists('games/tennis-english/index.html'), 'tennis entry should exist');
assert.ok(exists('games/tennis-english/styles.css'), 'tennis styles should exist');
assert.ok(exists('games/tennis-english/game-manifest.json'), 'tennis manifest should exist');
assert.ok(exists('games/tennis-english/tennis-content.js'), 'tennis content module should exist');
assert.ok(exists('games/tennis-english/tennis-session.js'), 'tennis session module should exist');
assert.ok(exists('games/tennis-english/game.js'), 'tennis browser runtime should exist');

const manifest = JSON.parse(read('games/tennis-english/game-manifest.json'));
assert.equal(manifest.gameId, 'tennis-english');
assert.equal(manifest.domain, 'english-expression');
assert.deepEqual(manifest.contentTypes, ['expression']);
assert.equal(manifest.responseMode, 'choice-return');
assert.deepEqual(manifest.cardSchema.requiredFields, [
  'cardId',
  'expression',
  'definitionEn',
  'definitionZh',
  'example',
  'audio',
  'level',
  'confusionSet'
]);
assert.equal(manifest.round.minExpressions, 6);
assert.equal(manifest.round.maxExpressions, 8);
assert.equal(manifest.round.defaultExpressions, 7);
assert.equal(manifest.protocolVersion, 1);
assert.deepEqual(manifest.runtime, { hostId: 'tennis-english', mode: 'standalone' });
assert.deepEqual(manifest.domains, ['english-expression']);
for (const capability of ['standalone', 'host', 'ready', 'init', 'card-result', 'complete', 'stop', 'error', 'idempotent-result']) {
  assert.ok(manifest.capabilities.includes(capability), `manifest should declare ${capability}`);
}
assert.deepEqual(manifest.cardSchema.required, ['cardId']);
assert.equal(manifest.cardSchema.unknownFields, 'ignore');
assert.equal(manifest.cardSchema.missingOptional, 'null');
assert.equal(manifest.cardSchema.preserveCardId, true);
assert.ok(exists('games/tennis-english/tennis-protocol.js'), 'tennis protocol fixture should exist');

const contentModule = await import(pathToFileURL(path.join(gameRoot, 'tennis-content.js')));
const sessionModule = await import(pathToFileURL(path.join(gameRoot, 'tennis-session.js')));
const protocolModule = await import(pathToFileURL(path.join(gameRoot, 'tennis-protocol.js')));
const {
  EXPRESSION_CARDS,
  REQUIRED_EXPRESSION_FIELDS,
  buildChoices,
  validateExpressionCard
} = contentModule;
const { PHASES, createTennisSession } = sessionModule;
const {
  PROTOCOL_TYPES,
  PROTOCOL_VERSION,
  createTennisProtocolFixture,
  normalizeExpressionCard
} = protocolModule;

assert.deepEqual(REQUIRED_EXPRESSION_FIELDS, manifest.cardSchema.requiredFields);
assert.ok(EXPRESSION_CARDS.length >= 8, 'content pack should have enough expressions for a standard short round');
const cardIds = new Set(EXPRESSION_CARDS.map((card) => card.cardId));
assert.equal(cardIds.size, EXPRESSION_CARDS.length, 'card ids must be stable and unique');
for (const card of EXPRESSION_CARDS) {
  assert.equal(validateExpressionCard(card).valid, true, `${card.cardId} should satisfy the expression contract`);
  assert.deepEqual(card.confusionSet.length, 2, `${card.cardId} should provide two reviewed distractors`);
  assert.ok(card.confusionSet.every((id) => cardIds.has(id)), `${card.cardId} distractors should resolve to cards`);
  assert.deepEqual(Object.keys(card.wrongAnswerFeedback).sort(), [...card.confusionSet].sort());
  for (const feedback of Object.values(card.wrongAnswerFeedback)) {
    assert.ok(['wrong-meaning', 'wrong-collocation', 'wrong-context'].includes(feedback.errorType));
    assert.ok(feedback.explanationZh && feedback.explanationEn);
  }
}

const errorTypes = new Set(EXPRESSION_CARDS.flatMap((card) =>
  Object.values(card.wrongAnswerFeedback).map((feedback) => feedback.errorType)
));
assert.deepEqual(
  [...errorTypes].sort(),
  ['wrong-collocation', 'wrong-context', 'wrong-meaning']
);

const target = EXPRESSION_CARDS[0];
const choices = buildChoices(EXPRESSION_CARDS, target);
assert.equal(choices.length, 3, 'each point should present three expression choices');
assert.equal(choices.filter((choice) => choice.cardId === target.cardId).length, 1);
assert.equal(new Set(choices.map((choice) => choice.cardId)).size, 3);
assert.ok(choices.every((choice) => cardIds.has(choice.cardId)));

const session = createTennisSession({
  cards: EXPRESSION_CARDS,
  roundSize: 7,
  sessionId: 'tennis-test-session'
});
assert.equal(session.getState().phase, PHASES.READY);
assert.equal(session.getState().roundSize, 7);

session.start();
assert.equal(session.getState().phase, PHASES.SERVE);
session.serve();
let state = session.getState();
assert.equal(state.phase, PHASES.CHOOSE);
assert.ok(state.current.prompt);
assert.equal(state.current.choices.length, 3);

const wrongChoice = state.current.choices.find((choice) => choice.cardId !== state.current.targetCardId);
session.selectCard(wrongChoice.cardId);
assert.equal(session.getState().phase, PHASES.RALLY);
const wrongResult = session.returnBall();
assert.equal(wrongResult.phase, PHASES.FEEDBACK);
assert.equal(wrongResult.result.correct, false);
assert.match(wrongResult.result.wrongTag, /^wrong-(meaning|collocation|context)$/);
assert.ok(wrongResult.result.feedback.explanationZh);
assert.ok(wrongResult.result.feedback.explanationEn);
assert.equal(wrongResult.score.player, 0);
assert.equal(wrongResult.score.opponent, 1);
session.nextPoint();
assert.equal(session.getState().phase, PHASES.SERVE);

const hintedSession = createTennisSession({
  cards: EXPRESSION_CARDS,
  roundSize: 6,
  sessionId: 'tennis-hint-session'
});
hintedSession.start();
hintedSession.serve();
hintedSession.useHint();
state = hintedSession.getState();
assert.equal(state.current.hintUsed, 1);
hintedSession.selectCard(state.current.targetCardId);
const hintedResult = hintedSession.returnBall();
assert.equal(hintedResult.result.correct, true);
assert.equal(hintedResult.result.learningEvidence, 'hint-correct');
assert.equal(hintedResult.result.independent, false);

const completeSession = createTennisSession({
  cards: EXPRESSION_CARDS,
  roundSize: 6,
  sessionId: 'tennis-complete-session'
});
completeSession.start();
for (let index = 0; index < 6; index += 1) {
  completeSession.serve();
  state = completeSession.getState();
  completeSession.selectCard(state.current.targetCardId);
  const point = completeSession.returnBall();
  assert.equal(point.result.learningEvidence, 'independent-correct');
  completeSession.nextPoint();
}
state = completeSession.getState();
assert.equal(state.phase, PHASES.COMPLETE);
assert.equal(state.results.length, 6);
assert.equal(state.score.player, 6);
assert.equal(completeSession.nextPoint().phase, PHASES.COMPLETE, 'completed rounds should be idempotent');
assert.equal(typeof completeSession.getReviewSet, 'function', 'completed sessions should expose a review set');
assert.equal(typeof completeSession.startReview, 'function', 'completed sessions should expose a review entry');
assert.equal(typeof completeSession.restart, 'function', 'completed sessions should expose a replay entry');
assert.deepEqual(completeSession.getReviewSet(), [], 'a perfect round should have no review set');
assert.equal(completeSession.startReview(), null, 'a perfect round should not create an empty review game');
const replaySession = completeSession.restart();
assert.equal(replaySession.getState().phase, PHASES.READY, 'replay should start a fresh ready session');
assert.equal(replaySession.getState().mode, 'standard');
assert.notEqual(replaySession.getState().sessionId, completeSession.getState().sessionId);
assert.equal(completeSession.getState().results.length, 6, 'replay must not mutate the completed session');

const partialSession = createTennisSession({
  cards: EXPRESSION_CARDS,
  roundSize: 6,
  sessionId: 'tennis-partial-session'
});
partialSession.start();
for (let index = 0; index < 6; index += 1) {
  partialSession.serve();
  state = partialSession.getState();
  const selectedCardId = index === 0
    ? state.current.choices.find((choice) => choice.cardId !== state.current.targetCardId).cardId
    : state.current.targetCardId;
  partialSession.selectCard(selectedCardId);
  partialSession.returnBall();
  partialSession.nextPoint();
}
state = partialSession.getState();
assert.equal(state.phase, PHASES.COMPLETE);
const reviewSet = partialSession.getReviewSet();
assert.equal(reviewSet.length, 1, 'partial round should expose one unique wrong expression');
assert.equal(reviewSet[0].cardId, EXPRESSION_CARDS[0].cardId);
assert.match(reviewSet[0].wrongTag, /^wrong-(meaning|collocation|context)$/);
assert.ok(reviewSet[0].feedback.explanationZh);
assert.ok(reviewSet[0].feedback.explanationEn);
assert.equal(reviewSet[0].mistakeCount, 1);
const reviewSession = partialSession.startReview();
assert.ok(reviewSession, 'partial round should provide a review session');
state = reviewSession.getState();
assert.equal(state.mode, 'review');
assert.equal(state.roundSize, 6, 'review sessions must keep the 6-8 point state machine');
assert.deepEqual(state.reviewCardIds, [EXPRESSION_CARDS[0].cardId]);
reviewSession.start();
reviewSession.serve();
assert.equal(reviewSession.getState().current.targetCardId, EXPRESSION_CARDS[0].cardId);
reviewSession.selectCard(reviewSession.getState().current.targetCardId);
const reviewPoint = reviewSession.returnBall();
assert.equal(reviewPoint.result.cardId, EXPRESSION_CARDS[0].cardId);
assert.equal(reviewPoint.result.learningEvidence, 'independent-correct');

assert.equal(PROTOCOL_VERSION, 1);
assert.deepEqual(PROTOCOL_TYPES, ['ready', 'init', 'card-result', 'complete', 'stop', 'error']);
const returnContext = { chapterId: 'chapter-01', nodeId: 'tennis-01', returnTo: 'forest-map' };
const protocol = createTennisProtocolFixture({
  sessionId: 'tennis-protocol-session',
  returnContext
});
const readyMessage = protocol.ready();
assert.deepEqual(readyMessage, {
  type: 'ready',
  protocolVersion: 1,
  sessionId: 'tennis-protocol-session',
  gameId: 'tennis-english',
  cardId: null,
  payload: { returnContext }
});
const normalizedCard = normalizeExpressionCard(EXPRESSION_CARDS[0]);
assert.equal(normalizedCard.cardId, EXPRESSION_CARDS[0].cardId);
assert.equal(normalizedCard.domain, 'english-expression');
assert.equal(normalizedCard.contentType, 'expression');
const sparseCard = normalizeExpressionCard({ cardId: 'english-expression:sparse-card' });
assert.equal(sparseCard.word, null);
assert.equal(sparseCard.translation, null);
assert.equal(sparseCard.example, null);
assert.equal(sparseCard.audio, null);
assert.equal(sparseCard.domain, 'english-expression');
assert.equal(sparseCard.contentType, 'expression');
assert.throws(
  () => normalizeExpressionCard({ ...EXPRESSION_CARDS[0], domain: 'english' }),
  /must use domain english-expression/
);
const initMessage = protocol.init(EXPRESSION_CARDS[0]);
assert.equal(initMessage.type, 'init');
assert.equal(initMessage.cardId, EXPRESSION_CARDS[0].cardId);
assert.equal(initMessage.payload.card.cardId, EXPRESSION_CARDS[0].cardId);
assert.equal(initMessage.payload.card.domain, 'english-expression');
assert.equal(initMessage.payload.card.contentType, 'expression');
assert.deepEqual(initMessage.payload.returnContext, returnContext);
const cardResultMessage = protocol.cardResult({
  cardId: EXPRESSION_CARDS[0].cardId,
  correct: false,
  learningEvidence: 'wrong',
  wrongTag: 'wrong-meaning',
  promptMode: 'definition-en'
});
assert.equal(cardResultMessage.type, 'card-result');
assert.equal(cardResultMessage.cardId, EXPRESSION_CARDS[0].cardId);
assert.equal(cardResultMessage.payload.cardId, EXPRESSION_CARDS[0].cardId);
assert.equal(cardResultMessage.payload.domain, 'english-expression');
assert.equal(cardResultMessage.payload.contentType, 'expression');
assert.deepEqual(cardResultMessage.payload.returnContext, returnContext);
assert.equal(cardResultMessage.payload.mastery, undefined, 'protocol payload must not write mastery');
assert.equal(cardResultMessage.payload.reviewInterval, undefined, 'protocol payload must not write review scheduling');
assert.equal(protocol.cardResult({ cardId: EXPRESSION_CARDS[0].cardId, correct: true }), null, 'card result must be idempotent');
const completeMessage = protocol.complete({ score: { player: 0, opponent: 1 }, resultCount: 1 });
assert.equal(completeMessage.type, 'complete');
assert.equal(completeMessage.cardId, null);
assert.deepEqual(completeMessage.payload.returnContext, returnContext);
assert.equal(completeMessage.payload.mastery, undefined);
assert.equal(completeMessage.payload.profile, undefined);
assert.equal(protocol.complete({ score: { player: 1, opponent: 1 } }), null, 'complete must be idempotent');
assert.equal(protocol.getState().phase, 'complete');

assert.ok(exists('games/tennis-english/grammar-tower-extension.js'), 'grammar tower extension boundary should exist');
const extensionModule = await import(pathToFileURL(path.join(gameRoot, 'grammar-tower-extension.js')));
const {
  AI_GENERATION_POLICY,
  createGrammarTowerContext,
  validateAiDraft
} = extensionModule;
const towerContext = createGrammarTowerContext({
  themeId: 'tennis-basics',
  themeTitle: '球场基础表达',
  floorId: 'floor-02',
  floorNumber: 2,
  chapterId: 'chapter-english-01',
  nodeId: 'tennis-tower-02',
  returnTo: 'forest-map'
});
assert.deepEqual(towerContext, {
  contextType: 'grammar-tower',
  version: 1,
  themeId: 'tennis-basics',
  themeTitle: '球场基础表达',
  floorId: 'floor-02',
  floorNumber: 2,
  chapterId: 'chapter-english-01',
  returnContext: {
    chapterId: 'chapter-english-01',
    nodeId: 'tennis-tower-02',
    returnTo: 'forest-map'
  }
});
assert.throws(
  () => createGrammarTowerContext({ ...towerContext, floorNumber: 0 }),
  /floorNumber must be a positive integer/
);
assert.ok(AI_GENERATION_POLICY.allowedTypes.includes('explanation'));
assert.ok(AI_GENERATION_POLICY.allowedTypes.includes('example-candidate'));
assert.ok(AI_GENERATION_POLICY.allowedTypes.includes('npc-copy'));
assert.ok(AI_GENERATION_POLICY.forbiddenFields.includes('answer'));
assert.ok(AI_GENERATION_POLICY.forbiddenFields.includes('targetCardId'));
const explanationDraft = validateAiDraft({
  type: 'explanation',
  text: 'This phrase describes a future plan.',
  source: 'ai'
});
assert.equal(explanationDraft.accepted, true);
assert.equal(explanationDraft.requiresHumanReview, true);
assert.equal(explanationDraft.canSetAnswer, false);
for (const field of AI_GENERATION_POLICY.forbiddenFields) {
  const forbiddenValue = field === 'distractorIds' ? ['card-1'] : 'forbidden';
  assert.throws(
    () => validateAiDraft({
      type: 'explanation',
      text: 'Reviewed candidate.',
      [field]: forbiddenValue
    }),
    new RegExp(`AI draft cannot contain ${field}`)
  );
  assert.equal(Object.prototype.hasOwnProperty.call(explanationDraft, field), false);
}
assert.throws(
  () => validateAiDraft({ type: 'answer', answer: 'look forward to' }),
  /AI draft type is not allowed/
);
const towerProtocol = createTennisProtocolFixture({
  sessionId: 'tennis-tower-session',
  returnContext: towerContext
});
towerProtocol.ready();
assert.deepEqual(towerProtocol.messages[0].payload.returnContext, towerContext);

const errorProtocol = createTennisProtocolFixture({ sessionId: 'tennis-error-session' });
errorProtocol.ready();
const errorMessage = errorProtocol.error({ code: 'invalid-card', message: 'Expression card rejected' });
assert.equal(errorMessage.type, 'error');
assert.equal(errorMessage.cardId, null);
assert.equal(errorMessage.payload.code, 'invalid-card');
assert.equal(errorMessage.payload.message, 'Expression card rejected');
assert.equal(errorMessage.payload.mastery, undefined);

const stoppedProtocol = createTennisProtocolFixture({ sessionId: 'tennis-stop-session' });
let cleanupCount = 0;
assert.equal(typeof stoppedProtocol.registerCleanup, 'function', 'protocol should expose cleanup registration');
assert.equal(stoppedProtocol.registerCleanup(() => { cleanupCount += 1; }), true);
stoppedProtocol.ready();
const stopMessage = stoppedProtocol.stop({ reason: 'user' });
assert.equal(stopMessage.type, 'stop');
assert.equal(stopMessage.cardId, null);
assert.deepEqual(stopMessage.payload.returnContext, null);
assert.equal(cleanupCount, 1, 'stop should run registered cleanup once');
assert.equal(stoppedProtocol.stop(), null, 'stop must be idempotent');
assert.equal(cleanupCount, 1, 'repeated stop must not rerun cleanup');
assert.equal(stoppedProtocol.registerCleanup(() => { cleanupCount += 1; }), false, 'stopped protocol rejects new cleanup');
assert.equal(stoppedProtocol.complete({ score: { player: 0, opponent: 0 } }), null, 'stopped protocol rejects complete');
assert.equal(stoppedProtocol.error({ code: 'late-error', message: 'ignored' }), null, 'stopped protocol rejects error');
assert.equal(stoppedProtocol.getState().phase, 'stopped');

const html = read('games/tennis-english/index.html');
const runtime = read('games/tennis-english/game.js');
const protocolRuntime = read('games/tennis-english/tennis-protocol.js');
const styles = read('games/tennis-english/styles.css');
assert.match(html, /type="module"/);
assert.match(runtime, /keydown/);
assert.match(runtime, /dataset\.choiceIndex/);
assert.match(runtime, /ArrowLeft|ArrowRight/);
assert.match(runtime, /Space/);
assert.match(runtime, /pointerdown/);
assert.match(runtime, /wrong-meaning|wrong-collocation|wrong-context/);
assert.match(runtime, /getReviewSet/);
assert.match(runtime, /startReview/);
assert.match(runtime, /restart/);
assert.match(runtime, /item\.feedback\.explanationZh/);
assert.match(runtime, /item\.feedback\.explanationEn/);
assert.match(runtime, /els\.review\.hidden\s*=\s*true/);
assert.match(protocolRuntime, /protocolVersion/);
assert.match(protocolRuntime, /returnContext/);
assert.doesNotMatch(protocolRuntime, /postMessage/);
assert.match(html, /复习错题/);
assert.match(html, /result-list/);
assert.match(styles, /@media\s*\(max-width:\s*720px\)/);
assert.match(styles, /touch-action:\s*manipulation/);

console.log(`PASS tennis English contract: ${EXPRESSION_CARDS.length} expression cards, default round ${manifest.round.defaultExpressions}`);
