import { EXPRESSION_CARDS } from './tennis-content.js';
import { PHASES, createTennisSession } from './tennis-session.js';

const ERROR_LABELS = {
  'wrong-meaning': '意义不匹配',
  'wrong-collocation': '搭配不自然',
  'wrong-context': '语境不合适'
};

const els = {
  court: document.querySelector('#court-panel'),
  ball: document.querySelector('#tennis-ball'),
  playerScore: document.querySelector('#player-score'),
  opponentScore: document.querySelector('#opponent-score'),
  roundLabel: document.querySelector('#round-label'),
  phaseLabel: document.querySelector('#phase-label'),
  promptKicker: document.querySelector('#prompt-kicker'),
  promptText: document.querySelector('#prompt-text'),
  promptZh: document.querySelector('#prompt-zh'),
  choices: document.querySelector('#choice-grid'),
  keyboardHint: document.querySelector('#keyboard-hint'),
  feedback: document.querySelector('#feedback-panel'),
  feedbackMark: document.querySelector('#feedback-mark'),
  feedbackKicker: document.querySelector('#feedback-kicker'),
  feedbackTitle: document.querySelector('#feedback-title'),
  feedbackReason: document.querySelector('#feedback-reason'),
  feedbackExample: document.querySelector('#feedback-example'),
  result: document.querySelector('#result-panel'),
  resultSummary: document.querySelector('#result-summary'),
  resultList: document.querySelector('#result-list'),
  action: document.querySelector('#action-button'),
  review: document.querySelector('#review-button'),
  audio: document.querySelector('#audio-button'),
  status: document.querySelector('#status-message')
};

let session = createTennisSession({ cards: EXPRESSION_CARDS, roundSize: 7 });
let activeChoiceIndex = 0;
let pendingReturnTimer = null;
let spokenResultKey = '';

function speak(text) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}

function clearPendingReturn() {
  if (pendingReturnTimer !== null) {
    window.clearTimeout(pendingReturnTimer);
    pendingReturnTimer = null;
  }
}

function setStatus(message) {
  els.status.textContent = message;
}

function updateChoiceFocus() {
  const buttons = [...els.choices.querySelectorAll('button[data-card-id]')];
  buttons.forEach((button, index) => {
    button.classList.toggle('is-active', index === activeChoiceIndex);
    button.setAttribute('aria-current', index === activeChoiceIndex ? 'true' : 'false');
  });
}

function renderChoices(state) {
  if (!state.current || state.phase !== PHASES.CHOOSE) {
    els.choices.hidden = true;
    els.choices.replaceChildren();
    return;
  }

  els.choices.hidden = false;
  els.choices.replaceChildren(...state.current.choices.map((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice-button';
    button.dataset.cardId = choice.cardId;
    button.dataset.choiceIndex = String(index);
    button.setAttribute('aria-label', `选择表达 ${choice.expression}`);
    button.innerHTML = `<span class="choice-index">${index + 1}</span><span class="choice-expression">${choice.expression}</span>`;
    return button;
  }));
  activeChoiceIndex = Math.min(activeChoiceIndex, state.current.choices.length - 1);
  updateChoiceFocus();
}

function renderFeedback(state) {
  const show = state.phase === PHASES.FEEDBACK && state.result && state.current;
  els.feedback.hidden = !show;
  if (!show) return;

  const result = state.result;
  const target = state.current.choices.find((choice) => choice.cardId === state.current.targetCardId);
  const correct = result.correct;
  els.feedback.classList.toggle('is-correct', correct);
  els.feedbackMark.textContent = correct ? '✓' : '!';
  els.feedbackKicker.textContent = correct ? 'GOOD RETURN' : ERROR_LABELS[result.wrongTag] || '回球反馈';
  els.feedbackTitle.textContent = correct
    ? (result.independent ? '独立选对，好球！' : '提示后选对，继续练习！')
    : `正确表达：${target.expression}`;
  els.feedbackReason.textContent = correct
    ? `Meaning: ${target.definitionEn}`
    : `${ERROR_LABELS[result.wrongTag] || '需要再读一次'}：${result.feedback.explanationZh} ${result.feedback.explanationEn}`;
  els.feedbackExample.textContent = `Example: ${target.example}`;

  const resultKey = `${result.cardId}:${result.completedAt}`;
  if (!correct && spokenResultKey !== resultKey) {
    spokenResultKey = resultKey;
    speak(target.expression);
  }
}

