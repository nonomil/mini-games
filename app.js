const app = document.querySelector('[data-game-grid]');
const featuredApp = document.querySelector('[data-featured-grid]');
const projectLinks = document.querySelector('[data-project-links]');
const notice = document.querySelector('[data-notice]');
const profileLabel = document.querySelector('[data-profile-label]');
const gameCount = document.querySelector('[data-game-count]');
const pointBadge = document.querySelector('[data-points]');
const categoryHint = document.querySelector('#playgroundCatalogHint');
const visibleCount = document.querySelector('#playgroundVisibleCount');
const contentSummary = document.querySelector('[data-content-summary]');

const FEATURED_CATALOG = Object.freeze([
  { id: 'word-memory-map', category: 'explore', title: '单词跑酷', kicker: '英语跑酷', description: '沿着像素地图跑起来，把单词、记忆和闯关放进一局游戏里。', image: 'assets/ui/pg-card-word-memory.webp', action: '进入游戏' },
  { id: 'typing-defense', category: 'typing', title: '消灭苦力怕', kicker: '输入训练', description: '弓箭起手、键盘命中，适合先热手再切别的训练。', image: 'assets/ui/pg-card-typing-defense.webp', action: '进入游戏' },
  { id: 'word-cannon', category: 'typing', title: '拼音赛车', kicker: '合集子游戏', description: '看字换道、拼音发射，短局节奏很干脆，适合轮换着玩。', image: 'assets/ui/pg-card-word-cannon.webp', action: '直接开打', query: 'game=word-cannon' },
  { id: 'word-shooter', category: 'typing', title: '飞机大战', kicker: '合集子游戏', description: '用字母射击开局，适合孩子先建立按键马上有反馈的感觉。', image: 'assets/ui/pg-card-word-shooter.webp', action: '直接开打', query: 'game=word-shooter' },
  { id: 'math-pk', category: 'math', title: '数学冒险', kicker: '加法篇 · 乘法篇', description: '加法篇、乘法篇、每日随机 PK，按关卡一步步玩下去。', image: 'assets/ui/pg-card-mathpk.webp', action: '开始冒险' },
  { id: 'hanzi', category: 'literacy', title: '汉字游戏', kicker: '汉字挑战', description: '看字、认音、接气泡，适合把记字和反应放在一起练。', image: 'assets/ui/pg-card-hanzi.webp', action: '进入游戏' },
  { id: 'card-arena', category: 'cards', title: '卡牌对战', kicker: '战斗玩法', description: '把组队、出招和结算接成完整一局，适合继续推训练营。', image: 'assets/ui/pg-card-arena.webp', action: '进入游戏' },
  { id: 'pinyin-snake', category: 'literacy', title: '贪吃蛇', kicker: '合集子游戏', description: '方向键配拼音块，轻一点也很上头，适合切换手感。', image: 'assets/ui/pg-card-pinyin-snake.webp', action: '直接开打', query: 'game=pinyin-snake' },
  { id: 'hanzi-bubble-runner', category: 'explore', title: '独立小游戏项目', kicker: '独立项目', description: '汉字泡泡跑酷和拼音星际巡航保持独立进度，打开即可游玩。', image: 'assets/ui/pg-card-hanzi.webp', action: '打开新窗口' }
]);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function activeUrl(link) {
  const local = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
  return String(local ? link.devUrl || link.url : link.url || '');
}

function localGameUrl(game) {
  const path = game.id === 'word-cannon' || game.id === 'word-shooter' || game.id === 'pinyin-snake'
    ? `games/learning-arcade/?${game.query}`
    : game.id === 'word-memory-map'
      ? 'games/word-memory-map/?vocab=all'
      : game.path;
  return path || '';
}

function setNotice(text, kind = 'info') {
  notice.textContent = text;
  notice.dataset.kind = kind;
}

function renderGame(game) {
  const path = escapeHtml(localGameUrl(game));
  return `<article class="game-card" style="--accent:${escapeHtml(game.accent || '#3caa9c')}">
    <p class="eyebrow">${escapeHtml(game.kicker || '独立小游戏')}</p>
    <h3>${escapeHtml(game.title)}</h3>
    <p>${escapeHtml(game.description)}</p>
    <div class="game-meta">${(game.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <a class="game-action" href="${path}" data-game-path="${path}" target="_blank" rel="noopener noreferrer">打开新窗口</a>
  </article>`;
}

