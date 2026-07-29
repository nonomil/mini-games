# 跨游戏宿主协议 v1 草案

本文档记录 CORE-P0-01 的现状盘点，冻结 CORE-P0-02 的最小清单/卡片命名，并记录 P0-03/P0-04 已验证的最小运行时行为。它只冻结现有兼容层和 v1 envelope，不扩大旧入口的业务协议。

## 1. 目标包络

统一消息使用以下字段：

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `type` | string | `ready`、`init`、`card-result`、`complete`、`stop`、`error` 之一 |
| `protocolVersion` | number | 固定为 `1` |
| `sessionId` | string | 宿主会话 ID；同一恢复会话保持不变 |
| `gameId` | string | 来自 manifest 的稳定逻辑游戏 ID，不使用页面标题或随机值 |
| `cardId` | string/null | 卡片原始不透明 ID；卡片无关消息使用 `null`，不得由游戏随机生成 |
| `payload` | object | 类型专属数据；未知字段忽略 |

`ready` 可以在等待初始化时发送 `cardId: null`。`init` 和 `card-result` 必须携带非空 `cardId`。`complete`、`stop`、`error` 不得伪造卡片 ID。

最小消息示例：

```json
{
  "type": "init",
  "protocolVersion": 1,
  "sessionId": "session-001",
  "gameId": "word-shooter",
  "cardId": "core-english-1-attack",
  "payload": {
    "card": {
      "cardId": "core-english-1-attack",
      "word": "attack",
      "translation": "攻击",
      "image": null,
      "audio": null,
      "example": "The superhero will attack the villain.",
      "domain": "english",
      "contentType": "word"
    }
  }
}
```

## 2. 卡片标准化

标准字段固定为 `cardId/word/translation/image/audio/example/domain/contentType`。

| 标准字段 | 必填 | 兼容来源 | 缺失处理 |
| --- | --- | --- | --- |
| `cardId` | 是 | 优先原始 `cardId`，其次明确的原始 `id` | 缺失时拒绝卡片输入；不得用随机数或页面序号代替 |
| `word` | 否 | `word`；拼音/汉字题可映射 `char` | `null` |
| `translation` | 否 | `translation`；旧英文数据的 `chinese` | `null` |
| `image` | 否 | `image` | `null` |
| `audio` | 否 | `audio` | `null` |
| `example` | 否 | `example`；运行时已整理的示例句 | `null` |
| `domain` | 否 | manifest 的游戏默认 domain，显式卡片值优先 | `null` |
| `contentType` | 否 | manifest 的游戏默认题型 | `null` |

字段规则：未知字段忽略；可选字段缺失统一写 `null`；原始 `cardId` 必须原样保留；标准化不得改变卡片所属 domain。当前旧词卡中的 `id` 只能作为兼容来源，完成 P0-03 前不宣称已经端到端传递。

## 3. 现状兼容字段表

| 来源 | 当前入口/消息 | 已有字段 | 可映射字段 | 主要缺口 |
| --- | --- | --- | --- | --- |
| `bridge.js` | `petbank.bridge.v1.completed` | `type/version/projectId/launchId/profileRef/activityId/completionId/score/stars/occurredAt` | `type=complete`、`gameId=activityId`、`sessionId=launchId`、`cardId=null` | 只有完成级结果，没有统一 `protocolVersion/gameId/cardId`，依赖 `window.opener` 和 referrer origin |
| `bridge.js` | `petbank.bridge.v1.reward-result` | `type/version/projectId/launchId/profileRef` 加宿主奖励字段 | `type` 不直接对应游戏生命周期 | 仅旧奖励回传，不含标准卡片或停止状态 |
| `typing-defense` | `source=petbank-typing-defense`, `kind=result` | `version/sessionId/seq/timestamp/payload`；payload 有 `won/score/hits/misses/hp/combo/bestCombo/roundIndex/roundGoal/mode/vocabId/earnedStars` | `sessionId`、`gameId=typing-defense`、`complete` | 入口未加载共享 bridge；结果无 `cardId`，仅局级汇总 |
| `learning-arcade` | `source=petbank-learning-arcade`, `kind=start/result/settings` | `sessionId/seq/payload`；result 有 `gameId/gameLabel/title/copy/stats/settings/activeGame` | `sessionId`、逻辑 `gameId=word-shooter` 或 `pinyin-racer`、`complete` | `activeGame` 才区分飞机大战与拼音赛车；当前词卡标准化丢弃部分原始 ID，结果无 `cardId` |
| `word-memory-map` | `source=petbank-word-memory-map`, `kind=result` | `sessionId/seq/payload`；payload 有 `score/earnedStars/accuracy/levelOrder/levelTitle/highestUnlockedLevel/heroId/worldPack/reward` | `sessionId`、`gameId=word-memory-map`、`complete` | 已有卡片 `id`，但结果仍是局级汇总；入口未加载共享 bridge |
| `pinyin-star-scout` | `petbank.bridge.v1.completed` | `version/projectId/launchId/profileRef/activityId/completionId/score/stars/occurredAt` | `gameId=pinyin-star-scout`、`sessionId=launchId`、`complete` | 这是独立拼音巡航入口，不是 `pinyin-racer` 逻辑游戏；没有 `cardId` |

