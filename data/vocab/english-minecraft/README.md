# Minecraft 英语小游戏词库

这是 Minecraft 英语主题给小游戏使用的官方主题词库包。当前单词记忆射击场会先通过 `data/vocab/word-memory-combined` 合并更多外部 English packs，再生成自己的运行时卡片。

上游正式资料包：

- `data/learn/packs/english-mc-hybrid-2026/modules/minecraft-vocab.json`
- `data/learn/packs/english-mc-hybrid-2026/modules/minecraft-vocab-starter.json`
- `data/learn/packs/english-mc-hybrid-2026/modules/minecraft-vocab-core.json`
- `data/learn/packs/english-mc-hybrid-2026/modules/minecraft-vocab-typing-view.json`
- `data/learn/packs/english-mc-hybrid-2026/modules/minecraft-vocab-memory-view.json`

当前游戏词库副本：

- `views/all.json`
- `views/starter.json`
- `views/core.json`
- `views/typing-view.json`
- `views/memory-view.json`

## 各视图用途

- `all.json`：96 个 Minecraft 全量词，适合作为合并包的官方主题底座。
- `starter.json`：24 个起步词，适合第一次接触、卡片热身、低龄入口。
- `core.json`：72 个核心词，适合主题复习、图鉴、综合题库。
- `typing-view.json`：92 个短词，适合键盘输入、单词射击、拼写训练。
- `memory-view.json`：24 个精选词，适合看图认义、地图找词、记忆配对。

## 给小游戏引用

小游戏不要直接改这些视图文件。推荐做一层适配：

```text
views/all.json 或 views/memory-view.json
  -> 玩法适配脚本
  -> prj/某小游戏/assets/*.json
```

适配脚本负责：

- 把 `word / translation / image / audio / viewCategory` 转成游戏需要的字段。
- 补游戏自己的图片、音效、关卡、奖励字段。
- 在输出里保留 `sourceCardId / sourceProvider / sourceImage` 之类追溯字段。

## 同步方式

从正式学习包刷新本目录：

```text
node scripts/sync_vocab_registry.cjs
```

刷新前通常先更新正式视图：

```text
node scripts/build_minecraft_vocab_views.cjs
```

刷新后跑对应小游戏验证，确认字段、图片、语音仍然能对上。
