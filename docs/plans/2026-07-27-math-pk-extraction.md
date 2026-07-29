# 数学 PK 独立提取与乘法启程改造实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 将宠物积分系统中的数学 PK 玩法整理为可独立运行的小游戏入口，并把乘法“几组几个”练习与机器人 PK 作为清晰的首选流程。

**架构：** 继续复用已提取的 MathPKGame 规则、资源和结算逻辑，在入口层补齐独立宿主适配、小游戏自己的存储命名空间和可访问的壳层。乘法模式通过独立入口默认进入 `medium_mul`，由现有练习场引导到 PK，不复制第二份题目与结算逻辑。

**技术栈：** 原生 HTML/CSS/JavaScript、Node 静态服务、Node 契约测试、Playwright 浏览器验证。

---

### 任务 1：建立独立入口契约

**文件：**
- 创建：`tests/test-math-pk-standalone.mjs`
- 创建：`docs/plans/2026-07-27-math-pk-extraction.md`

**步骤 1：编写失败的测试**

检查数学 PK 入口、独立启动脚本和共享玩法源码必须满足：

- 入口加载本地宿主、桥接、排行榜和 MathPKGame，不依赖宠物积分总站页面路由。
- 独立启动脚本默认将难度设为 `medium_mul`，并能恢复用户之前选择的难度。
- 数学 PK 使用 `minigames_math_*` 命名空间，不继续写入 `petbank_math_*`。
- 乘法难度保留练习场与 PK 两个按钮，且保留 `medium_mul` 真实 ID。
- 入口使用的机器人图片和 CMATH 题库文件存在。

**步骤 2：运行测试以验证它失败**

运行：`node tests/test-math-pk-standalone.mjs`

预期：由于入口还没有独立启动脚本、仍使用旧存储键，测试失败。

**步骤 3：提交**

```bash
git add tests/test-math-pk-standalone.mjs docs/plans/2026-07-27-math-pk-extraction.md
git commit -m "test: define standalone math pk contract"
```

### 任务 2：改造独立启动与存储契约

**文件：**
- 创建：`games/math-pk/game.js`
- 修改：`games/math-pk/index.html`
- 修改：`vendor/js/math-pk.js`

**步骤 1：编写最小实施**

- 将页面内联启动逻辑移到 `games/math-pk/game.js`。
- 启动时恢复 `minigames_math_difficulty`，无记录时默认为 `medium_mul`，并暴露返回游戏库的动作。
- 将数学 PK 的难度、最高分、支援进度、支援解锁和支援选择键切换到 `minigames_math_*`。
- 保留旧 API 别名兼容，但不让独立项目继续产生 `petbank_math_*` 新数据。

**步骤 2：运行测试以验证它通过**

运行：`node tests/test-math-pk-standalone.mjs`

预期：契约测试通过。

### 任务 3：整理乘法聚焦壳层和文档

**文件：**
- 创建：`games/math-pk/styles.css`
- 修改：`games/math-pk/index.html`
- 修改：`README.md`
- 修改：`docs/参考项目/乘法游戏设计.md`

**步骤 1：编写最小实施**

- 为独立页面加入标题、返回入口、当前玩法状态和窄屏布局。
- 让页面文案明确“先看懂几组几个，再挑战机器人”，但不复制玩法逻辑。
- 将实际实现规则、交互流程、存储和验证方式写入参考文档，替代当前空文件。

**步骤 2：运行静态检查**

运行：`node tests/test-math-pk-standalone.mjs`

预期：通过，且文档不再为空。

### 任务 4：浏览器与回归验证

**文件：**
- 检查：`games/math-pk/index.html`
- 检查：`games/math-pk/game.js`
- 检查：`vendor/js/math-pk.js`

**步骤 1：启动本地服务**

运行：`$env:PORT='7013'; npm run serve`

预期：服务监听 `http://127.0.0.1:7013/`。

**步骤 2：验证桌面和移动端**

打开 `games/math-pk/`，检查首屏、难度按钮、乘法练习场、数字键盘、返回入口和窄屏无横向滚动；控制台无资源 404 或未捕获异常。

**步骤 3：运行项目回归**

运行：`npm test`

预期：既有契约测试与新增数学 PK 契约测试全部通过。