function renderCompletion(state) {
  const show = state.phase === PHASES.COMPLETE;
  els.review.hidden = true;
  els.result.hidden = !show;
  if (!show) return;

  const independent = state.results.filter((item) => item.learningEvidence === 'independent-correct').length;
  const hinted = state.results.filter((item) => item.learningEvidence === 'hint-correct').length;
  const reviewSet = session.getReviewSet();
  els.resultSummary.textContent = `你拿到 ${state.score.player} 分，对手拿到 ${state.score.opponent} 分。独立选对 ${independent} 球，提示后选对 ${hinted} 球。错表达 ${reviewSet.length} 个。`;
  els.resultList.replaceChildren(...(reviewSet.length ? reviewSet : [{ cardId: 'perfect' }]).map((item) => {
    const li = document.createElement('li');
    if (item.cardId === 'perfect') {
      li.textContent = '本局没有错表达，下一局可以试试更快读出语境。';
    } else {
      li.textContent = `${item.expression} · ${ERROR_LABELS[item.wrongTag] || '需要复习'}：${item.feedback.explanationZh} ${item.feedback.explanationEn}`;
    }
    return li;
  }));
  els.review.hidden = reviewSet.length === 0;
}

function render() {
  const state = session.getState();
  els.court.dataset.phase = state.phase;
  els.court.classList.toggle('is-rallying', state.phase === PHASES.RALLY);
  els.playerScore.textContent = String(state.score.player);
  els.opponentScore.textContent = String(state.score.opponent);
  els.roundLabel.textContent = state.phase === PHASES.READY || state.phase === PHASES.COMPLETE
    ? (state.phase === PHASES.COMPLETE ? '本局结束' : '7 球短局')
    : `第 ${Math.min(state.roundIndex + 1, state.roundSize)} / ${state.roundSize} 球`;
  els.phaseLabel.textContent = state.phase.toUpperCase();

  if (state.phase === PHASES.READY) {
    els.promptKicker.textContent = '先读提示，再把球打向正确表达';
    els.promptText.textContent = '每一局 7 球，慢慢读完再发球。';
    els.promptZh.textContent = '每道题有一个自然答案，错误后会告诉你错在意义、搭配还是语境。';
    setStatus('按开始比赛进入第一球。');
  } else if (state.phase === PHASES.SERVE) {
    els.promptKicker.textContent = state.mode === 'review' ? '错表达复习 · 不改变长期掌握度' : '准备阶段没有倒计时';
    els.promptText.textContent = `第 ${state.roundIndex + 1} 球准备好了吗？`;
    els.promptZh.textContent = state.mode === 'review'
      ? '只练本局错表达；这次结果仍是练习证据，不会直接改变长期掌握度。'
      : '读完提示后按“发球”，再选择最自然的英文表达。';
    setStatus(state.mode === 'review' ? '这是本局错题集合的复习回合。' : '读完后再发球，速度不是这道题的考点。');
  } else if (state.current) {
    els.promptKicker.textContent = state.current.promptMode === 'context' ? '根据语境选择表达' : '根据英文释义选择表达';
    els.promptText.textContent = state.current.prompt;
    els.promptZh.textContent = state.current.promptZh;
    setStatus(state.phase === PHASES.CHOOSE ? '点击表达，或用 1-3 / 方向键选择后按 Space 回球。' : '球正在飞向目标区。');
  }

  renderChoices(state);
  renderFeedback(state);
  renderCompletion(state);

  els.keyboardHint.hidden = ![PHASES.CHOOSE, PHASES.RALLY].includes(state.phase);
  els.audio.hidden = ![PHASES.CHOOSE, PHASES.FEEDBACK].includes(state.phase);
  els.audio.disabled = state.phase === PHASES.RALLY;
  if (state.phase === PHASES.READY) els.action.textContent = '开始比赛';
  if (state.phase === PHASES.SERVE) els.action.textContent = '发球';
  if (state.phase === PHASES.CHOOSE) els.action.textContent = state.current?.hintUsed ? '已看提示' : '看一个提示';
  if (state.phase === PHASES.RALLY) {
    els.action.textContent = '回球中…';
    els.action.disabled = true;
  } else {
    els.action.disabled = false;
  }
  if (state.phase === PHASES.FEEDBACK) els.action.textContent = '下一球';
  if (state.phase === PHASES.COMPLETE) els.action.textContent = '再打一局';
}

