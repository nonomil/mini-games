export const PINYIN_TRACK_VERSION = 2;

export const PINYIN_TRACK_SEGMENT_TYPES = Object.freeze({
  STRAIGHT: 'straight',
  CURVE_LEFT: 'curve-left',
  CURVE_RIGHT: 'curve-right',
  S_BEND: 's-bend',
  FORK: 'fork',
  SLOPE_UP: 'slope-up',
  SLOPE_DOWN: 'slope-down',
  BRIDGE: 'bridge',
  TUNNEL: 'tunnel',
  LANDMARK: 'landmark'
});

const DEFAULT_SEGMENTS = Object.freeze([
  { id: 'starter-straight', type: 'straight', length: 240, curvature: 0, laneCount: 3, roadWidth: 180 },
  { id: 'starter-bend', type: 'curve-right', length: 180, curvature: 0.36, laneCount: 3, roadWidth: 180 },
  { id: 'starter-finish', type: 'straight', length: 120, curvature: 0, laneCount: 3, roadWidth: 180 }
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeShape(shape, index) {
  const length = Number(shape?.length);
  if (!Number.isFinite(length) || length <= 0) throw new TypeError(`Invalid track segment length at ${index}`);
  const laneCount = Number(shape?.laneCount || 3);
  const roadWidth = Number(shape?.roadWidth || 180);
  if (!Number.isInteger(laneCount) || laneCount < 1) throw new TypeError(`Invalid lane count at ${index}`);
  if (!Number.isFinite(roadWidth) || roadWidth <= 0) throw new TypeError(`Invalid road width at ${index}`);
  return {
    id: String(shape?.id || `segment-${index + 1}`),
    type: String(shape?.type || PINYIN_TRACK_SEGMENT_TYPES.STRAIGHT),
    length,
    curvature: finiteOr(shape?.curvature, 0),
    laneCount,
    roadWidth,
    elevation: finiteOr(shape?.elevation, 0),
    surface: String(shape?.surface || 'road'),
    landmark: shape?.landmark ? String(shape.landmark) : '',
    taskType: shape?.taskType ? String(shape.taskType) : '',
    decorations: Object.freeze(Array.isArray(shape?.decorations) ? shape.decorations.map(String) : [])
  };
}

function normalizeSegment(segment, index) {
  const rawBranches = Array.isArray(segment?.branches) ? segment.branches : [];
  const fallbackLength = Number(rawBranches[0]?.length);
  const source = segment?.type === PINYIN_TRACK_SEGMENT_TYPES.FORK && !Number.isFinite(Number(segment?.length))
    ? { ...segment, length: fallbackLength }
    : segment;
  const normalized = normalizeShape(source, index);
  if (normalized.type !== PINYIN_TRACK_SEGMENT_TYPES.FORK) return Object.freeze(normalized);
  if (!rawBranches.length) throw new TypeError(`Fork segment ${normalized.id} requires branches`);
  const branches = rawBranches.map((branch, branchIndex) => Object.freeze(normalizeShape({
    ...normalized,
    ...branch,
    id: String(branch?.id || `${normalized.id}-branch-${branchIndex + 1}`)
  }, `${index}.${branchIndex}`)));
  const defaultBranch = String(segment?.defaultBranch || branches[0].id);
  if (!branches.some((branch) => branch.id === defaultBranch)) {
    throw new TypeError(`Fork segment ${normalized.id} has an invalid default branch`);
  }
  return Object.freeze({
    ...normalized,
    branches: Object.freeze(branches),
    defaultBranch
  });
}

function activeBranchId(track, segment) {
  if (segment.type !== PINYIN_TRACK_SEGMENT_TYPES.FORK) return null;
  return track.routeChoices[segment.id] || segment.defaultBranch;
}

function activeShape(track, segment) {
  const branchId = activeBranchId(track, segment);
  if (!branchId) return segment;
  return segment.branches.find((branch) => branch.id === branchId) || segment.branches[0];
}

function effectiveLength(track, segment) {
  return activeShape(track, segment).length;
}

function buildRouteChoices(segments, choices = {}) {
  const routeChoices = {};
  for (const segment of segments) {
    if (segment.type !== PINYIN_TRACK_SEGMENT_TYPES.FORK) continue;
    const branchId = choices[segment.id] || segment.defaultBranch;
    if (!segment.branches.some((branch) => branch.id === branchId)) {
      throw new TypeError(`Fork segment ${segment.id} has an invalid branch`);
    }
    routeChoices[segment.id] = branchId;
  }
  return Object.freeze(routeChoices);
}

export function createTrack({
  id = 'pinyin-starter',
  seed = 0,
  segments = DEFAULT_SEGMENTS,
  routeChoices = {}
} = {}) {
  const normalizedSegments = segments.map(normalizeSegment);
  if (!normalizedSegments.length) throw new TypeError('A track requires at least one segment');
  const choices = buildRouteChoices(normalizedSegments, routeChoices);
  return Object.freeze({
    version: PINYIN_TRACK_VERSION,
    id: String(id),
    seed: Number(seed) || 0,
    cameraDistance: 0,
    totalLength: normalizedSegments.reduce((sum, segment) => sum + effectiveLength({ routeChoices: choices }, segment), 0),
    routeChoices: choices,
    segments: Object.freeze(normalizedSegments)
  });
}

export function advanceTrack(track, distance) {
  const delta = Number(distance);
  if (!Number.isFinite(delta)) return track;
  return Object.freeze({
    ...track,
    cameraDistance: clamp(track.cameraDistance + Math.max(0, delta), 0, track.totalLength)
  });
}

function segmentAtDistance(track, distance) {
  const target = clamp(Number(distance) || 0, 0, track.totalLength);
  let offset = 0;
  for (const segment of track.segments) {
    const shape = activeShape(track, segment);
    const length = shape.length;
    if (target <= offset + length) {
      return {
        segment,
        shape,
        branchId: activeBranchId(track, segment),
        progress: (target - offset) / length,
        offset
      };
    }
    offset += length;
  }
  const segment = track.segments[track.segments.length - 1];
  const shape = activeShape(track, segment);
  return {
    segment,
    shape,
    branchId: activeBranchId(track, segment),
    progress: 1,
    offset: track.totalLength - shape.length
  };
}

function centerOffset(shape, progress) {
  const amount = Number(shape.curvature || 0) * 0.18;
  if (shape.type === PINYIN_TRACK_SEGMENT_TYPES.CURVE_LEFT) return -amount * progress * progress;
  if (shape.type === PINYIN_TRACK_SEGMENT_TYPES.CURVE_RIGHT) return amount * progress * progress;
  if (shape.type === PINYIN_TRACK_SEGMENT_TYPES.S_BEND) return amount * Math.sin(progress * Math.PI * 2);
  return 0;
}

function centerOffsetAtDistance(track, distance) {
  const current = segmentAtDistance(track, distance);
  let accumulated = 0;
  for (const segment of track.segments) {
    if (segment === current.segment) break;
    const shape = activeShape(track, segment);
    accumulated += centerOffset(shape, 1);
  }
  return accumulated + centerOffset(current.shape, current.progress);
}

function heightAtDistance(track, distance) {
  const current = segmentAtDistance(track, distance);
  let height = 0;
  for (const segment of track.segments) {
    if (segment === current.segment) break;
    height += activeShape(track, segment).elevation;
  }
  return height + current.shape.elevation * current.progress;
}

export function laneToLateral(track, distance, lane) {
  const { shape } = segmentAtDistance(track, distance);
  const laneIndex = Number(lane);
  if (!Number.isInteger(laneIndex) || laneIndex < 0 || laneIndex >= shape.laneCount) return 0;
  if (shape.laneCount === 1) return 0;
  return ((laneIndex - (shape.laneCount - 1) / 2) / ((shape.laneCount - 1) / 2)) * 0.8;
}

export function getSegmentStartDistance(track, segmentId) {
  let distance = 0;
  for (const segment of track.segments) {
    if (segment.id === segmentId) return distance;
    distance += effectiveLength(track, segment);
  }
  throw new RangeError(`Unknown track segment: ${segmentId}`);
}

export function getPinyinTrackCamera(track, { distance = track.cameraDistance } = {}) {
  const targetDistance = clamp(Number(distance) || 0, 0, track.totalLength);
  const current = segmentAtDistance(track, targetDistance);
  return {
    distance: targetDistance,
    cameraDistance: track.cameraDistance,
    segmentId: current.segment.id,
    segmentType: current.segment.type,
    pathType: current.shape.type,
    branchId: current.branchId,
    progress: current.progress,
    height: heightAtDistance(track, targetDistance),
    laneCount: current.shape.laneCount,
    roadWidth: current.shape.roadWidth,
    surface: current.shape.surface,
    landmark: current.shape.landmark,
    isFork: current.segment.type === PINYIN_TRACK_SEGMENT_TYPES.FORK,
    isBridge: current.segment.type === PINYIN_TRACK_SEGMENT_TYPES.BRIDGE,
    isTunnel: current.segment.type === PINYIN_TRACK_SEGMENT_TYPES.TUNNEL
  };
}

export function projectTrackObject(track, {
  distance = track.cameraDistance,
  lateral,
  lane
} = {}) {
  const targetDistance = clamp(Number(distance) || 0, 0, track.totalLength);
  const current = segmentAtDistance(track, targetDistance);
  const relative = targetDistance - track.cameraDistance;
  const viewDistance = Math.max(1, track.totalLength - track.cameraDistance);
  const depth = clamp(1 - relative / viewDistance, 0.08, 1);
  const perspective = 0.25 + depth * 0.75;
  const roadWidth = clamp((current.shape.roadWidth / 520) * perspective, 0.08, 0.9);
  const objectLateral = lateral === undefined
    ? laneToLateral(track, targetDistance, lane)
    : finiteOr(lateral, 0);
  const height = heightAtDistance(track, targetDistance);
  return {
    distance: targetDistance,
    segmentId: current.segment.id,
    type: current.segment.type,
    pathType: current.shape.type,
    branchId: current.branchId,
    x: clamp(0.5 + centerOffsetAtDistance(track, targetDistance) * perspective + objectLateral * roadWidth / 2, 0.03, 0.97),
    y: clamp(0.12 + depth * 0.76 - height * 0.18, 0.04, 0.96),
    width: roadWidth,
    scale: perspective,
    laneCount: current.shape.laneCount,
    lane: Number.isInteger(Number(lane)) ? Number(lane) : null,
    lateral: objectLateral,
    height,
    surface: current.shape.surface,
    landmark: current.shape.landmark
  };
}

export function visibleTrackSamples(track, { sampleCount = 18, viewDistance = 520 } = {}) {
  const count = Math.max(2, Math.floor(sampleCount));
  const span = Math.max(1, Math.min(viewDistance, track.totalLength - track.cameraDistance));
  return Array.from({ length: count }, (_value, index) => {
    const distance = track.cameraDistance + span * (index / (count - 1));
    return projectTrackObject(track, { distance });
  });
}

export function chooseTrackBranch(track, segmentId, branchId) {
  const segment = track.segments.find((candidate) => candidate.id === segmentId);
  if (!segment || segment.type !== PINYIN_TRACK_SEGMENT_TYPES.FORK) {
    throw new RangeError(`Unknown fork segment: ${segmentId}`);
  }
  if (!segment.branches.some((branch) => branch.id === branchId)) {
    throw new RangeError(`Unknown branch ${branchId} for ${segmentId}`);
  }
  const routeChoices = { ...track.routeChoices, [segmentId]: branchId };
  return advanceTrack(
    createTrack({ id: track.id, seed: track.seed, segments: track.segments, routeChoices }),
    track.cameraDistance
  );
}

function objectLateral(track, object) {
  if (object?.lateral !== undefined) return finiteOr(object.lateral, 0);
  return laneToLateral(track, object?.distance, object?.lane);
}

export function collidesOnTrack(track, vehicle, target, {
  distanceWindow = 18,
  lateralWindow = 0.42
} = {}) {
  const vehicleDistance = finiteOr(vehicle?.distance, 0);
  const targetDistance = finiteOr(target?.distance, 0);
  const vehicleLateral = objectLateral(track, vehicle || {});
  const targetLateral = objectLateral(track, target || {});
  const vehicleLane = Number.isInteger(Number(vehicle?.lane)) ? Number(vehicle.lane) : null;
  const targetLane = Number.isInteger(Number(target?.lane)) ? Number(target.lane) : null;
  const sameLane = vehicleLane === null || targetLane === null ? null : vehicleLane === targetLane;
  const distanceGap = Math.abs(vehicleDistance - targetDistance);
  const lateralGap = Math.abs(vehicleLateral - targetLateral);
  return {
    collided: distanceGap <= Math.max(0, Number(distanceWindow))
      && lateralGap <= Math.max(0, Number(lateralWindow))
      && sameLane !== false,
    distanceGap,
    lateralGap,
    sameLane,
    vehicleDistance,
    targetDistance
  };
}
