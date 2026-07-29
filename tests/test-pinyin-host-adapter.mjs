import assert from 'node:assert/strict';
import {
  normalizePinyinHostCard,
  normalizePinyinHostCards
} from '../games/pinyin-star-scout/pinyin-host-adapter.js';

const standardCard = {
  cardId: 'pinyin:host:mountain',
  word: '山',
  translation: 'shān',
  audio: null,
  example: null,
  domain: 'pinyin',
  contentType: 'pinyin'
};

const normalized = normalizePinyinHostCard(standardCard);
assert.equal(normalized.cardId, standardCard.cardId);
assert.equal(normalized.domain, 'pinyin');
assert.equal(normalized.contentType, 'pinyin');
assert.equal(normalized.char, '山');
assert.equal(normalized.pinyinDisplay, 'shān');
assert.equal(normalized.pinyinKey, 'shan');
assert.equal(normalized.initial, 'sh');
assert.equal(normalized.final, 'an');
assert.equal(normalized.tone, 1);
assert.equal(normalized.audio, 'speech-synthesis');
assert.equal(normalized.example, '山的拼音练习。');

assert.equal(
  normalizePinyinHostCard({ ...standardCard, domain: 'english' }),
  null,
  '英语卡不能进入拼音适配器'
);
assert.equal(
  normalizePinyinHostCard({ ...standardCard, contentType: 'word' }),
  null,
  '英语 contentType 不能进入拼音适配器'
);
assert.equal(
  normalizePinyinHostCard({ ...standardCard, cardId: '' }),
  null,
  'CORE v1 卡缺少原始 cardId 时必须拒绝'
);
assert.equal(
  normalizePinyinHostCard({ word: '山', translation: 'shān' }),
  null,
  '缺少 domain 的泛化卡不能默认进入拼音适配器'
);

const legacyCard = normalizePinyinHostCard({
  word: '水',
  translation: 'shuǐ'
}, { allowGeneratedId: true, assumePinyin: true });
assert.equal(legacyCard.cardId, 'pinyin:host:水:shui');
assert.equal(legacyCard.pinyinKey, 'shui');

const cards = normalizePinyinHostCards([
  standardCard,
  { ...standardCard, cardId: 'pinyin:host:water', word: '水', translation: 'shuǐ' },
  { cardId: 'english:host:attack', word: 'attack', translation: '攻击', domain: 'english', contentType: 'word' }
]);
assert.deepEqual(cards.map((card) => card.cardId), [
  'pinyin:host:mountain',
  'pinyin:host:water'
]);

console.log('PASS pinyin host card adapter contracts');