## 4. shim 与入口盘点

`host/petbank-host-shim.js` 当前提供兼容运行环境：

- `MINIGAMES_COMPLETE_CONTENT=true`，以及独立模式的完整内容开关。
- `localStorage` 代理，项目键保留 `minigames_*`，外部键映射到 `minigames_ported_*`。
- `ProfileManager` 本地 profile、`PetBankPoints` 本地积分、`GameRewardReceipts` 去重收据和 `CoreRewardService`。
- `Leaderboard`、`PetSystem`、`InventorySystem`、`BattleEngine` 以及 `MiniGamesHost.ready` 兼容桩。
- shim 本身没有 `message` 监听器，也没有 `ready/init/card-result/complete/stop/error` 状态机。

当前显式加载 shim/bridge 的入口包括 `games/hanzi/`、`games/math-pk/`、`games/forest-map/`、`games/explore-map/`。`games/typing-defense/web/`、`games/learning-arcade/`、`games/word-memory-map/` 使用各自旧式 `postMessage`；`games/pinyin-star-scout/` 自己发送旧 `petbank.bridge.v1.completed`。

## 5. P0-03 最小运行时行为

`bridge.js` 现提供以下标准 API，均返回 boolean；发送前会校验 session/game 身份和目标 origin：

| API | 行为 |
| --- | --- |
| `MiniGamesBridge.ready({ sessionId, gameId })` | 发送一次 `ready`，使用 `cardId: null` |
| `MiniGamesBridge.reportCardResult({ cardId, payload })` | 发送一次 `card-result`；同一 `sessionId + cardId` 第二次返回 `false` |
| `MiniGamesBridge.error({ code, message, payload })` | 发送标准 `error`，使用 `cardId: null` |
| `MiniGamesBridge.complete({ payload })` | 每个 session 只发送一次 `complete`，使用 `cardId: null` |
| `MiniGamesBridge.stop()` | 发送一次 `stop`，执行 bridge 和 shim cleanup；之后拒绝 result/complete/legacy completion |
| `MiniGamesBridge.armTimeout(milliseconds, input)` | 同一 bridge 只保留一个活动 timeout；到期发送 `error`，payload `code=timeout`，并进入终态 |
| `MiniGamesBridge.registerCleanup(fn)` | 注册计时器、事件、动画或语音的释放函数，stop 时执行一次 |

宿主 shim 同时提供 `MiniGamesHost.registerCleanup(fn)` 和 `MiniGamesHost.cleanup()`，供游戏注册自身资源；bridge stop 会调用 shim cleanup。协议消息仍必须由宿主侧传入 `init`，并校验 `protocolVersion/sessionId/gameId/cardId` 和 origin 后才接受。

错误消息的 `payload` 至少包含 `code` 和 `message`；调用方额外提供的 payload 字段保留，显式 `code/message` 优先。旧 `petbank.bridge.v1.completed/reward-result` 和 `source/kind/payload` 读取路径保持原样，新增协议不替换旧路径；`tests/contract-lifecycle.mjs` 覆盖新旧路径、重复结果、stop 清理和安全拒绝。

## 6. P0-04 安全、恢复和清理

