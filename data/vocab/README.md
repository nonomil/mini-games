# 游戏词库目录

`data/vocab/` 存放给小游戏直接引用的题库副本。

它和 `data/learn/` 的职责不同：

- `data/learn/` 是学习中心正式资料包，服务课程、计划、进度和学习页面。
- `data/vocab/` 是游戏题库层，服务打字、记忆、配对、射击、地图收集等玩法。
- 小游戏默认引用 `data/vocab/`，不要直接读取 `data/learn/packs/**/modules/*.json`。

## 目录约定

```text
data/vocab/
  README.md
  english-minecraft/
    README.md
    manifest.json
    views/
      all.json
      starter.json
      core.json
      typing-view.json
      memory-view.json
  external/
    mario-minecraft-words-0315/
      vocabs/
  word-memory-combined/
    manifest.json
    views/
      all.json
```

## 引用方式

网页原型通常不要在浏览器里直接跨目录读取根词库，而是通过构建脚本转换成自己的运行时格式。

例如单词记忆射击场：

```text
data/vocab/word-memory-combined/views/all.json
        ↓
prj/单词记忆射击场原型/scripts/build_word_memory_cards_from_minecraft.cjs
        ↓
prj/单词记忆射击场原型/assets/word-memory-cards.json
```

这样小游戏可以保留自己的图片、语音、关卡和 UI 字段，同时词源仍可追溯。

## 词卡格式

根词库视图沿用学习中心 vocab-view 格式，核心字段如下：

```json
{
  "id": "word-memory-combined-all",
  "type": "vocab-view",
  "sourceModuleId": "word-memory-combined",
  "viewId": "all",
  "cards": [
    {
      "id": "mc-word-creeper",
      "word": "creeper",
      "translation": "苦力怕",
      "level": "ket-1",
      "difficulty": 2,
      "tags": ["minecraft", "mob"],
      "image": "assets/learn/english-vocab/world.webp",
      "audio": "assets/learn/english-vocab/audio/creeper.mp3",
      "viewCategory": "mob"
    }
  ]
}
```

小游戏适配层可以增加自己的运行时字段，但不要反向写回根词库。

## 对齐流程

正式 Minecraft 词库或外部 `vocabs` 源更新后，按这个顺序对齐：

```text
node scripts/build_minecraft_vocab_views.cjs
node scripts/sync_vocab_registry.cjs
node scripts/build_word_memory_combined_vocab.cjs
node prj/单词记忆射击场原型/scripts/build_word_memory_cards_from_minecraft.cjs
python prj/单词记忆射击场原型/generate_voice_assets.py
node prj/单词记忆射击场原型/verify.mjs
```

原则：

- 正式学习包先更新。
- 外部复制源保留在 `data/vocab/external/`，合并包由脚本生成。
- 根词库只做同步副本，不手动散改。
- 小游戏运行数据由各自适配脚本生成。
- 若小游戏需要新增字段，写在自己的 `assets/generated` 或运行时 JSON 里。

## 核心英语词库

`core-english/` 是从现有分级词库筛选出的可审查核心英语学习路径，不替代 `单词库_分级/` 的素材总库：

- `core-english.db`：发布的 SQLite 词库，保留词、中文、音标、主题、来源与主图状态。
- `views/core.json`：浏览器/小游戏使用的运行时词卡视图。
- `prj/单词记忆射击场原型/assets/word-memory-core-cards.json`：射击场专用适配数据；默认加载核心词库，添加 `?vocab=all` 可打开旧全量合并词库。

`extension-english/` 是第二组小学拓展词包，和核心包使用相同的 SQLite/view 结构。射击场使用 `?vocab=extension` 加载它。

更新链路：

```text
prj/vocab-governance/reports/core-800-candidates.json
  -> python scripts/build_core_english_vocab.py
  -> node prj/单词记忆射击场原型/scripts/build_word_memory_core_cards.cjs
```
