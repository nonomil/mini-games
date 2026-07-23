const app = document.querySelector('[data-game-grid]');
const projectLinks = document.querySelector('[data-project-links]');
const notice = document.querySelector('[data-notice]');
const profileLabel = document.querySelector('[data-profile-label]');
const gameCount = document.querySelector('[data-game-count]');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function activeUrl(link) {
  const local = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
  return String(local ? link.devUrl || link.url : link.url || '');
}

function setNotice(text, kind = 'info') {
  notice.textContent = text;
  notice.dataset.kind = kind;
}

function renderGame(game) {
  const path = escapeHtml(game.path);
  return `<article class="game-card" style="--accent:${escapeHtml(game.accent || '#3caa9c')}">
    <p class="eyebrow">${escapeHtml(game.kicker || '独立小游戏')}</p>
    <h3>${escapeHtml(game.title)}</h3>
    <p>${escapeHtml(game.description)}</p>
    <div class="game-meta">${(game.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <a class="game-action" href="${path}" data-game-path="${path}" target="_blank">打开新窗口</a>
  </article>`;
}

function renderProjectLink(link) {
  const url = activeUrl(link);
  return url
    ? `<a class="project-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.title)}</a>`
    : `<span class="project-link pending">${escapeHtml(link.title)}（发布地址待确认）</span>`;
}

function wireGameLinks() {
  document.querySelectorAll('[data-game-path]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = window.MiniGamesBridge?.gameUrl(link.dataset.gamePath || link.getAttribute('href') || '');
      if (!target) return;
      event.preventDefault();
      const opened = window.open(target, '_blank');
      if (!opened) setNotice('浏览器阻止了新窗口，请允许弹窗后重试。', 'error');
    });
  });
}

window.addEventListener('mini-games:reward', (event) => {
  const status = event.detail?.status;
  setNotice(status === 'accepted' ? '本局完成，主站奖励已到账。' : status === 'duplicate' ? '本次完成已经处理过。' : '本局已结束，但主站暂未接受奖励。', status === 'rejected' ? 'error' : 'info');
});

try {
  const response = await fetch('./data/manifest.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`manifest http ${response.status}`);
  const manifest = await response.json();
  gameCount.textContent = String(manifest.games.length);
  profileLabel.textContent = window.MiniGamesBridge?.getLaunchInfo().active ? '主站启动 · 独立进度' : '独立游戏空间';
  app.innerHTML = manifest.games.map(renderGame).join('');
  projectLinks.innerHTML = Object.values(manifest.links || {}).map(renderProjectLink).join('');
  wireGameLinks();
} catch (error) {
  console.warn('[mini-games] boot failed', error);
  setNotice('小游戏目录加载失败，请使用本地静态服务打开。', 'error');
}
