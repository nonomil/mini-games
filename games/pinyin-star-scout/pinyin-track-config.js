import {
  createTrack,
  PINYIN_TRACK_SEGMENT_TYPES
} from './pinyin-track.js';

export { PINYIN_TRACK_SEGMENT_TYPES };

const COMPLEX_LEARNING_LOOP = Object.freeze([
  {
    id: 'start-straight',
    type: PINYIN_TRACK_SEGMENT_TYPES.STRAIGHT,
    length: 180,
    roadWidth: 180,
    laneCount: 3,
    surface: 'forest-road',
    landmark: '拼音起步门',
    taskType: 'character-choice',
    decorations: ['sign', 'tree']
  },
  {
    id: 'initial-curve-right',
    type: PINYIN_TRACK_SEGMENT_TYPES.CURVE_RIGHT,
    length: 150,
    curvature: 0.48,
    roadWidth: 176,
    laneCount: 3,
    surface: 'forest-road',
    landmark: '声母右弯',
    taskType: 'initial-choice',
    decorations: ['initial-gate']
  },
  {
    id: 'phoneme-s-bend',
    type: PINYIN_TRACK_SEGMENT_TYPES.S_BEND,
    length: 220,
    curvature: 0.56,
    roadWidth: 172,
    laneCount: 3,
    surface: 'forest-road',
    landmark: '声韵 S 弯',
    taskType: 'final-choice',
    decorations: ['phoneme-lamp', 'phoneme-lamp']
  },
  {
    id: 'initial-final-fork',
    type: PINYIN_TRACK_SEGMENT_TYPES.FORK,
    defaultBranch: 'inner',
    roadWidth: 176,
    laneCount: 3,
    surface: 'fork-road',
    landmark: '声母韵母分叉',
    taskType: 'final-choice',
    branches: [
      {
        id: 'inner',
        type: PINYIN_TRACK_SEGMENT_TYPES.CURVE_LEFT,
        length: 100,
        curvature: 0.5,
        roadWidth: 154,
        laneCount: 2,
        elevation: 0.02,
        surface: 'shortcut-road'
      },
      {
        id: 'wide',
        type: PINYIN_TRACK_SEGMENT_TYPES.CURVE_RIGHT,
        length: 150,
        curvature: 0.28,
        roadWidth: 210,
        laneCount: 3,
        elevation: 0,
        surface: 'recovery-road'
      }
    ],
    decorations: ['fork-gate', 'route-sign']
  },
  {
    id: 'cloud-slope-up',
    type: PINYIN_TRACK_SEGMENT_TYPES.SLOPE_UP,
    length: 150,
    curvature: 0,
    elevation: 0.2,
    roadWidth: 170,
    laneCount: 3,
    surface: 'hill-road',
    landmark: '拼读上坡',
    taskType: 'listen-choice',
    decorations: ['cloud']
  },
  {
    id: 'tone-bridge',
    type: PINYIN_TRACK_SEGMENT_TYPES.BRIDGE,
    length: 130,
    curvature: -0.18,
    elevation: 0.18,
    roadWidth: 166,
    laneCount: 3,
    surface: 'tone-bridge',
    landmark: '声调桥',
    taskType: 'tone-choice',
    decorations: ['bridge-pillar', 'tone-sign']
  },
  {
    id: 'cloud-slope-down',
    type: PINYIN_TRACK_SEGMENT_TYPES.SLOPE_DOWN,
    length: 120,
    curvature: 0.14,
    elevation: -0.38,
    roadWidth: 174,
    laneCount: 3,
    surface: 'hill-road',
    landmark: '复习下坡',
    taskType: 'pinyin-input',
    decorations: ['wind-line']
  },
  {
    id: 'listening-tunnel',
    type: PINYIN_TRACK_SEGMENT_TYPES.TUNNEL,
    length: 160,
    curvature: 0.2,
    roadWidth: 150,
    laneCount: 3,
    surface: 'tunnel-road',
    landmark: '听音隧道',
    taskType: 'listen-choice',
    decorations: ['tunnel-light', 'tunnel-light', 'tunnel-light']
  },
  {
    id: 'finish-landmark',
    type: PINYIN_TRACK_SEGMENT_TYPES.LANDMARK,
    length: 120,
    curvature: 0,
    roadWidth: 186,
    laneCount: 3,
    surface: 'finish-road',
    landmark: '终点拼读门',
    taskType: 'pinyin-input',
    decorations: ['finish-arch', 'star-banner']
  }
]);

export const PINYIN_TRACK_CONFIG = Object.freeze({
  'learning-loop': Object.freeze({
    id: 'pinyin-learning-loop',
    seed: 20260727,
    segments: COMPLEX_LEARNING_LOOP
  })
});

export function createConfiguredPinyinTrack(routeId = 'learning-loop') {
  const config = PINYIN_TRACK_CONFIG[routeId];
  if (!config) throw new RangeError(`Unknown pinyin track route: ${routeId}`);
  return createTrack(config);
}
