import { projectTrackObject, visibleTrackSamples } from './pinyin-track.js';
import { getPinyinRacePhase, PINYIN_RACE_PHASES } from './pinyin-race-phase.js';

const TRACK_ASPECT_RATIO = 16 / 9;
const DEFAULT_MIN_WIDTH = 280;
const DEFAULT_MAX_WIDTH = 960;
const HORIZON_Y = 0.33;
const STRIPE_LENGTH = 42;
const RIVAL_CONFIG = Object.freeze([
  Object.freeze({ id: 'rival-teal', lane: 0, gap: 210, speedRatio: 0.97, phase: 0.4, body: '#36b8b3', accent: '#d9fff0' }),
  Object.freeze({ id: 'rival-gold', lane: 2, gap: 360, speedRatio: 1.03, phase: 2.3, body: '#edb54f', accent: '#fff1c4' })
]);

const SURFACE_COLORS = Object.freeze({
  'forest-road': ['#3f4b55', '#475761'],
  'fork-road': ['#4b505c', '#555b68'],
  'shortcut-road': ['#3f5558', '#476467'],
  'recovery-road': ['#5a4e4c', '#665755'],
  'hill-road': ['#4c574d', '#566354'],
  'tone-bridge': ['#46536b', '#52617c'],
  'tunnel-road': ['#242c3c', '#2e3749'],
  'finish-road': ['#455359', '#526269'],
  road: ['#3f4b55', '#475761']
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finitePositive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function fraction(value) {
  return ((value % 1) + 1) % 1;
}

function createGradient(ctx, x0, y0, x1, y1, stops, fallback) {
  const gradient = typeof ctx.createLinearGradient === 'function'
    ? ctx.createLinearGradient(x0, y0, x1, y1)
    : null;
  if (gradient && typeof gradient.addColorStop === 'function') {
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    return gradient;
  }
  return fallback;
}

function projectedRoadEdge(point, side, width) {
  return point.x * width + side * point.width * width / 2;
}

export function getPinyinRaceCompetition(snapshot = {}, { now = 0 } = {}) {
  if (!snapshot.track) throw new TypeError('A pinyin track is required for competition positions');
  const track = snapshot.track;
  const totalLength = Math.max(1, finiteOr(track.totalLength, 1));
  const cameraDistance = clamp(finiteOr(track.cameraDistance, 0), 0, totalLength);
  const learningClock = snapshot.learningClock || {};
  const racePhase = getPinyinRacePhase({
    now,
    startedAt: snapshot.raceStartedAt,
    finishAt: snapshot.finishAt,
    manualPaused: snapshot.status === 'paused',
    learningClock
  });
  const speed = Math.max(0, finiteOr(snapshot.metrics?.speed?.current ?? snapshot.speed, 0));
  const motionReduced = snapshot.reducedMotion === true;
  const visibleSpeed = racePhase.phase === PINYIN_RACE_PHASES.COUNTDOWN ? 0 : speed;
  const startedAt = snapshot.raceStartedAt === null || snapshot.raceStartedAt === undefined
    ? 0
    : finiteOr(snapshot.raceStartedAt, 0);
  const elapsedMs = motionReduced ? 0 : Math.max(0, finiteOr(now, 0) - startedAt);

  const rivals = RIVAL_CONFIG.map((config) => {
    const relativeDrift = config.gap
      + visibleSpeed * elapsedMs / 1000 * (config.speedRatio - 1)
      + Math.sin(elapsedMs / 900 + config.phase) * 18;
    const distance = ((cameraDistance + relativeDrift) % totalLength + totalLength) % totalLength;
    const preview = projectTrackObject(track, { distance, lane: config.lane });
    const lane = Math.min(config.lane, Math.max(0, preview.laneCount - 1));
    const projected = projectTrackObject(track, { distance, lane });
    return {
      ...config,
      ...projected,
      id: config.id,
      lane,
      progress: clamp(distance / totalLength, 0, 1),
      lean: projected.pathType === 'curve-left' || projected.pathType === 'curve-right' ? 0.028 : 0
    };
  });

  return {
    playerProgress: clamp(cameraDistance / totalLength, 0, 1),
    rivals,
    totalLength
  };
}

function drawPolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function drawLine(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.stroke();
}

function drawMountainLayer(ctx, width, height, color, baseline, amplitude, phase) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseline);
  for (let index = 0; index <= 12; index += 1) {
    const x = (index / 12) * width;
    const y = baseline - (0.35 + Math.sin(index * 1.7 + phase) * 0.28) * amplitude;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

function drawSky(ctx, width, height, model) {
  ctx.fillStyle = createGradient(
    ctx,
    0,
    0,
    0,
    height * 0.64,
    [[0, '#78b9d6'], [0.58, '#b7d9df'], [1, '#f5ce9d']],
    '#9bcbd9'
  );
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 230, 157, 0.8)';
  ctx.beginPath();
  ctx.arc(width * 0.78, height * 0.18, Math.max(18, width * 0.045), 0, Math.PI * 2);
  ctx.fill();

  drawMountainLayer(ctx, width, height, '#71949c', height * 0.48, height * 0.23, model.stripePhase * 2);
  drawMountainLayer(ctx, width, height, '#557b80', height * 0.56, height * 0.19, 2 + model.stripePhase);
  ctx.fillStyle = createGradient(
    ctx,
    0,
    height * HORIZON_Y,
    0,
    height,
    [[0, '#87b994'], [1, '#375a4d']],
    '#578c72'
  );
  ctx.fillRect(0, height * HORIZON_Y, width, height * 0.67);
}

function drawRoadsideMotion(ctx, model, width, height) {
  const samples = model.samples;
  samples.forEach((sample, index) => {
    if (index < 2 || index % 2 !== 0) return;
    const scale = sample.scale;
    const leftRoad = projectedRoadEdge(sample, -1, width);
    const rightRoad = projectedRoadEdge(sample, 1, width);
    const y = sample.y * height;
    const postHeight = Math.max(4, 34 * scale);
    const postWidth = Math.max(2, 4 * scale);
    ctx.fillStyle = index % 4 === 0 ? '#f8e8b3' : '#ffffff';
    ctx.fillRect(leftRoad - 12 * scale, y - postHeight, postWidth, postHeight);
    ctx.fillRect(rightRoad + 8 * scale, y - postHeight, postWidth, postHeight);
    ctx.fillStyle = index % 4 === 0 ? '#e86956' : '#2f8990';
    ctx.fillRect(leftRoad - 14 * scale, y - postHeight, postWidth + 5 * scale, Math.max(2, 7 * scale));
    ctx.fillRect(rightRoad + 6 * scale, y - postHeight, postWidth + 5 * scale, Math.max(2, 7 * scale));

    if (index % 4 === 0 && scale > 0.22) {
      ctx.fillStyle = '#345d55';
      ctx.beginPath();
      ctx.arc(leftRoad - 23 * scale, y - postHeight - 10 * scale, 13 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightRoad + 23 * scale, y - postHeight - 9 * scale, 12 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawTrackFeature(ctx, sample, width, height) {
  const centerX = sample.x * width;
  const screenY = sample.y * height;
  const roadHalfWidth = sample.width * width / 2;
  const scale = sample.scale;
  if (sample.type === 'tunnel') {
    ctx.strokeStyle = '#c5d4e4';
    ctx.lineWidth = Math.max(2, scale * 8);
    ctx.strokeRect(centerX - roadHalfWidth, screenY - 36 * scale, roadHalfWidth * 2, 44 * scale);
    ctx.strokeStyle = 'rgba(255, 227, 149, 0.72)';
    ctx.lineWidth = Math.max(1, scale * 3);
    ctx.strokeRect(centerX - roadHalfWidth * 0.86, screenY - 27 * scale, roadHalfWidth * 1.72, 26 * scale);
  } else if (sample.type === 'bridge') {
    ctx.fillStyle = '#293f5a';
    ctx.fillRect(centerX - roadHalfWidth * 0.78, screenY + 4 * scale, 8 * scale, 34 * scale);
    ctx.fillRect(centerX + roadHalfWidth * 0.68, screenY + 4 * scale, 8 * scale, 34 * scale);
  } else if (sample.type === 'fork') {
    ctx.strokeStyle = '#f4c76b';
    ctx.lineWidth = Math.max(1, scale * 3);
    drawLine(ctx, [
      [centerX, screenY],
      [centerX - roadHalfWidth * 0.76, screenY - 22 * scale]
    ]);
    drawLine(ctx, [
      [centerX, screenY],
      [centerX + roadHalfWidth * 0.76, screenY - 22 * scale]
    ]);
  }
  if (sample.type === 'landmark' && String(sample.landmark).includes('终点') && scale > 0.12) {
    const postHeight = 58 * scale;
    const postWidth = Math.max(3, 7 * scale);
    const bannerWidth = roadHalfWidth * 1.82;
    const bannerHeight = Math.max(5, 15 * scale);
    const bannerTop = screenY - postHeight;
    ctx.fillStyle = '#f3e8c2';
    ctx.fillRect(centerX - roadHalfWidth * 0.86, screenY - postHeight, postWidth, postHeight);
    ctx.fillRect(centerX + roadHalfWidth * 0.86 - postWidth, screenY - postHeight, postWidth, postHeight);
    for (let block = 0; block < 10; block += 1) {
      ctx.fillStyle = block % 2 === 0 ? '#263846' : '#f6e8b9';
      ctx.fillRect(
        centerX - bannerWidth / 2 + bannerWidth * block / 10,
        bannerTop,
        bannerWidth / 10 + 1,
        bannerHeight
      );
    }
  }
  if (sample.landmark && scale > 0.16) {
    ctx.fillStyle = 'rgba(30, 53, 64, 0.76)';
    ctx.font = `${Math.max(10, Math.round(13 * scale))}px sans-serif`;
    ctx.fillText(sample.landmark, centerX - roadHalfWidth, screenY - 12 * scale);
  }
}

function drawRaceTelemetry(ctx, model, width, height) {
  const margin = Math.max(10, width * 0.02);
  const panelWidth = clamp(width * 0.2, 100, 142);
  const panelHeight = 49;
  ctx.fillStyle = 'rgba(20, 37, 46, 0.78)';
  ctx.beginPath();
  ctx.roundRect(margin, margin, panelWidth, panelHeight, 10);
  ctx.fill();
  ctx.fillStyle = '#a7d6d4';
  ctx.font = '900 9px sans-serif';
  ctx.fillText(`第 ${model.telemetry.lap} 圈`, margin + 10, margin + 14);
  ctx.fillStyle = '#fff2b8';
  ctx.font = `900 ${Math.max(16, Math.round(width * 0.025))}px sans-serif`;
  ctx.fillText(String(model.telemetry.speed), margin + 10, margin + 34);
  ctx.fillStyle = '#a7d6d4';
  ctx.font = '900 8px sans-serif';
  ctx.fillText('KM/H', margin + panelWidth - 34, margin + 34);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(margin + 10, margin + 40, panelWidth - 20, 4);
  ctx.fillStyle = model.telemetry.status === 'slowed' ? '#f5c85e' : '#62d8c1';
  ctx.fillRect(margin + 10, margin + 40, (panelWidth - 20) * model.telemetry.speedRatio, 4);

  if (model.telemetry.status !== 'racing') {
    const bannerWidth = clamp(width * 0.34, 132, 210);
    const bannerHeight = 30;
    const left = (width - bannerWidth) / 2;
    const top = margin + 10;
    ctx.fillStyle = model.telemetry.status === 'paused'
      ? 'rgba(43, 55, 65, 0.88)'
      : 'rgba(129, 91, 41, 0.9)';
    ctx.beginPath();
    ctx.roundRect(left, top, bannerWidth, bannerHeight, 15);
    ctx.fill();
    ctx.fillStyle = '#fff6d5';
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(model.telemetry.label, width / 2, top + 20);
    ctx.textAlign = 'start';
  }
}

function drawCompetitionProgress(ctx, model, width, height) {
  const competition = model.competition;
  if (!competition) return false;
  const margin = Math.max(10, width * 0.02);
  const panelWidth = clamp(width * 0.28, 150, 210);
  const panelHeight = 38;
  const left = width - panelWidth - margin;
  const top = margin;
  const trackLeft = left + 10;
  const trackRight = left + panelWidth - 10;
  const trackY = top + 25;

  ctx.fillStyle = 'rgba(20, 37, 46, 0.78)';
  ctx.beginPath();
  ctx.roundRect(left, top, panelWidth, panelHeight, 10);
  ctx.fill();
  ctx.fillStyle = '#a7d6d4';
  ctx.font = '900 8px sans-serif';
  ctx.fillText('赛道进度', trackLeft, top + 12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(trackLeft, trackY - 2, trackRight - trackLeft, 4);

  for (let block = 0; block < 8; block += 1) {
    ctx.fillStyle = block % 2 === 0 ? '#f4e6b5' : '#304552';
    ctx.fillRect(trackRight - 8 + block % 2 * 4, top + 18 + Math.floor(block / 2) * 4, 4, 4);
  }
  competition.rivals.forEach((rival) => {
    ctx.fillStyle = rival.body;
    ctx.beginPath();
    ctx.arc(trackLeft + (trackRight - trackLeft) * rival.progress, trackY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#ff8561';
  ctx.beginPath();
  ctx.arc(trackLeft + (trackRight - trackLeft) * competition.playerProgress, trackY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  return true;
}

function drawRacePhase(ctx, model, width, height) {
  const phase = model.racePhase;
  if (!phase || phase.phase === PINYIN_RACE_PHASES.RACING || phase.phase === PINYIN_RACE_PHASES.PAUSED) return false;

  const centerX = width / 2;
  const centerY = height * 0.36;
  const pulse = phase.phase === PINYIN_RACE_PHASES.COUNTDOWN
    ? 1 - Math.min(1, (phase.elapsedMs % 700) / 700)
    : 1 - phase.progress;
  const radius = Math.min(width, height) * (0.1 + pulse * 0.035);

  ctx.save();
  ctx.globalAlpha = phase.phase === PINYIN_RACE_PHASES.FINISH ? 0.86 : 0.9;
  ctx.fillStyle = phase.phase === PINYIN_RACE_PHASES.FINISH
    ? 'rgba(255, 236, 159, 0.24)'
    : 'rgba(21, 45, 55, 0.2)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = phase.phase === PINYIN_RACE_PHASES.FINISH ? '#fff0a9' : '#fff6d5';
  ctx.font = `900 ${Math.max(34, Math.round(Math.min(width, height) * 0.18))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = phase.phase === PINYIN_RACE_PHASES.FINISH ? '#ee755d' : '#2c6871';
  ctx.shadowBlur = 16;
  ctx.fillText(phase.label, centerX, centerY + radius * 0.72);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'start';
  ctx.restore();
  return true;
}

function drawRoad(ctx, model, width, height) {
  for (let index = model.roadSegments.length - 1; index >= 0; index -= 1) {
    const road = model.roadSegments[index];
    const nearY = road.near.y * height;
    const farY = road.far.y * height;
    const nearLeft = projectedRoadEdge(road.near, -1, width);
    const nearRight = projectedRoadEdge(road.near, 1, width);
    const farLeft = projectedRoadEdge(road.far, -1, width);
    const farRight = projectedRoadEdge(road.far, 1, width);

    ctx.fillStyle = (SURFACE_COLORS[road.near.surface] || SURFACE_COLORS.road)[index % 2];
    drawPolygon(ctx, [
      [farLeft, farY],
      [farRight, farY],
      [nearRight, nearY],
      [nearLeft, nearY]
    ]);

    const shoulderWidth = Math.max(2, road.near.scale * 9);
    ctx.fillStyle = index % 2 === 0 ? '#f7e9bd' : '#dc6b59';
    drawPolygon(ctx, [
      [farLeft - shoulderWidth * road.far.scale, farY],
      [farLeft, farY],
      [nearLeft, nearY],
      [nearLeft - shoulderWidth, nearY]
    ]);
    drawPolygon(ctx, [
      [farRight, farY],
      [farRight + shoulderWidth * road.far.scale, farY],
      [nearRight + shoulderWidth, nearY],
      [nearRight, nearY]
    ]);

    if (road.stripeVisible) {
      ctx.strokeStyle = 'rgba(255, 242, 180, 0.9)';
      ctx.lineWidth = Math.max(1, road.near.scale * 3);
      for (let lane = 1; lane < road.near.laneCount; lane += 1) {
        const ratio = lane / road.near.laneCount;
        drawLine(ctx, [
          [farLeft + (farRight - farLeft) * ratio, farY],
          [nearLeft + (nearRight - nearLeft) * ratio, nearY]
        ]);
      }
    }
    if (road.featureVisible || road.near.type === 'tunnel' || road.near.type === 'bridge' || road.near.type === 'fork') {
      drawTrackFeature(ctx, road.near, width, height);
    }
  }
}

function drawTarget(ctx, target, width, height) {
  const x = target.x * width;
  const y = target.y * height;
  const scale = clamp(target.scale, 0.12, 1);
  const cardWidth = 86 * scale;
  const cardHeight = 42 * scale;
  ctx.fillStyle = 'rgba(31, 44, 53, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14 * scale, cardWidth * 0.58, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff4c8';
  ctx.fillRect(x - cardWidth / 2, y - cardHeight, cardWidth, cardHeight);
  ctx.fillStyle = '#ef795b';
  ctx.fillRect(x - cardWidth / 2, y - cardHeight, cardWidth, Math.max(3, 6 * scale));
  ctx.fillStyle = '#27404f';
  ctx.font = `900 ${Math.max(10, Math.round(17 * scale))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(target.label || ''), x, y - 14 * scale);
  ctx.textAlign = 'start';
}

function drawRivalVehicle(ctx, rival, width, height) {
  const x = rival.x * width;
  const y = rival.y * height;
  const scale = clamp(rival.scale * 0.78, 0.3, 0.78);
  const carWidth = 38 * scale;
  const carHeight = 58 * scale;
  ctx.fillStyle = 'rgba(19, 36, 43, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + carHeight * 0.38, carWidth * 0.64, carHeight * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rival.lean);
  ctx.fillStyle = '#202c36';
  ctx.fillRect(-carWidth * 0.58, -carHeight * 0.2, carWidth * 0.18, carHeight * 0.54);
  ctx.fillRect(carWidth * 0.4, -carHeight * 0.2, carWidth * 0.18, carHeight * 0.54);
  ctx.fillStyle = rival.body;
  ctx.beginPath();
  ctx.roundRect(-carWidth / 2, -carHeight / 2, carWidth, carHeight, 8 * scale);
  ctx.fill();
  ctx.fillStyle = '#294657';
  ctx.beginPath();
  ctx.roundRect(-carWidth * 0.3, -carHeight * 0.3, carWidth * 0.6, carHeight * 0.25, 5 * scale);
  ctx.fill();
  ctx.fillStyle = rival.accent;
  ctx.fillRect(-carWidth * 0.3, carHeight * 0.22, carWidth * 0.18, 4 * scale);
  ctx.fillRect(carWidth * 0.12, carHeight * 0.22, carWidth * 0.18, 4 * scale);
  ctx.restore();
}

function drawVehicle(ctx, model, width, height) {
  const { vehicle } = model;
  const x = vehicle.x * width;
  const y = vehicle.y * height - vehicle.bob;
  const scale = clamp(vehicle.scale * 1.04, 0.72, 1.16);
  const carWidth = 46 * scale;
  const carHeight = 72 * scale;

  ctx.fillStyle = 'rgba(19, 36, 43, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + carHeight * 0.38, carWidth * 0.62, carHeight * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vehicle.lean);
  if (vehicle.boost > 0) {
    ctx.fillStyle = '#ffd665';
    drawPolygon(ctx, [
      [-9 * scale, carHeight * 0.43],
      [0, carHeight * 0.43 + (14 + vehicle.boost * 8) * scale],
      [9 * scale, carHeight * 0.43]
    ]);
    ctx.fillStyle = '#f47752';
    drawPolygon(ctx, [
      [-4 * scale, carHeight * 0.43],
      [0, carHeight * 0.43 + (8 + vehicle.boost * 4) * scale],
      [4 * scale, carHeight * 0.43]
    ]);
  }
  ctx.fillStyle = '#202c36';
  ctx.fillRect(-carWidth * 0.58, -carHeight * 0.2, carWidth * 0.18, carHeight * 0.54);
  ctx.fillRect(carWidth * 0.4, -carHeight * 0.2, carWidth * 0.18, carHeight * 0.54);
  ctx.fillStyle = createGradient(
    ctx,
    0,
    -carHeight / 2,
    0,
    carHeight / 2,
    [[0, '#ff8561'], [0.6, '#dc4e48'], [1, '#a9363e']],
    '#dc4e48'
  );
  ctx.beginPath();
  ctx.roundRect(-carWidth / 2, -carHeight / 2, carWidth, carHeight, 10 * scale);
  ctx.fill();
  ctx.fillStyle = '#2a4454';
  ctx.beginPath();
  ctx.roundRect(-carWidth * 0.31, -carHeight * 0.31, carWidth * 0.62, carHeight * 0.27, 6 * scale);
  ctx.fill();
  ctx.fillStyle = '#e9fbf1';
  ctx.fillRect(-carWidth * 0.28, carHeight * 0.22, carWidth * 0.16, 5 * scale);
  ctx.fillRect(carWidth * 0.12, carHeight * 0.22, carWidth * 0.16, 5 * scale);
  ctx.fillStyle = '#ffd56d';
  ctx.fillRect(-carWidth * 0.34, -carHeight * 0.42, carWidth * 0.2, 5 * scale);
  ctx.fillRect(carWidth * 0.14, -carHeight * 0.42, carWidth * 0.2, 5 * scale);
  ctx.restore();
}

export function getPinyinCanvasViewport({
  width = 640,
  height = 360,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH
} = {}) {
  const safeMinWidth = Math.max(1, finitePositive(minWidth, DEFAULT_MIN_WIDTH));
  const safeMaxWidth = Math.max(safeMinWidth, finitePositive(maxWidth, DEFAULT_MAX_WIDTH));
  const requestedWidth = finitePositive(width, finitePositive(height, 360) * TRACK_ASPECT_RATIO);
  const viewportWidth = Math.round(Math.min(safeMaxWidth, Math.max(safeMinWidth, requestedWidth)));
  return {
    width: viewportWidth,
    height: Math.round(viewportWidth / TRACK_ASPECT_RATIO),
    aspectRatio: TRACK_ASPECT_RATIO
  };
}

export function getPinyinRaceRenderModel(snapshot = {}, {
  now = 0,
  width = 640,
  height = 360,
  sampleCount = null,
  viewDistance = null
} = {}) {
  if (!snapshot.track) throw new TypeError('A pinyin track is required to render a race frame');
  const samples = visibleTrackSamples(snapshot.track, {
    sampleCount: sampleCount || snapshot.sampleCount || 18,
    viewDistance: viewDistance || snapshot.viewDistance || 520
  });
  const speed = Math.max(0, finiteOr(snapshot.metrics?.speed?.current ?? snapshot.speed, 0));
  const learningClock = snapshot.learningClock || {};
  const paused = snapshot.status === 'paused' || learningClock.mode === 'paused';
  const slowed = !paused && learningClock.mode === 'slowed';
  const racePhase = getPinyinRacePhase({
    now,
    startedAt: snapshot.raceStartedAt,
    finishAt: snapshot.finishAt,
    manualPaused: snapshot.status === 'paused',
    learningClock
  });
  const reason = String(learningClock.reason || '');
  const telemetryStatus = racePhase.phase === PINYIN_RACE_PHASES.COUNTDOWN
    ? 'countdown'
    : racePhase.phase === PINYIN_RACE_PHASES.FINISH
      ? 'finish'
      : paused
        ? 'paused'
        : slowed
          ? 'slowed'
          : 'racing';
  const telemetryLabel = paused
    ? reason === 'review' ? '复习暂停' : '赛道暂停'
    : racePhase.phase === PINYIN_RACE_PHASES.COUNTDOWN || racePhase.phase === PINYIN_RACE_PHASES.FINISH
      ? racePhase.label
      : slowed
        ? reason === 'playback' ? '语音减速' : reason === 'hint' ? '提示减速' : '减速中'
        : '冲刺中';
  const timeMs = Math.max(0, finiteOr(now, 0));
  const motionReduced = snapshot.reducedMotion === true;
  const cameraDistance = finiteOr(snapshot.track.cameraDistance, 0);
  const visibleSpeed = motionReduced || racePhase.phase === PINYIN_RACE_PHASES.COUNTDOWN ? 0 : speed;
  const stripePhase = fraction((cameraDistance + visibleSpeed * timeMs / 1000) / STRIPE_LENGTH);
  const vehicle = projectTrackObject(snapshot.track, snapshot.vehicle || { distance: cameraDistance, lane: 1 });
  const suspension = motionReduced ? 0 : clamp(0.5 + Math.sin(timeMs / 105) * 0.5, 0, 1);
  const bob = suspension * Math.min(5, 1.2 + visibleSpeed / 68);
  const curveLean = vehicle.pathType === 'curve-left' || vehicle.pathType === 'curve-right' || vehicle.pathType === 's-bend'
    ? 0.035
    : 0;
  const lean = motionReduced ? 0 : (visibleSpeed > 0 ? 0.018 : 0) + curveLean;
  const roadSegments = samples.slice(0, -1).map((near, index) => ({
    near,
    far: samples[index + 1],
    stripeVisible: Math.floor(index + stripePhase * 3) % 3 === 0,
    featureVisible: Boolean(near.landmark && (index === 0 || near.landmark !== samples[index - 1].landmark)),
    stripePhase
  }));
  const targets = (Array.isArray(snapshot.targets) ? snapshot.targets : [])
    .map((target) => ({
      ...target,
      ...projectTrackObject(snapshot.track, target)
    }))
    .filter((target) => target.y <= 0.95 && target.y >= 0.04);
  const competition = getPinyinRaceCompetition(snapshot, { now });
  const rivals = competition.rivals
    .filter((rival) => rival.y <= 0.95 && rival.y >= 0.04);
  return {
    width,
    height,
    horizonY: HORIZON_Y,
    stripePhase,
    speed: visibleSpeed,
    racePhase,
    telemetry: {
      status: telemetryStatus,
      label: telemetryLabel,
      speed: Math.round(visibleSpeed),
      speedRatio: clamp(visibleSpeed / 148, 0, 1),
      lap: Math.max(1, Math.floor(Number(snapshot.lap) || 1))
    },
    finishApproach: snapshot.track.totalLength - cameraDistance <= 180,
    samples,
    roadSegments,
    targets,
    rivals,
    competition,
    vehicle: {
      ...vehicle,
      bob,
      lean,
      boost: racePhase.phase === PINYIN_RACE_PHASES.COUNTDOWN ? 0 : clamp(speed / 150, 0, 1)
    }
  };
}

export function createPinyinCanvasRenderer({ canvas, context, width = 640, height = 360 } = {}) {
  const ctx = context || canvas?.getContext?.('2d');
  if (!ctx) throw new TypeError('A Canvas 2D context is required');
  let viewport = getPinyinCanvasViewport({ width: canvas?.clientWidth || canvas?.width || width, height });

  function applyCanvasSize() {
    if (!canvas) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
  }

  function resize(nextSize = {}) {
    viewport = getPinyinCanvasViewport({ ...nextSize, width: nextSize.width || viewport.width });
    applyCanvasSize();
    return { ...viewport };
  }

  function render(snapshot, options = {}) {
    const { width: viewWidth, height: viewHeight } = viewport;
    const model = getPinyinRaceRenderModel(snapshot, {
      ...options,
      width: viewWidth,
      height: viewHeight
    });
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    drawSky(ctx, viewWidth, viewHeight, model);
    drawRoad(ctx, model, viewWidth, viewHeight);
    drawRoadsideMotion(ctx, model, viewWidth, viewHeight);
    model.rivals
      .slice()
      .sort((left, right) => left.y - right.y)
      .forEach((rival) => drawRivalVehicle(ctx, rival, viewWidth, viewHeight));
    model.targets
      .slice()
      .sort((left, right) => left.y - right.y)
      .forEach((target) => drawTarget(ctx, target, viewWidth, viewHeight));
    drawVehicle(ctx, model, viewWidth, viewHeight);
    drawRaceTelemetry(ctx, model, viewWidth, viewHeight);
    const hasCompetitionProgress = drawCompetitionProgress(ctx, model, viewWidth, viewHeight);
    const hasRacePhase = drawRacePhase(ctx, model, viewWidth, viewHeight);
    return {
      width: viewWidth,
      height: viewHeight,
      sampleCount: model.samples.length,
      roadSegments: model.roadSegments.length,
      visibleSegments: [...new Set(model.samples.map((sample) => sample.type))],
      landmarks: [...new Set(model.samples.map((sample) => sample.landmark).filter(Boolean))],
      hasVehicle: true,
      hasRoadsideMotion: true,
      stripePhase: model.stripePhase,
      telemetry: model.telemetry,
      finishApproach: model.finishApproach,
      hasTelemetry: true,
      racePhase: model.racePhase,
      hasRacePhase,
      hasRivals: model.rivals.length > 0,
      hasCompetitionProgress
    };
  }

  applyCanvasSize();
  return Object.freeze({
    render,
    resize,
    getViewport: () => ({ ...viewport }),
    get width() { return viewport.width; },
    get height() { return viewport.height; }
  });
}
