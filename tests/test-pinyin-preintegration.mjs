import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { V1_FIXTURE } from './fixtures/contract-v1-fixture.mjs';
import { PINYIN_CARD_DATA } from '../games/pinyin-star-scout/pinyin-data.js';
import { createPinyinRacerRuntime } from '../games/pinyin-star-scout/pinyin-runtime.js';
import { createTrack } from '../games/pinyin-star-scout/pinyin-track.js';
import { createPinyinPreintegrationFixture } from '../games/pinyin-star-scout/pinyin-preintegration-fixture.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('host/manifests/pinyin-racer.game-manifest.json'));
const learningArcadeSource = read('games/learning-arcade/game.js');
const pinyinRuntimeSource = read('games/pinyin-star-scout/pinyin-runtime.js');
const fixture = createPinyinPreintegrationFixture({
  sessionId: 'pinyin-preintegration-session-001',
  returnContext: {
    chapterId: 'pinyin-chapter-01',
    nodeId: 'word-cannon-node',
    returnTo: 'learning-arcade'
  }
});

assert.equal(fixture.fixtureOnly, true, 'preintegration payloads must be explicitly fixture-only');
assert.equal(fixture.coreProtocolVersion, V1_FIXTURE.protocolVersion);
assert.deepEqual(fixture.messageTypes, ['ready', 'init', 'card-result', 'complete', 'stop', 'error']);
assert.equal(fixture.identity.gameId, 'pinyin-racer');
assert.equal(fixture.card.domain, 'pinyin');
assert.equal(fixture.card.contentType, 'pinyin');
assert.equal(fixture.card.cardId, PINYIN_CARD_DATA[0].cardId);
assert.equal(fixture.card.word, PINYIN_CARD_DATA[0].char);
assert.equal(fixture.card.translation, PINYIN_CARD_DATA[0].pinyinDisplay);
assert.deepEqual(manifest.domains, ['pinyin']);
assert.deepEqual(manifest.runtime, { hostId: 'learning-arcade', mode: 'word-cannon' });
assert.ok(manifest.cardSchema.optional.includes('domain'));
assert.ok(manifest.cardSchema.optional.includes('contentType'));

const coreEnvelopeKeys = ['cardId', 'gameId', 'payload', 'protocolVersion', 'sessionId', 'type'];
const coreMessageTypes = new Set(Object.values(V1_FIXTURE.messages).map((message) => message.type));
for (const message of Object.values(fixture.messages)) {
  assert.deepEqual(Object.keys(message).sort(), coreEnvelopeKeys);
  assert.equal(message.protocolVersion, V1_FIXTURE.protocolVersion);
  assert.equal(typeof message.sessionId, 'string');
  assert.equal(message.sessionId, fixture.identity.sessionId);
  assert.equal(message.gameId, fixture.identity.gameId);
  assert.ok(coreMessageTypes.has(message.type), `${message.type} must use a CORE v1 message type`);
}

const initMessage = fixture.messages.init;
assert.equal(initMessage.cardId, fixture.card.cardId);
assert.equal(initMessage.payload.card.cardId, fixture.card.cardId);
assert.equal(initMessage.payload.card.domain, 'pinyin');
assert.equal(initMessage.payload.card.contentType, 'pinyin');
assert.deepEqual(initMessage.payload.returnContext, fixture.returnContext);
assert.deepEqual(initMessage.payload.snapshot.returnContext, fixture.returnContext);
assert.equal(initMessage.returnContext, undefined, 'returnContext belongs in payload, not the CORE envelope');

const cardResultMessage = fixture.messages.cardResult;
assert.equal(cardResultMessage.cardId, fixture.card.cardId);
assert.equal(cardResultMessage.payload.cardId, fixture.card.cardId);
assert.equal(cardResultMessage.payload.domain, 'pinyin');
assert.equal(cardResultMessage.payload.contentType, 'pinyin');
assert.deepEqual(cardResultMessage.payload.returnContext, fixture.returnContext);
assert.equal(fixture.messages.complete.cardId, null);
assert.equal(fixture.messages.stop.cardId, null);
assert.equal(fixture.messages.error.cardId, null);

