export const PINYIN_DOMAIN = 'pinyin';

export const PINYIN_QUESTION_TYPES = Object.freeze({
  LISTENING_CHOICE: 'listen-pinyin-choice',
  CHARACTER_CHOICE: 'character-pinyin-choice',
  INITIAL_CHOICE: 'initial-choice',
  FINAL_CHOICE: 'final-choice',
  TONE_CHOICE: 'tone-choice',
  PINYIN_INPUT: 'pinyin-input'
});

export const PINYIN_ERROR_TAGS = Object.freeze({
  WRONG_INITIAL: 'wrong-initial',
  WRONG_FINAL: 'wrong-final',
  WRONG_TONE: 'wrong-tone',
  WRONG_CHARACTER: 'wrong-character',
  MISSED_CARD: 'missed-card'
});

const INITIALS = Object.freeze([
  'zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'
]);

const TONE_MARKS = Object.freeze({
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['v', 1], ǘ: ['v', 2], ǚ: ['v', 3], ǜ: ['v', 4]
});

const QUESTION_TYPE_SET = new Set(Object.values(PINYIN_QUESTION_TYPES));
const TONE_VALUES = new Set([1, 2, 3, 4, 5]);

function asText(value) {
  return String(value ?? '').trim();
}

export function toneOfPinyin(value) {
  const text = asText(value).toLowerCase();
  for (const char of text) {
    const marked = TONE_MARKS[char];
    if (marked) return marked[1];
  }
  const numbered = text.match(/[1-5](?:\s*)$/);
  return numbered ? Number(numbered[0]) : null;
}

export function normalizePinyin(value) {
  return [...asText(value).toLowerCase()]
    .filter((char) => !/[1-5]/.test(char))
    .map((char) => TONE_MARKS[char]?.[0] || char)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .replace(/[^a-zv]/g, '');
}

export function splitPinyin(value) {
  const key = normalizePinyin(value);
  const initial = INITIALS.find((candidate) => key.startsWith(candidate)) || '';
  return {
    initial,
    final: key.slice(initial.length)
  };
}

function cardErrors(card) {
  const errors = [];
  if (!card || typeof card !== 'object') return ['card'];
  if (card.cardId !== asText(card.cardId)) errors.push('cardId');
  if (card.domain !== PINYIN_DOMAIN) errors.push('domain');
  if (!asText(card.char)) errors.push('char');
  if (!asText(card.pinyinDisplay)) errors.push('pinyinDisplay');
  if (!normalizePinyin(card.pinyinDisplay)) errors.push('pinyinKey');
  if (!asText(card.audio)) errors.push('audio');
  if (!asText(card.example)) errors.push('example');
  if (!TONE_VALUES.has(Number(card.tone))) errors.push('tone');
  return errors;
}

export function validatePinyinCard(card) {
  const errors = cardErrors(card);
  return { valid: errors.length === 0, errors };
}

export function createPinyinCard(input) {
  const source = input || {};
  const display = asText(source.pinyinDisplay);
  const derived = splitPinyin(display);
  const tone = Number(source.tone ?? toneOfPinyin(display));
  const card = {
    cardId: asText(source.cardId),
    domain: source.domain,
    char: asText(source.char),
    pinyinDisplay: display,
    pinyinKey: normalizePinyin(display),
    initial: derived.initial,
    final: derived.final,
    tone,
    audio: asText(source.audio),
    example: asText(source.example)
  };
  const errors = cardErrors(card);
  if (errors.length) throw new TypeError(`Invalid pinyin card fields: ${errors.join(', ')}`);
  if (source.pinyinKey !== undefined && source.pinyinKey !== card.pinyinKey) {
    throw new TypeError('Invalid pinyin card fields: pinyinKey');
  }
  if (source.initial !== undefined && source.initial !== card.initial) {
    throw new TypeError('Invalid pinyin card fields: initial');
  }
  if (source.final !== undefined && source.final !== card.final) {
    throw new TypeError('Invalid pinyin card fields: final');
  }
  if (source.tone !== undefined && Number(source.tone) !== card.tone) {
    throw new TypeError('Invalid pinyin card fields: tone');
  }
  return Object.freeze(card);
}

function questionResponseMode(type) {
  return type === PINYIN_QUESTION_TYPES.PINYIN_INPUT ? 'typing' : 'choice';
}