function hitSelectedChoice(index) {
  const state = session.getState();
  if (state.phase !== PHASES.CHOOSE || !state.current?.choices[index]) return;
  activeChoiceIndex = index;
  session.selectCard(state.current.choices[index].cardId);
  render();
  clearPendingReturn();
  pendingReturnTimer = window.setTimeout(() => {
    pendingReturnTimer = null;
    if (session.getState().phase === PHASES.RALLY) {
      session.returnBall();
      render();
    }
  }, 420);
}

function moveChoice(direction) {
  const state = session.getState();
  if (state.phase !== PHASES.CHOOSE) return;
  activeChoiceIndex = (activeChoiceIndex + direction + state.current.choices.length) % state.current.choices.length;
  updateChoiceFocus();
}

function handleAction() {
  const state = session.getState();
  if (state.phase === PHASES.READY) session.start();
  else if (state.phase === PHASES.SERVE) session.serve();
  else if (state.phase === PHASES.CHOOSE) session.useHint();
  else if (state.phase === PHASES.FEEDBACK) session.nextPoint();
  else if (state.phase === PHASES.COMPLETE) {
    clearPendingReturn();
    session = session.restart();
    session.start();
  }
  render();
}

function handleReview() {
  const state = session.getState();
  if (state.phase !== PHASES.COMPLETE) return;
  const reviewSession = session.startReview();
  if (!reviewSession) return;
  clearPendingReturn();
  session = reviewSession;
  session.start();
  render();
}

function handleAudio() {
  const state = session.getState();
  const card = state.current?.choices.find((choice) => choice.cardId === state.current.targetCardId);
  if (!card) return;
  session.replayAudio();
  speak(card.expression);
  render();
}

function handleChoicePointerDown(event) {
  const button = event.target.closest('button[data-card-id]');
  if (!button) return;
  event.preventDefault();
  hitSelectedChoice(Number(button.dataset.choiceIndex));
}

function handleChoiceClick(event) {
  const button = event.target.closest('button[data-card-id]');
  if (button) hitSelectedChoice(Number(button.dataset.choiceIndex));
}

function handleKeyDown(event) {
  const state = session.getState();
  const activation = event.code === 'Space' || event.key === 'Enter';
  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.key) || activation) event.preventDefault();

  if (state.phase === PHASES.CHOOSE) {
    if (event.key === 'ArrowLeft') moveChoice(-1);
    else if (event.key === 'ArrowRight') moveChoice(1);
    else if (/^[1-3]$/.test(event.key)) hitSelectedChoice(Number(event.key) - 1);
    else if (activation) hitSelectedChoice(activeChoiceIndex);
  } else if (activation && state.phase !== PHASES.RALLY) {
    handleAction();
  }
}

els.action.addEventListener('click', handleAction);
els.review.addEventListener('click', handleReview);
els.audio.addEventListener('click', handleAudio);
els.choices.addEventListener('pointerdown', handleChoicePointerDown);
els.choices.addEventListener('click', handleChoiceClick);
window.addEventListener('keydown', handleKeyDown);

render();