assert.equal(fixture.snapshot.version, 1);
assert.equal(fixture.snapshot.domain, 'pinyin');
assert.equal(fixture.snapshot.sessionId, fixture.identity.sessionId);
assert.equal(fixture.snapshot.gameId, fixture.identity.gameId);
assert.equal(fixture.snapshot.currentCardId, fixture.card.cardId);
assert.deepEqual(fixture.snapshot.returnContext, fixture.returnContext);

const runtime = createPinyinRacerRuntime({
  sessionId: fixture.identity.sessionId,
  cards: PINYIN_CARD_DATA.slice(0, 1),
  track: createTrack({
    id: 'pinyin-preintegration-straight',
    segments: [{ id: 'straight', type: 'straight', length: 240, laneCount: 3, roadWidth: 180 }]
  }),
  speed: 0
});
const runtimeSnapshot = runtime.getSnapshot();
assert.equal(runtimeSnapshot.domain, 'pinyin');
assert.equal(runtimeSnapshot.sessionId, fixture.identity.sessionId);
assert.equal(runtimeSnapshot.currentCardId, fixture.card.cardId);
assert.equal(runtimeSnapshot.status, fixture.snapshot.status);
assert.equal(runtimeSnapshot.questionType, fixture.snapshot.questionType);
assert.equal(runtimeSnapshot.track.cameraDistance, fixture.snapshot.track.cameraDistance);
assert.equal(runtimeSnapshot.input, undefined, 'pinyin runtime must not depend on an English input buffer');
assert.equal(runtimeSnapshot.currentTyped, undefined, 'pinyin runtime must not depend on word-shooter typing state');
runtime.mount();
assert.equal(runtime.submitAnswer('shān').correct, true);

assert.doesNotMatch(pinyinRuntimeSource, /inputBuffer|currentTyped|wordShooter|wordInput/);
assert.match(learningArcadeSource, /function openGame\(gameId\)/);
assert.match(learningArcadeSource, /'word-cannon'/);
assert.match(learningArcadeSource, /function wordCannonSnapshot\(\)/);
assert.match(learningArcadeSource, /source: LEARNING_ARCADE_BRIDGE_SOURCE/);
assert.match(learningArcadeSource, /sessionId: learningArcadeBridge\.sessionId/);
assert.match(learningArcadeSource, /activeGame: state\.activeGame/);
assert.doesNotMatch(learningArcadeSource, /MiniGamesBridge\.(ready|reportCardResult|complete)/);
assert.doesNotMatch(learningArcadeSource, /returnContext/);
const legacyResultStart = learningArcadeSource.indexOf("emitLearningArcadeBridge('result'");
const legacyResultEnd = learningArcadeSource.indexOf("});", legacyResultStart);
assert.ok(legacyResultStart >= 0 && legacyResultEnd > legacyResultStart, 'word-cannon legacy result boundary should remain discoverable');
const legacyResultBoundary = learningArcadeSource.slice(legacyResultStart, legacyResultEnd);
assert.doesNotMatch(legacyResultBoundary, /cardId|returnContext/);

const cannonInputStart = learningArcadeSource.indexOf('function inputWordCannonLetter');
const cannonInputEnd = learningArcadeSource.indexOf('function currentSnakeTarget', cannonInputStart);
assert.ok(cannonInputStart >= 0 && cannonInputEnd > cannonInputStart, 'word-cannon input boundary should remain discoverable');
const cannonInputBoundary = learningArcadeSource.slice(cannonInputStart, cannonInputEnd);
assert.match(cannonInputBoundary, /moveWordCannonPlayer/);
assert.doesNotMatch(cannonInputBoundary, /inputWordLetter|state\.input\s*=|currentTyped\s*\+=/);

assert.deepEqual(fixture.ownership, {
  sharedEntry: 'games/learning-arcade/game.js',
  owner: 'SHOOTER',
  confirmation: 'main-control',
  status: 'fixture-only'
});

console.log('PASS pinyin preintegration fixture, word-cannon boundary, and no-English-buffer contracts');
