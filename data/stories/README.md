# 探索故事文本（数据驱动）

> 每个场景一个 JSON，含事件序列 narrate/discover/math/choice/encounter。
> exploration-detail.js 启动时并发加载本目录 12 个文件，并把完整场景对象放入 `storyData`。
> `data/stories/*.json` 是唯一正式来源；fetch 失败时页面显示明确的本地服务器提示，不使用硬编码故事兜底。

事件可选短句字段：

```json
{
  "type": "narrate",
  "text": "完整故事文本，保留给详情和兼容路径",
  "shortText": "默认先显示的一句短话",
  "detailText": "点击“想知道更多”后展开的详情",
  "petMood": "happy"
}
```

`shortText` 建议不超过 24 个汉字；`petMood` 使用 `happy`、`surprised`、`worried`、`proud` 之一。旧事件缺少这些字段时，运行时回退到 `text` 和 `happy`；当前 12 个正式场景均已补齐。

## 文件结构

每个 {scene}.json:
```json
{
  "id": "forest",
  "name": "神秘森林",
  "chapter": 1, "chapter_name": "起点花园",
  "events": [
    { "id": "forest.narrate0", "type": "narrate", "text": "..." },
    { "id": "forest.discover1", "type": "discover", ... },
    { "id": "forest.math2", "type": "math", "mathType": "arithmetic", "difficulty": "easy", ... },
    { "id": "forest.choice3", "type": "choice", "options": [...] },
    { "id": "forest.encounter4", "type": "encounter", ... }
  ]
}
```

## 文本-语音同步（已实现）

VoiceSystem (js/voice.js) 的 AUTOPLAY_RULES 监听 #galgameText：
galgame 对话框文字变化 -> 自动 speak(text) -> 查 assets/voice/map.json（文本 md5 -> mp3）命中则播预生成，否则降级 VoxCPM2 服务 / Web Speech。

新增/修改文本后，用 voxCPM2 生成对应 mp3 并登记 map.json（文本 -> md5 文件名），即可自动播报。

## 章节（03 章节结构）

1 起点花园(forest) / 2 森林边界(beach,candy) / 3 海边集市(waterfall,underwater,desert) / 4 高地洞窟(mountain,cave,castle,volcano) / 5 星空终点(space,stargarden)

## 5 章教育目标（R3，每场景顶层 chapter_skill 字段）

| 章 | 章名 | chapter_skill | 教育目标 | 题型 |
|----|------|--------------|---------|------|
| 1 | 起点花园 | `number_sense` | 数感/数量关系 | arithmetic（20 内加减）|
| 2 | 森林边界 | `add_sub_apply` | 加减应用 | word（加减应用题）|
| 3 | 海边集市 | `life_apply` | 生活情境应用 | word（买卖/分配/剩余）|
| 4 | 高地洞窟 | `mul_div_mech` | 乘除与机关 | arithmetic（乘除）+ 场景机关 |
| 5 | 星空终点 | `pattern_logic` | 规律/逻辑 | logic（找规律/斐波那契）|

每场景 math 事件含**固定场景题**（question/answer/options，题面=场景具象计数/分配），`genMathQuestion` 优先用 event.question；无则回退随机（arithmetic/word-CMATH/logic）。事件 id 不改（配音映射稳定）。

## 审查

可用 codex 审查本目录 + docs/叙事重构/，评估文案/节奏/教育性/儿童适配。
