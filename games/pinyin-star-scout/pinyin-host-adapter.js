import { PINYIN_DOMAIN, createPinyinCard } from './pinyin-domain.js';

function text(value) {
  return String(value ?? '').trim();
}

function readPinyinDisplay(source, assumePinyin) {
  const direct = text(source.pinyinDisplay || source.pinyin);
  if (direct) return direct;
  const isPinyin = assumePinyin
    || source.domain === PINYIN_DOMAIN
    || source.contentType === PINYIN_DOMAIN;
  return isPinyin ? text(source.translation) : '';
}

function fallbackCardId(char, pinyinDisplay) {
  const key = pinyinDisplay
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .replace(/[^a-zv]/g, '');
  return `pinyin:host:${char}:${key}`;
}

export function normalizePinyinHostCard(input, { allowGeneratedId = false, assumePinyin = false } = {}) {
  const source = input && typeof input === 'object' ? input : {};
  if (source.domain && source.domain !== PINYIN_DOMAIN) return null;
  if (source.contentType && source.contentType !== PINYIN_DOMAIN) return null;

  const char = text(source.char || source.character || source.word);
  const pinyinDisplay = readPinyinDisplay(source, assumePinyin);
  if (!char || !pinyinDisplay) return null;

  const cardId = text(source.cardId)
    || (allowGeneratedId ? fallbackCardId(char, pinyinDisplay) : '');
  if (!cardId) return null;

  const candidate = {
    cardId,
    domain: PINYIN_DOMAIN,
    char,
    pinyinDisplay,
    audio: text(source.audio) || 'speech-synthesis',
    example: text(source.example) || `${char}的拼音练习。`
  };
  ['pinyinKey', 'initial', 'final', 'tone'].forEach((field) => {
    if (source[field] !== undefined && source[field] !== null) candidate[field] = source[field];
  });

  try {
    const card = createPinyinCard(candidate);
    return Object.freeze({
      ...card,
      contentType: PINYIN_DOMAIN,
      pinyin: card.pinyinDisplay
    });
  } catch (_) {
    return null;
  }
}

export function normalizePinyinHostCards(cards, options = {}) {
  const source = Array.isArray(cards) ? cards : [];
  return source
    .map((card) => normalizePinyinHostCard(card, options))
    .filter(Boolean);
}