- **恢复**：bridge 将 v1 状态写入当前浏览上下文的 `sessionStorage` 私有键 `minigames_protocol_v1`。刷新后恢复同一 `sessionId`、`gameId`、当前 `cardId`、已提交结果键、complete、stop 和 timeout 终态；URL 明确提供的 session/game 身份与存储不一致时不使用旧存储状态。
- **身份矩阵**：协议入站消息必须来自 referrer origin（无 referrer 时回退当前 origin），且 `event.source` 必须是当前 `window.parent` 或 `window.opener`。`protocolVersion`、`sessionId`、`gameId` 必须匹配当前 bridge，且字段类型符合本文件表定义；`init`/`card-result` 必须有非空字符串 `cardId`，且 `init.payload.card.cardId` 必须与 envelope 一致。任一 origin、source、session、game 或 card 不匹配都拒绝。
- **卡片生命周期**：只有最近一次被宿主接受的 `init` card 可以提交 `card-result`；未初始化、未知或已被下一张卡替换的 card 返回 `false`。替换当前 card 时，旧 card 进入过期集合，不会因刷新恢复后再次提交。
- **停止和超时**：`stop()` 只处理一次，发送 stop 后移除 message listener，清理 bridge/shim 注册的 cleanup 和活动 timeout；停止后拒绝 result、complete、error 和旧 bridge completion。`armTimeout()` 到期发送一次 `error`（`payload.code=timeout`），标记 timeout 终态；timeout 后拒绝 result 和 complete，重复设置活动 timeout 被拒绝。
- **完成幂等**：同一恢复 session 只接受一次 `complete`；普通重复 complete、刷新后重复 complete、stop/timeout 后 complete 均返回 `false`。

## 7. 兼容原则与后续边界

1. 保留 `petbank.bridge.v1.*` 读取/发送能力，新增协议不得让独立入口依赖卡片系统源码。
2. manifest 的 `gameId` 是逻辑游戏 ID；共享入口通过 `runtime.hostId/runtime.mode` 表达内部模式，避免把 `learning-arcade` 与其子玩法混为一个卡片活动。
3. P0-03/P0-04 只实现并验证最小生命周期、安全、恢复和清理行为；游戏业务仍负责具体玩法和卡片内容。
4. CORE-P0-05 才补充可复制的初始化/结果 fixture 和交接说明；本文件不提前冻结未验证的业务字段。

## 8. P0-05 可复制 fixture 与交接

可执行 fixture 的唯一来源是 [`tests/fixtures/contract-v1-fixture.mjs`](../tests/fixtures/contract-v1-fixture.mjs)，生命周期契约会导入它并逐字段比较 bridge 实际发出的消息。其他线程接线时应复制下面的值，并只替换自己的稳定 `sessionId`、`gameId` 和原始 `cardId`；三个身份值必须保持字符串。

### 8.1 v1 消息 fixture

下面的 `ready`、`card-result`、`complete`、`stop`、`error` 是游戏调用 bridge 后发出的 envelope；`init` 是宿主发给游戏的 envelope。所有消息都使用固定 `protocolVersion: 1`，卡片无关消息使用 `cardId: null`。

```json
{
  "ready": {
    "type": "ready",
    "protocolVersion": 1,
    "sessionId": "fixture-session-001",
    "gameId": "word-shooter",
    "cardId": null,
    "payload": {}
  },
  "init": {
    "type": "init",
    "protocolVersion": 1,
    "sessionId": "fixture-session-001",
    "gameId": "word-shooter",
    "cardId": "fixture-card-attack",
    "payload": {
      "card": {
        "cardId": "fixture-card-attack",
        "word": "attack",
        "translation": "攻击",
        "image": null,
        "audio": null,
        "example": "The superhero will attack the villain.",
        "domain": "english",
        "contentType": "word"
      }
    }
  },
  "card-result": {
    "type": "card-result",
    "protocolVersion": 1,
    "sessionId": "fixture-session-001",
    "gameId": "word-shooter",
    "cardId": "fixture-card-attack",
    "payload": { "correct": true }
  },
  "complete": {
    "type": "complete",
    "protocolVersion": 1,
    "sessionId": "fixture-session-001",
    "gameId": "word-shooter",
    "cardId": null,
    "payload": { "score": 10, "stars": 1 }
  },
  "stop": {
    "type": "stop",
    "protocolVersion": 1,
    "sessionId": "fixture-session-001",
    "gameId": "word-shooter",
    "cardId": null,
    "payload": {}
  },
  "error": {
    "type": "error",
    "protocolVersion": 1,
    "sessionId": "fixture-session-001",
    "gameId": "word-shooter",
    "cardId": null,
    "payload": {
      "code": "wrong-answer",
      "message": "answer is incorrect",
      "attempt": 1
    }
  }
}
```

