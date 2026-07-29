import { createPinyinCard } from './pinyin-domain.js';

export const PINYIN_CARD_DATA = Object.freeze([
  createPinyinCard({
    cardId: 'pinyin:starter:mountain',
    domain: 'pinyin',
    char: '山',
    pinyinDisplay: 'shān',
    audio: './assets/voice/93c10b6a6c7835357c525c54c4e7cb65.mp3',
    example: '我们一起去爬山。'
  }),
  createPinyinCard({
    cardId: 'pinyin:starter:water',
    domain: 'pinyin',
    char: '水',
    pinyinDisplay: 'shuǐ',
    audio: './assets/voice/2beb6b8dd71478e3f234d6d0e1ef77d7.mp3',
    example: '小鱼在水里游。'
  }),
  createPinyinCard({
    cardId: 'pinyin:starter:fire',
    domain: 'pinyin',
    char: '火',
    pinyinDisplay: 'huǒ',
    audio: './assets/voice/c391a9ac27b18cc325eaa64abae63186.mp3',
    example: '冬天烤火真暖和。'
  }),
  createPinyinCard({
    cardId: 'pinyin:starter:wood',
    domain: 'pinyin',
    char: '木',
    pinyinDisplay: 'mù',
    audio: './assets/voice/061dec474c6758216f4c8f582d311771.mp3',
    example: '这是一棵大木头。'
  }),
  createPinyinCard({
    cardId: 'pinyin:starter:moon',
    domain: 'pinyin',
    char: '月',
    pinyinDisplay: 'yuè',
    audio: './assets/voice/b85ecf97ffae7a75e1e7a954ac6bb0cd.mp3',
    example: '天上挂着一轮明月。'
  }),
  createPinyinCard({
    cardId: 'pinyin:starter:girl',
    domain: 'pinyin',
    char: '女',
    pinyinDisplay: 'nǚ',
    audio: './assets/voice/9fc4642cde210842bd0f308e24448775.mp3',
    example: '女儿在读书。'
  })
]);