function renderFeaturedGame(game) {
  const path = escapeHtml(localGameUrl(game));
  const image = escapeHtml(game.image || 'assets/ui/pg-card-hanzi.webp');
  const cropClass = ['typing-defense', 'word-shooter', 'hanzi'].includes(game.id) ? ' pg-card-media-crop-right' : '';
  return `<a class="pg-img-card pg-feature-card" href="${path}" data-game-path="${path}" data-playground-category="${escapeHtml(game.category)}" target="_blank" rel="noopener noreferrer">
    <span class="pg-card-media${cropClass}"><img src="${image}" alt="${escapeHtml(game.title)}" loading="eager" decoding="async"></span>
    <span class="pg-card-copy"><span class="pg-card-kicker">${escapeHtml(game.kicker)}</span><strong class="pg-card-title">${escapeHtml(game.title)}</strong><span class="pg-card-desc">${escapeHtml(game.description)}</span></span>
    <span class="pg-card-footer">${escapeHtml(game.action)}<span aria-hidden="true">${game.action === '打开新窗口' ? '↗' : '→'}</span></span>
  </a>`;
}

function renderProjectLink(link) {
  const url = activeUrl(link);
  return url
    ? `<a class="project-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.title)}</a>`
    : `<span class="project-link pending">${escapeHtml(link.title)}（发布地址待确认）</span>`;
}

function renderContentSummary(manifest) {
  if (!contentSummary) return;
  const content = manifest.content || {};
  const maps = Array.isArray(content.maps) ? content.maps : [];
  const vocab = Array.isArray(content.vocab) ? content.vocab : [];
  const allVocabPack = vocab.find((pack) => pack.id === 'word-memory-all');
  const cardCount = Number(allVocabPack?.cardCount) || vocab.reduce((sum, pack) => sum + (Number(pack.cardCount) || 0), 0);
  const mapCards = maps.map((map) => `<article class="content-stat-card">
    <span class="content-stat-icon" aria-hidden="true">${map.id === 'classic-adventure' ? '✦' : '⌘'}</span>
    <div><strong>${escapeHtml(map.title)}</strong><small>${escapeHtml(map.count)} 个完整内容单元</small></div>
  </article>`).join('');
  contentSummary.innerHTML = `${mapCards}<article class="content-stat-card content-stat-card-vocab">
    <span class="content-stat-icon" aria-hidden="true">Aa</span>
    <div><strong>全量词库</strong><small>${cardCount.toLocaleString('zh-CN')} 张运行词卡 · ${vocab.length} 个词库包</small></div>
  </article>`;
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

function setFeaturedCategory(category) {
  const tabs = [...document.querySelectorAll('[data-playground-category]')].filter((node) => node.matches('button'));
  const cards = [...document.querySelectorAll('[data-featured-grid] [data-playground-category]')];
  const sidebarLinks = [...document.querySelectorAll('[data-sidebar-category]')];
  const nextCategory = ['all', 'explore', 'typing', 'math', 'literacy', 'cards'].includes(category) ? category : 'all';
  let count = 0;
  tabs.forEach((tab) => {
    const selected = tab.dataset.playgroundCategory === nextCategory;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
  });
  cards.forEach((card) => {
    const visible = nextCategory === 'all' || card.dataset.playgroundCategory === nextCategory;
    card.hidden = !visible;
    if (visible) count += 1;
  });
  sidebarLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.sidebarCategory === nextCategory));
  if (visibleCount) visibleCount.textContent = String(count);
  if (categoryHint) categoryHint.textContent = `${nextCategory === 'all' ? '全部' : ({ explore: '探险地图', typing: '打字训练', math: '数学挑战', literacy: '拼音识字', cards: '卡牌对战' }[nextCategory])} · ${count} 款精选游戏`;
}

function wireFeaturedTabs() {
  const tabs = [...document.querySelectorAll('.playground-category-tab')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setFeaturedCategory(tab.dataset.playgroundCategory));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      setFeaturedCategory(tabs[nextIndex].dataset.playgroundCategory);
    });
  });
}

function wireSidebarCategories() {
  document.querySelectorAll('[data-sidebar-category]').forEach((link) => {
    link.addEventListener('click', () => setFeaturedCategory(link.dataset.sidebarCategory));
  });
}

function readLocalPoints() {
  try { return Math.max(0, Number(localStorage.getItem('minigames_local_points') || 0) || 0); }
  catch (error) { return 0; }
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
  renderContentSummary(manifest);
  if (pointBadge) pointBadge.textContent = String(readLocalPoints());
  profileLabel.textContent = window.MiniGamesBridge?.getLaunchInfo().active ? '主站启动 · 独立进度' : '独立游戏空间';
  const manifestGames = new Map(manifest.games.map((game) => [game.id, game]));
  const featuredGames = FEATURED_CATALOG.map((game) => Object.assign({}, manifestGames.get(game.id), game)).filter((game) => localGameUrl(game));
  featuredApp.innerHTML = featuredGames.map(renderFeaturedGame).join('');
  app.innerHTML = manifest.games.map(renderGame).join('');
  projectLinks.innerHTML = Object.values(manifest.links || {}).map(renderProjectLink).join('');
  setFeaturedCategory('all');
  wireFeaturedTabs();
  wireSidebarCategories();
  wireGameLinks();
} catch (error) {
  console.warn('[mini-games] boot failed', error);
  setNotice('小游戏目录加载失败，请使用本地静态服务打开。', 'error');
}