### 8.2 游戏与宿主调用顺序

```js
// 游戏启动后发送 ready；sessionId/gameId 来自宿主启动上下文。
MiniGamesBridge.ready({
  sessionId: 'fixture-session-001',
  gameId: 'word-shooter'
});

// 宿主向当前游戏窗口发送上面的 init，targetOrigin 必须是明确的游戏 origin。
gameWindow.postMessage(initMessage, gameOrigin);

MiniGamesBridge.reportCardResult({
  cardId: 'fixture-card-attack',
  payload: { correct: true }
});

MiniGamesBridge.error({
  code: 'wrong-answer',
  message: 'answer is incorrect',
  payload: { attempt: 1 }
});

// 一次 session 只调用一次；complete 和 stop 是两个终态分支。
MiniGamesBridge.complete({ payload: { score: 10, stars: 1 } });
// 或：MiniGamesBridge.stop();
```

### 8.3 恢复、幂等、timeout 和 stop cleanup

bridge 使用当前浏览上下文的私有 `sessionStorage` 键 `minigames_protocol_v1` 保存恢复状态。卡片结果后，fixture 预期的私有状态如下；这段 JSON 不作为协议消息发送：

```json
{
  "version": 1,
  "phase": "result",
  "sessionId": "fixture-session-001",
  "gameId": "word-shooter",
  "cardId": "fixture-card-attack",
  "resultKeys": ["fixture-session-001:fixture-card-attack"],
  "expiredCardIds": [],
  "completed": false,
  "stopped": false,
  "timedOut": false
}
```

刷新同一浏览上下文后必须继续使用相同 `sessionId/gameId/cardId`；重复调用同一 card 的 `reportCardResult`、刷新后重复提交、重复 `complete` 都返回 `false`。timeout 和清理的最小接线如下：

```js
MiniGamesBridge.registerCleanup(() => cancelAnimationFrame(animationFrameId));
MiniGamesBridge.registerCleanup(() => audio.pause());
MiniGamesBridge.armTimeout(1000, { message: 'fixture session timeout' });

// 到期发送 error(payload.code = "timeout")，之后拒绝 card-result/complete。
// 宿主停止或游戏退出时调用一次；它会清理 timer、message listener 和已注册 cleanup。
MiniGamesBridge.stop();
```

同一 bridge 只能存在一个活动 timeout；`stop()` 后不得重新提交结果、完成或 error。宿主 shim 的资源可通过 `MiniGamesHost.registerCleanup(fn)` 注册，bridge stop 会调用 `MiniGamesHost.cleanup()`。

### 8.4 legacy 兼容 fixture

旧入口仍可发送原有 completed 消息，bridge 继续按旧字段转发；不要把它改写成新的 envelope：

```json
{
  "type": "petbank.bridge.v1.completed",
  "version": 1,
  "projectId": "mini-games",
  "launchId": "fixture-launch-001",
  "profileRef": "fixture-profile-001",
  "activityId": "typing-defense",
  "completionId": "fixture-completion-001",
  "score": 8,
  "stars": 2,
  "occurredAt": "2026-07-27T00:00:00.000Z"
}
```

旧式游戏结果仍使用各自的 `source/kind/payload`，例如：

```json
{
  "source": "petbank-typing-defense",
  "kind": "result",
  "version": 1,
  "sessionId": "fixture-session-001",
  "seq": 1,
  "payload": { "won": true, "score": 8, "earnedStars": 2 }
}
```

完整 legacy completed、source result 和 reward-result 对象保存在 fixture 的 `legacy` 节点；现有 `petbank.bridge.v1.*` 转发和重复抑制由 `tests/contract-lifecycle.mjs` 回归验证。