export function createPinyinQuestion({ card, type, options = [], source = 'new' } = {}) {
  const normalizedCard = createPinyinCard(card);
  if (!QUESTION_TYPE_SET.has(type)) throw new TypeError(`Unknown pinyin question type: ${type}`);
  const normalizedOptions = type === PINYIN_QUESTION_TYPES.TONE_CHOICE
    ? options.map((value) => Number(value))
    : options.map((value) => String(value));
  return Object.freeze({
    questionId: `${normalizedCard.cardId}:${type}`,
    domain: PINYIN_DOMAIN,
    cardId: normalizedCard.cardId,
    type,
    source: String(source),
    responseMode: questionResponseMode(type),
    options: Object.freeze(normalizedOptions),
    answer: Object.freeze({
      char: normalizedCard.char,
      pinyinKey: normalizedCard.pinyinKey,
      initial: normalizedCard.initial,
      final: normalizedCard.final,
      tone: normalizedCard.tone
    })
  });
}

function responseValue(response) {
  if (response && typeof response === 'object') {
    if (response.status === 'missed' || response.missed === true) return null;
    return response.value ?? response.answer ?? response.pinyin ?? response.text ?? null;
  }
  return response;
}

function responseTone(response) {
  if (response && typeof response === 'object' && response.tone !== undefined) {
    const tone = Number(response.tone);
    return TONE_VALUES.has(tone) ? tone : null;
  }
  return toneOfPinyin(responseValue(response));
}

function responseKey(response) {
  return normalizePinyin(responseValue(response));
}

function wrongTagFor(question, response) {
  switch (question.type) {
    case PINYIN_QUESTION_TYPES.INITIAL_CHOICE:
      return PINYIN_ERROR_TAGS.WRONG_INITIAL;
    case PINYIN_QUESTION_TYPES.FINAL_CHOICE:
      return PINYIN_ERROR_TAGS.WRONG_FINAL;
    case PINYIN_QUESTION_TYPES.TONE_CHOICE:
      return PINYIN_ERROR_TAGS.WRONG_TONE;
    case PINYIN_QUESTION_TYPES.PINYIN_INPUT: {
      const key = responseKey(response);
      const parts = splitPinyin(key);
      if (parts.initial !== question.answer.initial) return PINYIN_ERROR_TAGS.WRONG_INITIAL;
      if (parts.final !== question.answer.final) return PINYIN_ERROR_TAGS.WRONG_FINAL;
      if (responseTone(response) !== null && responseTone(response) !== question.answer.tone) {
        return PINYIN_ERROR_TAGS.WRONG_TONE;
      }
      return PINYIN_ERROR_TAGS.WRONG_CHARACTER;
    }
    default:
      return PINYIN_ERROR_TAGS.WRONG_CHARACTER;
  }
}

export function evaluatePinyinQuestion(question, response) {
  const value = responseValue(response);
  const missing = value === null || value === undefined || asText(value) === '';
  const answer = question.answer;
  let correct = false;
  if (!missing) {
    switch (question.type) {
      case PINYIN_QUESTION_TYPES.INITIAL_CHOICE:
        correct = asText(value).toLowerCase() === answer.initial;
        break;
      case PINYIN_QUESTION_TYPES.FINAL_CHOICE:
        correct = asText(value).toLowerCase() === answer.final;
        break;
      case PINYIN_QUESTION_TYPES.TONE_CHOICE:
        correct = Number(value) === answer.tone;
        break;
      case PINYIN_QUESTION_TYPES.LISTENING_CHOICE:
      case PINYIN_QUESTION_TYPES.CHARACTER_CHOICE:
        correct = responseKey(response) === answer.pinyinKey;
        break;
      case PINYIN_QUESTION_TYPES.PINYIN_INPUT:
        correct = responseKey(response) === answer.pinyinKey
          && (responseTone(response) === null || responseTone(response) === answer.tone);
        break;
      default:
        break;
    }
  }
  return {
    correct,
    cardId: question.cardId,
    domain: PINYIN_DOMAIN,
    questionType: question.type,
    errorTag: correct ? null : missing ? PINYIN_ERROR_TAGS.MISSED_CARD : wrongTagFor(question, response)
  };
}
