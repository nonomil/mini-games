export const REQUIRED_EXPRESSION_FIELDS = [
  'cardId',
  'expression',
  'definitionEn',
  'definitionZh',
  'example',
  'audio',
  'level',
  'confusionSet'
];

const speechAudio = (text) => ({ type: 'speech-synthesis', text });

export const EXPRESSION_CARDS = Object.freeze([
  {
    cardId: 'english-expression:tennis:look-forward-to',
    expression: 'look forward to',
    definitionEn: 'to feel happy and excited about something that will happen',
    definitionZh: '期待某件将要发生的事',
    example: 'I look forward to seeing you at the tennis club.',
    audio: speechAudio('look forward to'),
    level: 'elementary',
    partOfSpeech: 'phrase',
    sourcePack: 'tennis-court-starter',
    confusionSet: [
      'english-expression:tennis:be-interested-in',
      'english-expression:tennis:take-part-in'
    ],
    wrongAnswerFeedback: {
      'english-expression:tennis:be-interested-in': {
        errorType: 'wrong-meaning',
        explanationZh: 'be interested in 是“对某事感兴趣”，不是对未来事情感到期待。',
        explanationEn: 'be interested in means you want to know about something, not that you are excited about a future event.'
      },
      'english-expression:tennis:take-part-in': {
        errorType: 'wrong-collocation',
        explanationZh: 'take part in 后面接参加的活动；本句需要表达“期待见到你”。',
        explanationEn: 'take part in is used for joining an activity; this sentence needs an expression for excited anticipation.'
      }
    }
  },
  {
    cardId: 'english-expression:tennis:take-part-in',
    expression: 'take part in',
    definitionEn: 'to join an activity or event',
    definitionZh: '参加一项活动或事件',
    example: 'I want to take part in the school tennis match.',
    audio: speechAudio('take part in'),
    level: 'elementary',
    partOfSpeech: 'phrase',
    sourcePack: 'tennis-court-starter',
    confusionSet: [
      'english-expression:tennis:be-interested-in',
      'english-expression:tennis:look-forward-to'
    ],
    wrongAnswerFeedback: {
      'english-expression:tennis:be-interested-in': {
        errorType: 'wrong-context',
        explanationZh: 'be interested in 只表示感兴趣；句子说的是要参加比赛。',
        explanationEn: 'be interested in only shows interest; this sentence says that the player will join the match.'
      },
      'english-expression:tennis:look-forward-to': {
        errorType: 'wrong-collocation',
        explanationZh: 'look forward to 表示期待，不能直接替换“参加比赛”的动作。',
        explanationEn: 'look forward to expresses anticipation, so it does not name the action of joining a match.'
      }
    }
  },
  {
    cardId: 'english-expression:tennis:worn-out',
    expression: 'worn out',
    definitionEn: 'very tired after using a lot of energy',
    definitionZh: '消耗很多精力后非常疲惫',
    example: 'I was worn out after the long tennis practice.',
    audio: speechAudio('worn out'),
    level: 'elementary',
    partOfSpeech: 'adjective phrase',
    sourcePack: 'tennis-court-starter',
    confusionSet: [
      'english-expression:tennis:be-interested-in',
      'english-expression:tennis:get-used-to'
    ],
    wrongAnswerFeedback: {
      'english-expression:tennis:be-interested-in': {
        errorType: 'wrong-meaning',
        explanationZh: 'be interested in 表示“感兴趣”，不是“累坏了”。',
        explanationEn: 'be interested in means being curious about something, not being very tired.'
      },
      'english-expression:tennis:get-used-to': {
        errorType: 'wrong-context',
        explanationZh: 'get used to 表示逐渐习惯；本句是在描述练习后的疲惫状态。',
        explanationEn: 'get used to means becoming familiar with something; this sentence describes the tired result of practice.'
      }
    }
  },
  {
    cardId: 'english-expression:tennis:be-interested-in',
    expression: 'be interested in',
    definitionEn: 'to want to know more about something',
    definitionZh: '对某事感兴趣，想了解更多',
    example: 'Mia is interested in learning a new tennis serve.',
    audio: speechAudio('be interested in'),
    level: 'elementary',
    partOfSpeech: 'phrase',
    sourcePack: 'tennis-court-starter',
    confusionSet: [
      'english-expression:tennis:look-forward-to',
      'english-expression:tennis:be-proud-of'
    ],
    wrongAnswerFeedback: {
      'english-expression:tennis:look-forward-to': {
        errorType: 'wrong-meaning',
        explanationZh: 'look forward to 是期待未来发生的事，不是想了解某个主题。',
        explanationEn: 'look forward to is about excited anticipation, not simply wanting to learn more.'
      },
      'english-expression:tennis:be-proud-of': {
        errorType: 'wrong-context',
        explanationZh: 'be proud of 表示为已经完成的事情自豪；这里是在说对新技术感兴趣。',
        explanationEn: 'be proud of describes a feeling about an achievement; this sentence describes curiosity about a new skill.'
      }
    }
  },
  {
    cardId: 'english-expression:tennis:get-used-to',
    expression: 'get used to',
    definitionEn: 'to become familiar with something over time',
    definitionZh: '逐渐习惯某件事',
    example: 'You will get used to the faster court after a few games.',
    audio: speechAudio('get used to'),
    level: 'elementary',
    partOfSpeech: 'phrase',
    sourcePack: 'tennis-court-starter',
    confusionSet: [
      'english-expression:tennis:be-interested-in',
      'english-expression:tennis:take-part-in'
    ],
    wrongAnswerFeedback: {
      'english-expression:tennis:be-interested-in': {
        errorType: 'wrong-meaning',
        explanationZh: 'be interested in 表示想了解，不表示经过练习后逐渐习惯。',
        explanationEn: 'be interested in shows curiosity, not the process of becoming familiar with a new situation.'
      },
      'english-expression:tennis:take-part-in': {
        errorType: 'wrong-collocation',
        explanationZh: 'take part in 后面接活动；本句需要表达“习惯更快的球场”。',
        explanationEn: 'take part in is followed by an activity; this sentence needs the phrase for adapting to the court.'
      }
    }
  },
  {
    cardId: 'english-expression:tennis:be-good-at',
    expression: 'be good at',
    definitionEn: 'to do something well',
    definitionZh: '擅长做某事',
    example: 'Leo is good at serving to the corner.',
    audio: speechAudio('be good at'),
    level: 'elementary',
    partOfSpeech: 'phrase',
    sourcePack: 'tennis-court-starter',
    confusionSet: [
      'english-expression:tennis:be-interested-in',
      'english-expression:tennis:spend-time-on'
    ],
    wrongAnswerFeedback: {
      'english-expression:tennis:be-interested-in': {
        errorType: 'wrong-meaning',
        explanationZh: 'be interested in 只表示感兴趣，不表示已经擅长。',
        explanationEn: 'be interested in shows interest, while this sentence says that Leo performs the skill well.'
      },
      'english-expression:tennis:spend-time-on': {
        errorType: 'wrong-context',
        explanationZh: 'spend time on 表示花时间练习；句子强调的是发球能力。',
        explanationEn: 'spend time on describes where time is used; this sentence focuses on an existing skill.'
      }
    }
  },
  {
    cardId: 'english-expression:tennis:be-proud-of',
    expression: 'be proud of',
    definitionEn: 'to feel pleased about something you did or achieved',
    definitionZh: '为自己做成或取得的事情感到自豪',
    example: 'We are proud of our team after the close match.',
    audio: speechAudio('be proud of'),
    level: 'elementary',
    partOfSpeech: 'phrase',
    sourcePack: 'tennis-court-starter',
    confusionSet: [
      'english-expression:tennis:be-interested-in',
      'english-expression:tennis:look-forward-to'
    ],
    wrongAnswerFeedback: {
      'english-expression:tennis:be-interested-in': {
        errorType: 'wrong-context',
        explanationZh: 'be interested in 是兴趣，不是比赛结束后对团队成绩的自豪。',
        explanationEn: 'be interested in describes curiosity, not the pride felt after a team achievement.'
      },
      'english-expression:tennis:look-forward-to': {
        errorType: 'wrong-meaning',
        explanationZh: 'look forward to 指向未来的期待；这里是在评价已经结束的比赛。',
        explanationEn: 'look forward to points to a future event, while this sentence reflects on a match that has happened.'
      }
    }
  },
  {
    cardId: 'english-expression:tennis:spend-time-on',
    expression: 'spend time on',
    definitionEn: 'to use time doing or working on something',
    definitionZh: '花时间做某事或练习某项内容',
    example: 'I spend time on my footwork before every match.',
    audio: speechAudio('spend time on'),
    level: 'elementary',
    partOfSpeech: 'phrase',
    sourcePack: 'tennis-court-starter',
    confusionSet: [
      'english-expression:tennis:take-part-in',
      'english-expression:tennis:get-used-to'
    ],
    wrongAnswerFeedback: {
      'english-expression:tennis:take-part-in': {
        errorType: 'wrong-collocation',
        explanationZh: 'take part in 是参加活动；本句需要表达把时间用在步法练习上。',
        explanationEn: 'take part in means joining an activity; this sentence says where practice time is spent.'
      },
      'english-expression:tennis:get-used-to': {
        errorType: 'wrong-context',
        explanationZh: 'get used to 是逐渐习惯，不等于主动花时间练习步法。',
        explanationEn: 'get used to means adapting over time, not deliberately spending practice time on footwork.'
      }
    }
  }
]);

export function validateExpressionCard(card) {
  const errors = [];
  for (const field of REQUIRED_EXPRESSION_FIELDS) {
    if (card?.[field] === undefined || card?.[field] === null || card?.[field] === '') {
      errors.push(`${field} is required`);
    }
  }
  if (card && !Array.isArray(card.confusionSet)) errors.push('confusionSet must be an array');
  if (card && (!card.wrongAnswerFeedback || typeof card.wrongAnswerFeedback !== 'object')) {
    errors.push('wrongAnswerFeedback is required');
  }
  return { valid: errors.length === 0, errors };
}

export function buildChoices(cards, target) {
  const cardList = Array.isArray(cards) ? cards : [];
  const targetCard = typeof target === 'string'
    ? cardList.find((card) => card.cardId === target)
    : target;
  if (!targetCard) throw new Error('A target expression card is required');

  const choices = [targetCard, ...targetCard.confusionSet.map((cardId) =>
    cardList.find((card) => card.cardId === cardId)
  )];
  if (choices.length !== 3 || choices.some((card) => !card)) {
    throw new Error(`Expression card ${targetCard.cardId} must resolve to two distractors`);
  }
  return choices;
}
