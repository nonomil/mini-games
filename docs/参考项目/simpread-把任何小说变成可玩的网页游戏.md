> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [mp.weixin.qq.com](https://mp.weixin.qq.com/s/fHCw9Lf6-EQ_0POj0I2p9A)

**NovelToGame** 是一套开源技能流水线，能把任意小说自动改编成可直接游玩的网页游戏。

它通过 "需求→分析→概念→世界设计→美术→构建→验证" 共七个环节，提取原著中的世界观、角色和名场面，生成完整的游戏原型，适配 Claude Code、Codex 和 Kimi Code 三种编程智能体，并提供了《西游记》和《金瓶梅》两个完整示例。

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/eBFVwibDZ0E5qHDerGoaAOaDxhxWY2sI9Cy3WEiaEnvAreWrogcoicKb5mvSAkFsKogPH3GTdh22HaicRg7nRoPMP0Cs9miaLD5Gx52UnkOXle6c/640?wx_fmt=other&from=appmsg#imgIndex=0)

### 七步工作流

整个流程通过一个总控入口串联起六个环节，走完 "需求→分析→概念→世界设计→美术→构建→验证" 七个步骤，把原始文本打磨成可玩的游戏。

第一步**需求**是总入口。先跟用户明确产品框架——平台、游戏类型、对标名作、美术画风、内容分级、核心幻想等，全部锁定在 `PRODUCT_BRIEF.md` 里，下游环节必须严格遵守，不得静默改写。

第二步**分析**，从小说中提取规则、动作、空间、角色和名场面，梳理成游戏设定集 `SOURCE_BIBLE.md`。

第三步**概念**，生成三个真正不同的改编方向，经过淘汰后选定一个方案，写入 `CONCEPT.md`。

第四步**世界设计**，设计玩家体验、具有回应性的世界、游戏系统和关卡，产出 `GAME_DESIGN.md`。

第五步**美术**，定义核心视觉原则、界面、反馈和世界的视觉语言，产出 `ART_DIRECTION.md`。

第六步**构建**，编写范围明确的构建说明 `BUILD_BRIEF.md`，交给编码智能体完成一次可验证的游戏构建。

第七步**验证**，测试游戏的启动、画面、交互、状态切换以及通关与重开。如果测试没通过，会自动退回 "构建" 环节重新打磨。

### 两种运行模式

*   默认的 **quick 模式**自动挑选证据最强的方案快速出成果，比如用简单指令在 15 分钟内生成一个包含原创身份的完整网页游戏。
    
*   **director 模式**则允许用户在进入 "世界设计" 之前，从生成的三个概念方向中手动选一个。
    
*   每次运行后，系统生成一个结构紧凑的改编工作区（`game-adaptations/<project>/`），里面包含完整的需求、设定、美术文档，以及最终构建完成的 `build/app/` 游戏本体和 `QA_REPORT.md` 测试报告。
    

### 两个官方示例

一个是**《西游记》"三借芭蕉扇"** ，基于公版百回本原著提炼，改编成类似《梦幻西游》风格的回合制指令 RPG。视觉上采用 "木刻" 风格，战斗系统包含行动顺序、五行、技能、携宠、阵型、变化以及多阶段 Boss，做得相当扎实。（在线试玩：xiyouji.vibecoco.ai）

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/eBFVwibDZ0E66zeD7TPXW5nicAyuzDCUpQ0VQjUnPdU9ZG6pFmUTLp5eWsAEic09ibuN26mImfVvBmakeKmqmdGEntTlAWHpYmhq9KLYWB4mCyo/640?wx_fmt=other&from=appmsg#imgIndex=1)

另一个是**《金瓶梅》"风月总账"** ，基于公版崇祯本重制，改编成一款 18+ 的男性第一人称后宫关系模拟游戏。视觉上走 "绣像" 风格，玩家白天经营钱、势与秘密等资源，夜里推进吴月娘、潘金莲、李瓶儿三名女性角色的独立深线，包含 6 日日程、多种短线随机事件和 3 种结局收束。（在线试玩：jinpingmei.vibecoco.ai）

![](https://mmbiz.qpic.cn/mmbiz_jpg/eBFVwibDZ0E7NSiaJgtiam8Vwic7nlnPeuoOefhUKdeB7Ip2qFjeT5vibS32wWFqjCAjKcEbbdlO6QZG9lH8oTk43DwgpdLxywoxEiaD563pDnUQM/640?wx_fmt=other&from=appmsg#imgIndex=2)

### **安装与使用说明**

**安装**（任选一种方式）：

*   **Agent Skills 安装**（推荐）：`npx skills add worldwonderer/novel-to-game -g -y -a claude-code -s '*'`，将 `claude-code` 替换为 `codex` 或 `kimi-code-cli` 即可适配不同 CLI；同时安装三端可重复 `-a` 参数
    
*   **原生插件安装**：Claude Code 使用 `/plugin marketplace add worldwonderer/novel-to-game` 后 `/plugin install novel-to-game@novel-to-game-skills`；Codex 使用 `codex plugin marketplace add` 和 `codex plugin add`；Kimi Code（0.27+）使用 `/plugins install https://github.com/worldwonderer/novel-to-game`
    
*   克隆仓库后，三端可直接发现项目内的 7 个技能
    

**使用**：

*   Claude Code 中调用 `/novel-to-game`，Codex 中调用 `$novel-to-game`，Kimi Code 中调用 `/skill:novel-to-game`
    
*   追加 `quick` 或 `director` 参数选择运行模式
    

项目由 **worldwonderer (pitechen)** 与 **Claude** 共同开发，主采用 **MIT License** 协议，当前 **203 Stars**。

项目地址：worldwonderer/novel-to-game