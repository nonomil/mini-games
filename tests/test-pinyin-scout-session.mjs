import assert from 'node:assert/strict';

import { PINYIN_CARD_DATA } from '../games/pinyin-star-scout/pinyin-data.js';
import { PINYIN_QUESTION_TYPES } from '../games/pinyin-star-scout/pinyin-domain.js';
import { createPinyinScoutSession } from '../games/pinyin-star-scout/pinyin-scout-session.js';
import { createConfiguredPinyinTrack } from '../games/pinyin-star-scout/pinyin-track-config.js';

const mountain = PINYIN_CARD_DATA.find((card) => card.cardId === 'pinyin:starter:mountain');
const water = PINYIN_CARD_DATA.find((card) => card.cardId === 'pinyin:starter:water');
assert.ok(mountain);
assert.ok(water);

const session = createPinyinScoutSession({
  sessionId: 'scout-session-001',
  cards: [mountain, water],
  track: createConfiguredPinyinTrack(),
  questionType: PINYIN_QUESTION_TYPES.FINAL_CHOICE
});

assert.equal(session.getSnapshot().questionType, PINYIN_QUESTION_TYPES.FINAL_CHOICE);
assert.equal(session.getCurrentCard().cardId, mountain.cardId);
assert.ok(session.getAnswerOptions().some((option) => option.response === mountain.final));
session.mount();
assert.deepEqual(session.chooseAnswer(mountain.final), {
  accepted: true,
  response: mountain.final
});
const wideRoute = session.chooseRoute({ branchId: 'wide' });
assert.equal(wideRoute.correct, true);
assert.equal(wideRoute.routeDecision.accepted, true);
assert.equal(wideRoute.routeDecision.consequence, 'recovery');
assert.equal(session.getSnapshot().track.routeChoices['initial-final-fork'], 'wide');

const playbackSession = createPinyinScoutSession({
  sessionId: 'scout-session-playback',
  cards: [mountain, water],
  track: createConfiguredPinyinTrack(),
  questionType: PINYIN_QUESTION_TYPES.FINAL_CHOICE
});
playbackSession.mount();
playbackSession.slow('playback', 0.5);
assert.equal(playbackSession.getSnapshot().learningClock.mode, 'slowed');
assert.equal(playbackSession.getSnapshot().learningClock.reason, 'playback');
assert.equal(playbackSession.getSnapshot().learningClock.multiplier, 0.5);
playbackSession.resume();
assert.equal(playbackSession.getSnapshot().learningClock.mode, 'running');

const wrongSession = createPinyinScoutSession({
  sessionId: 'scout-session-002',
  cards: [mountain, water],
  track: createConfiguredPinyinTrack(),
  questionType: PINYIN_QUESTION_TYPES.FINAL_CHOICE
});
wrongSession.mount();
wrongSession.chooseAnswer('ou');
const wrongRoute = wrongSession.chooseRoute({ branchId: 'inner' });
assert.equal(wrongRoute.correct, false);
assert.equal(wrongSession.getSnapshot().learningClock.reason, 'review');
assert.equal(wrongSession.getSnapshot().reviewQueue.length, 1);
const reviewRoute = wrongSession.submitReviewAnswer(mountain.final);
assert.equal(reviewRoute.correct, true);
assert.equal(reviewRoute.routeDecision.accepted, true);
assert.equal(wrongSession.getSnapshot().reviewQueue.length, 0);
assert.equal(wrongSession.getSnapshot().track.routeChoices['initial-final-fork'], 'inner');
assert.equal(wrongSession.getCurrentCard().cardId, water.cardId);

const savedSession = wrongSession.getSessionSnapshot();
const restoredSession = createPinyinScoutSession({
  sessionId: 'ignored-session-id',
  cards: [mountain, water],
  track: createConfiguredPinyinTrack(),
  snapshot: savedSession,
  questionType: PINYIN_QUESTION_TYPES.FINAL_CHOICE
});
assert.equal(restoredSession.getSnapshot().sessionId, 'scout-session-002');
assert.equal(restoredSession.getSnapshot().track.routeChoices['initial-final-fork'], 'inner');
assert.equal(restoredSession.getCurrentCard().cardId, water.cardId);

console.log('PASS pinyin scout session bridge and route review contracts');
