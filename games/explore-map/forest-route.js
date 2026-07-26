(function (root, factory) {
  'use strict';

  root.ForestRoute = factory(root.ExplorationSession);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (sessionApi) {
  'use strict';

  const FOREST_MAP_ID = 'forest-farm';
  const NODE_COPY = {
    'forest-entry': { title: '林间入口', subtitle: '查看今日路线，准备出发' },
    'forest-guide-01': { title: '森林向导', subtitle: '接受今天的探险任务' },
    'forest-learn-01': { title: '学习屋', subtitle: '认识 3 张新卡或到期卡' },
    'forest-creek-02': { title: '溪流小径', subtitle: '寻找水滴，完成识别练习' },
    'forest-explorer-03': { title: '单词探险屋', subtitle: '发起一局单词学习活动' },
    'forest-farm-04': { title: '林地农场', subtitle: '播种并记录世界变化' },
    'forest-checkpoint-05': { title: '古树检查点', subtitle: '进行一轮区域复习' },
    'forest-portal': { title: '森林传送门', subtitle: '返回世界地图或继续路线' }
  };

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function uniqueIds(value) {
    return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))];
  }

  function getForestMap(manifest) {
    return manifest?.explorationMaps?.find(map => map.id === FOREST_MAP_ID) || null;
  }

  function getNode(manifest, nodeId) {
    return getForestMap(manifest)?.nodes?.find(node => node.nodeId === nodeId) || null;
  }

  function createState(manifest, saved = {}) {
    const map = getForestMap(manifest);
    if (!map) throw new Error('forest-farm map is not configured');
    const savedNode = saved.mapId === map.id ? getNode(manifest, saved.currentNodeId || saved.nodeId) : null;
    const node = savedNode || map.nodes[0];
    return {
      mapId: map.id,
      routeId: map.routeId,
      currentNodeId: node.nodeId,
      currentTaskId: text(saved.currentTaskId || saved.taskId || node.taskId),
      completedNodeIds: uniqueIds(saved.completedNodeIds),
      learningSessionIds: uniqueIds(saved.learningSessionIds),
      unclaimedReceiptIds: uniqueIds(saved.unclaimedReceiptIds),
      remainingCardIds: uniqueIds(saved.remainingCardIds)
    };
  }

  function visibleNodes(manifest) {
    return (getForestMap(manifest)?.nodes || []).map(node => node.nodeType);
  }

  function selectNode(manifest, state, nodeId) {
    const node = getNode(manifest, nodeId);
    if (!node) return state;
    return {
      ...state,
      currentNodeId: node.nodeId,
      currentTaskId: node.taskId
    };
  }

  function completeNode(manifest, state) {
    const node = getNode(manifest, state.currentNodeId);
    if (!node) return state;
    return {
      ...state,
      completedNodeIds: uniqueIds([...state.completedNodeIds, node.nodeId])
    };
  }

  function buildActivityLaunch(manifest, state, options = {}) {
    const node = getNode(manifest, state.currentNodeId);
    if (!node || node.nodeType !== 'activity' || !node.activityId) {
      throw new Error('select an activity node before launching');
    }
    const baseUrl = new URL(options.baseUrl || 'http://localhost/games/explore-map/');
    const returnUrl = new URL('./?mapId=' + FOREST_MAP_ID, baseUrl).toString();
    const returnContext = sessionApi.createReturnContext(sessionApi.createSession(state), {
      activityId: node.activityId,
      returnUrl
    });
    const activityUrl = new URL(options.activityBaseUrl || '../word-memory-map/?vocab=all', baseUrl);
    activityUrl.searchParams.set('returnContext', sessionApi.encodeReturnContext(returnContext));
    return {
      activityId: node.activityId,
      nodeId: node.nodeId,
      url: activityUrl.toString(),
      returnContext
    };
  }

  function restoreState(manifest, returnContext) {
    return createState(manifest, {
      mapId: returnContext?.mapId,
      currentNodeId: returnContext?.nodeId,
      currentTaskId: returnContext?.taskId,
      completedNodeIds: returnContext?.completedNodeIds,
      learningSessionIds: returnContext?.learningSessionIds,
      unclaimedReceiptIds: returnContext?.unclaimedReceiptIds,
      remainingCardIds: returnContext?.remainingCardIds
    });
  }

  function nodeCopy(node) {
    return NODE_COPY[node.nodeId] || { title: node.nodeId, subtitle: node.taskId || '' };
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function assetUrl(path) {
    if (typeof window === 'undefined' || !window.location) return path;
    return new URL('../../' + path.replace(/^\.\//, ''), window.location.href).toString();
  }

  function sessionFromState(state) {
    return sessionApi.createSession({
      ...state,
      currentNodeId: state.currentNodeId,
      currentTaskId: state.currentTaskId
    });
  }

  function persistState(state) {
    sessionApi.saveSession(sessionFromState(state));
  }

  function render(host, manifest, state) {
    const map = getForestMap(manifest);
    const currentNode = getNode(manifest, state.currentNodeId) || map.nodes[0];
    const copy = nodeCopy(currentNode);
    host.innerHTML = `
      <section class="forest-route" aria-label="森林农场探索路线">
        <header class="forest-route-header">
          <div>
            <span class="forest-route-kicker">FOREST FARM / ${escapeHtml(map.routeId)}</span>
            <h1>${escapeHtml(map.title)}</h1>
            <p>今日路线保留在地图上，选择任意节点继续探索。</p>
          </div>
          <div class="forest-route-progress" aria-live="polite">
            <strong>${state.completedNodeIds.length}</strong><span>/${map.nodes.length} 节点已记录</span>
          </div>
        </header>
        <div class="forest-route-board" style="--forest-background: url('${escapeHtml(assetUrl(map.background))}')">
          <div class="forest-route-node-grid" role="list" aria-label="森林路线节点">
            ${map.nodes.map(node => {
              const item = nodeCopy(node);
              const selected = node.nodeId === state.currentNodeId;
              const completed = state.completedNodeIds.includes(node.nodeId);
              return `<button type="button" class="forest-route-node forest-route-node-${escapeHtml(node.nodeType)}${selected ? ' is-selected' : ''}${completed ? ' is-completed' : ''}" style="--node-x:${node.position.x * 100}%;--node-y:${node.position.y * 100}%" data-forest-node-id="${escapeHtml(node.nodeId)}" aria-pressed="${selected ? 'true' : 'false'}">
                <span class="forest-route-node-type">${escapeHtml(node.nodeType)}</span>
                <strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(item.subtitle)}</small>
              </button>`;
            }).join('')}
          </div>
        </div>
        <section class="forest-route-detail" aria-live="polite">
          <div>
            <span class="forest-route-detail-type">${escapeHtml(currentNode.nodeType)} · ${escapeHtml(currentNode.taskId)}</span>
            <h2>${escapeHtml(copy.title)}</h2>
            <p>${escapeHtml(copy.subtitle)}</p>
          </div>
          <div class="forest-route-detail-actions">
            ${currentNode.nodeType === 'activity' ? '<button type="button" class="forest-route-primary" data-forest-action="launch">发起学习活动</button>' : ''}
            <button type="button" class="forest-route-secondary" data-forest-action="complete" ${state.completedNodeIds.includes(currentNode.nodeId) ? 'disabled' : ''}>记录节点完成</button>
          </div>
        </section>
      </section>`;
  }

  async function loadManifest(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function mount(hostId, options = {}) {
    const host = typeof hostId === 'string' ? document.getElementById(hostId) : hostId;
    if (!host) return null;
    try {
      const manifest = options.manifest || await loadManifest(options.manifestUrl || '../../data/maps-manifest.json');
      const query = new URLSearchParams(window.location.search);
      const returned = sessionApi.decodeReturnContext(query.get('returnContext'));
      const saved = sessionApi.loadSession();
      let state = returned?.mapId === FOREST_MAP_ID
        ? restoreState(manifest, returned)
        : createState(manifest, saved?.mapId === FOREST_MAP_ID ? saved : {});
      persistState(state);

      const repaint = () => render(host, manifest, state);
      host.addEventListener('click', event => {
        const nodeButton = event.target.closest('[data-forest-node-id]');
        if (nodeButton) {
          state = selectNode(manifest, state, nodeButton.dataset.forestNodeId);
          persistState(state);
          repaint();
          return;
        }
        const action = event.target.closest('[data-forest-action]')?.dataset.forestAction;
        if (action === 'complete') {
          state = completeNode(manifest, state);
          persistState(state);
          repaint();
          return;
        }
        if (action === 'launch') {
          const launch = buildActivityLaunch(manifest, state, {
            baseUrl: window.location.href,
            activityBaseUrl: '../word-memory-map/?vocab=all'
          });
          window.location.assign(launch.url);
        }
      });
      repaint();
      return state;
    } catch (error) {
      host.innerHTML = `<section class="forest-route-error"><strong>森林路线暂时无法打开</strong><span>${escapeHtml(error.message || error)}</span></section>`;
      throw error;
    }
  }

  return {
    FOREST_MAP_ID,
    createState,
    visibleNodes,
    selectNode,
    completeNode,
    buildActivityLaunch,
    restoreState,
    nodeCopy,
    render,
    mount
  };
}));
