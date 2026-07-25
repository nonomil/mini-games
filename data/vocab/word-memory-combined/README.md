# 单词记忆射击场合并词库

这是当前 `prj/单词记忆射击场原型` 使用的合并英文抽题池。

## 来源

- 官方 Minecraft 主题词库：`data/vocab/english-minecraft/views/all.json`
- 外部复制源：`data/vocab/external/mario-minecraft-words-0315/vocabs`

外部源来自：

```text
G:\UserCode\Mario_Minecraft\单词库\words-0315\vocabs
```

## 生成

```text
node scripts/build_word_memory_combined_vocab.cjs
node prj/单词记忆射击场原型/scripts/build_word_memory_cards_from_minecraft.cjs
```

合并规则：

- 只合入外部 manifest 中 `mode: "english"` 的 pack。
- 以英文 `word` 小写去重。
- 官方 Minecraft 96 词优先保留，外部词只补充缺失词。
- 汉字、拼音、幼小衔接双语 pack 先保留在原始复制目录，不直接进入英文射击场。

## 图片和语音

- 单词不要求每条都有专属图片。
- 官方词有图时继续使用原图或缓存图。
- 外部词默认使用当前游戏的本地生成 PNG 兜底，避免批量抓远程图。
- 已生成的本地 mp3 会优先播放；未生成的词走浏览器 `speechSynthesis`。
