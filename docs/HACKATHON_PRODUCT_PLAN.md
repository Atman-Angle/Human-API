# 一个问题被回答以后，谁负责维护它？

## Human Gateway｜知乎黑客松产品说明计划书

**版本：** v2.0  
**日期：** 2026 年 9 月 15 日  
**项目：** Human Gateway

---

## 01｜一个问题被回答以后，谁负责维护它？

一个知乎问题可能存在很多年。

这几年里，新回答会不断增加，评论会不断增加，现实世界也会不断变化：新事实出现，旧经验失效，不同人的经历互相冲突。搜索可以帮我们找到更多资料，ChatGPT 可以重新总结这些资料，知乎可以继续产生新的回答，但很少有一个主体持续维护：

- 目前已经知道什么；
- 哪些结论相对稳定；
- 哪些结论仍有争议；
- 哪些结论只在特定场景成立；
- 哪些证据只是观点，哪些来自第一手经历；
- 还缺少什么关键事实。

我们真正缺的，也许不是更多答案，而是一个持续维护问题的人。

Human Gateway 从这个问题出发：**让一个问题成为持续存在、持续被现实修正的知识实体。**

---

## 02｜我们缺的不是另一个 AI 回答

不同产品回答的是不同问题：

| 现有形态 | 它主要解决什么 |
|---|---|
| 搜索 | 信息在哪里？ |
| ChatGPT | 根据现有资料，可以怎样回答？ |
| 知乎传统问答 | 不同的人怎么看，以及他们经历过什么？ |
| **Human Gateway** | **这个问题当前知道什么、还缺什么，下一步最值得验证什么？** |

传统互联网通常是：

```text
Question → Answers
```

LLM 通常是：

```text
Question → Generated Answer
```

Human Gateway 希望形成另一条链路：

```text
Question
→ Knowledge State
→ Evidence Gap
→ Investigation / Human Mission
→ New Evidence
→ Claim Re-evaluation
→ Knowledge State Update
→ 下一轮未知
```

所以它不是“ChatGPT + 知乎”的简单叠加。知乎提供真实问题、公开讨论和真人网络；Agent 负责把这些输入组织为可追踪的知识状态，并在知识不足时提出下一步求证。产品终点不是一段更流畅的答案，而是一个能说明自身边界、会继续生长的问题。

---

## 03｜当 AI 开始承认“我还不知道”

信息不足时，传统 AI 往往仍然给出完整、确定的表述。Human Gateway 选择先暴露不确定性。

它会把一个问题拆成几类可理解的状态：

- **已知：** 当前有资料或证据支持的具体 Claim；
- **分歧：** 不同来源或经历彼此冲突的部分；
- **限制：** 结论只适用于特定人群、时间或场景；
- **未知：** 当前资料无法回答、但值得继续求证的部分；
- **Evidence Gap：** 一个具体、可验证、能影响判断的缺口。

“还不知道”不是失败，而是下一步行动的入口。Agent 不把任何未知都交给人，而是先判断它是否适合真人补充：能否由一次低成本经历回答？是否会影响某个具体 Claim？是否存在把个体经验误当总体统计的风险？

只有适合的缺口才会成为 **Mission**。

---

## 04｜Human Gateway：让一个问题持续生长

Human Gateway 的前台核心对象不是一次性帖子，也不是一次性 Investigation 报告，而是一个持续更新的 **Knowledge Object**：

```text
知乎问题 / 回答 / 讨论 / 真人经历
                ↓
        Agent 组织与边界判断
                ↓
   Claims｜Evidence｜分歧｜限制｜未知
                ↓
           Evidence Gap
                ↓
             Mission
                ↓
        真人 Observation / Evidence
                ↓
 Evidence Grade + Claim Attribution
                ↓
          Re-evaluation
                ↓
 Knowledge State + Impact Receipt
```

当前仓库中，`Investigation` 是承载知识演化的后端 Aggregate；`Knowledge Object` 是面向用户的读取投影。两者不是两套平行知识模型。

---

## 05｜一个问题如何真正生长

Golden Case 是：

> **AI Coding 实际改变了初级开发者哪些工作？**

### 第一步：从知乎已有讨论开始

系统先检索知乎和全网公开资料，保留来源、摘要、检索时间和实际来源模式。用户先看到人类讨论，再看到 Agent 对讨论的组织结果。

### 第二步：形成暂时的知识边界

例如，系统可以归纳出：AI Coding 可能帮助部分初级开发者完成机械性编码，但最终判断、代码审查和场景理解仍可能由人承担；同时，公开资料还不足以说明这种变化适用于所有初级开发者。

这里的重点不是生成一句结论，而是把结论拆成能够被支持、限制或反驳的 Claim。

### 第三步：找到真正缺少的事实

```text
我们知道一些人正在把部分编码工作交给 AI，
但还缺少持续使用 AI Coding 的学生、实习生或 0–3 年开发者，
对具体工作流和最终人工判断的第一手观察。
```

### 第四步：把缺口变成 Mission

Mission 不是泛泛的“欢迎回答”，而是针对缺口的参与邀请：

> 请描述一次真实项目经历：哪些任务交给了 AI？哪些任务仍由你完成最终判断？有没有可以核对的代码 Diff 或其他材料？

### 第五步：让用户用自己的话提交

当前 Prototype 使用受边界约束的对话式准备：先摘录用户原话，最多进行两轮有限追问，再让用户确认最终摘要。用户可以修改或取消；未确认的摘要不会进入 Evidence 处理。

### 第六步：把新经历归因回原问题

服务端负责判断 Evidence Grade、是否命中 Gap、影响哪一个 Claim，以及 Knowledge State 是否变化。结果不是“提交即采纳”，而是可能被接受、拒绝，或接受但不足以改变总体状态。

---

## 06｜为什么这件事特别适合发生在知乎

Human Gateway 并不试图替代知乎，也不另建一个独立问答社区。它利用知乎已经存在的三种基础设施：

### 1. 知乎已有内容是问题的起点

知乎问题、回答和讨论提供真实的语言、场景和分歧。Human Gateway 不把它们压缩成不可追溯的 AI 结论，而是保留原始来源，并在其上增加 Claims、Evidence Gap 和状态解释。

### 2. 知乎用户网络让“谁可能知道”成为可能

复杂现实问题往往缺的不是观点，而是某类人的经历。知乎本身拥有跨职业、跨年龄、跨地域的真人网络。当前项目已接入 OAuth 身份识别和部分用户资料读取；基于用户行为的自动匹配仍属于未来能力，不在当前 Prototype 中宣称已经完成。

### 3. 知乎社区适合承载持续讨论

人类讨论是知识演化的原始输入。Agent 不替用户发言，也不把热度或多数意见直接等同于事实。它做的是把讨论组织起来、标出边界，并邀请社区补足最有价值的缺口。

这是一种与知乎互补的角色：**知乎让问题被提出、被讨论；Human Gateway 让问题的知识状态被持续维护。**

---

## 07｜从“邀请回答”到“邀请补一块证据”

普通邀请回答通常是开放的：“你怎么看？”它容易带来更多观点，却不一定解决当前问题最关键的缺口。

Mission 是结构化的、有限范围的邀请：

| 普通回答邀请 | Human Gateway Mission |
|---|---|
| 关注表达和观点 | 关注具体 Evidence Gap |
| “你怎么看？” | “请描述一次符合条件的真实经历” |
| 结果成为内容流中的一条内容 | 结果归因到 Mission → Gap → Claim |
| 很难知道是否改变了结论 | 返回状态变化或不变化的原因 |
| 容易把个体经验泛化 | 明确适用范围和仍然缺失的内容 |

Mission 的设计原则是让真人在约 30–60 秒内完成一次低负担贡献，同时允许“不记得”或“不方便说”。它不是任务市场，也不是积分系统，而是知识边界上的一次精准求证。

---

## 08｜用户看到的是一个正在生长的问题

用户不需要先理解内部术语。页面优先用自然语言回答四件事：

1. 大家目前比较知道什么？
2. 哪里仍然存在分歧或限制？
3. 当前最缺的事实是什么？
4. 我能怎样参与，并可能改变什么？

对应的用户体验是：

```text
Circle / 发现
→ Knowledge Object 详情
→ 公开讨论与 Agent 组织
→ 已知｜分歧｜未知
→ Mission 邀请
→ 对话式 Observation 提交
→ 用户确认
→ Evidence 结果与 Impact Receipt
→ 回到更新后的 Knowledge Object
```

当前前端已提供发现页、知识对象/Investigation 详情、Mission 交互、影响回执和个人页面等页面入口。技术字段、原始状态和来源模式属于可展开的解释层，不应取代人类讨论和知识边界本身。

---

## 09｜我们如何让真人经历真正进入公共知识

一条经历要进入公共知识，至少经过以下判断：

```text
Observation
→ Evidence Validation
→ Evidence Grade
→ Gap Match
→ Mission → Gap → Claim Attribution
→ 相关 Claim Re-evaluation
→ Knowledge State 更新或保持
→ Impact Receipt
```

当前 Contract 定义三种 Grade：

- `E0_OPINION`：观点，不推进 Knowledge State；
- `E1_FIRST_HAND`：第一手经历；
- `E2_ARTIFACT_BACKED`：有材料或 Artifact 支撑的证据。

这套机制不是为了给用户贴“可信/不可信”的永久标签，而是为了说明一条输入**有资格影响什么、没有资格影响什么**。

单条个人经历可以支持、挑战或限制具体 Claim，但不能证明所有初级开发者、所有行业或总体比例。它因此同时提供两种结果：

- 结论发生变化；
- 结论暂时不变，但系统解释为什么还不足以改变。

---

## 10｜我们想构建怎样的 AI-native 社区

如果一个问题可以被持续维护，那么社区的价值就不再只是“产生更多内容”，而是形成一组可追踪的知识演化记录：

```text
讨论产生候选 Claim
→ Agent 找到 Evidence Gap
→ 合适的人补充 Observation
→ 证据被归因、分级和限制
→ 知识状态局部更新
→ 新状态暴露新的未知
→ 社区继续讨论与求证
```

这为 AI-native 社区提供了一个不同于内容推荐的方向：AI 不替代人类经验，也不把所有讨论自动变成事实；AI 负责让社区看见“下一步需要什么”。

**当前 Prototype 验证的是一个 AI Coding Circle 和一个 Golden Knowledge Object 的最小闭环。**如果这种机制成立，未来可以扩展到更多问题、主题和社区，但这不等于当前已经拥有大规模 Knowledge Graph、长期记忆、自动用户匹配或 Multi-Agent 网络。

---

## 11｜系统如何保证 AI 不会随便修改知识

Human Gateway 把判断分散给明确的 Authority：

- **Agent：** Investigation Decision、Knowledge State、Evidence Gap、Gap Suitability、Re-evaluation；
- **Evidence：** Evidence 校验、Grade、First-hand 判断、Gap Match；
- **Community：** Mission 生命周期、参与、Evidence Intake、Impact Receipt；
- **Contracts：** DTO、Enum、Schema 和共享状态；
- **UI：** 只展示后端结果，不自行 Grade、归因或推进状态。

关键保护规则包括：

- Evidence 必须通过 Contract Schema 校验；
- Mission 只有 `OPEN` 时接受 Evidence；
- E0 不得推进 Knowledge State；
- Evidence 只能影响其对应的 Claim；
- 不相关 Evidence 不参与当前 Claim 的 Re-evaluation；
- 原始讨论保留可追溯性；
- 状态变化必须带有原因、来源和限制；
- LIVE、CACHE、GOLDEN_FIXTURE 必须明确区分。

---

## 12｜技术实现方案

当前仓库采用 TypeScript monorepo：

```text
apps/web             Next.js 用户界面
apps/api             HTTP API 与应用编排
packages/contracts   共享 DTO / Enum / Schema 唯一 Authority
packages/agent       知识状态、Gap、Mission、Re-evaluation 决策
packages/evidence    Evidence 校验、Grade、Gap Match
SQLite               Investigation 等状态持久化
fixtures             确定性 Golden Demo 数据
```

请求主链路为：

```text
HTTP Route
→ Application Orchestration
→ LLM Adapter / Agent Action
→ Contract Schema Validation
→ Evidence / Agent / Community Rules
→ SQLite Repository
→ Knowledge Object Projection
```

公开资料和 LLM 读取使用明确的降级链路：

```text
LIVE → CACHE → GOLDEN_FIXTURE
```

当前接入了 OpenAI-compatible Discussion Organizer；无密钥、超时、限流或无效响应时可以回退。规则型对话准备在 Demo 中明确标记为 `EXTRACTIVE_RULES`，不能宣称为自由语义访谈或实时 LLM 成功。

---

## 13｜我们已经跑通了什么

我们已经跑通一个完整的知识生长周期：

```text
Investigation
↓
Knowledge State
↓
Evidence Gap
↓
Mission
↓
Human Observation
↓
Evidence Grade
↓
Claim Re-evaluation
↓
Knowledge State Update / Keep
↓
Impact Receipt
```

当前仓库与文档记录支持的能力包括：

- 对话框三路由：匹配已有问题、提出创建公共问题、直接回答；
- Proposal 确认后创建 Investigation，并生成初始知识文章；
- Knowledge Object 读取投影；
- Claims、Sources、Evidence Gaps、Missions、Evidence 和 Impact Receipts；
- Gap Suitability Gate；
- Mission `OPEN / CLOSED` 生命周期；
- 对话式 Observation 准备、摘要确认和服务端 Evidence Intake；
- E0/E1/E2 分级与相关 Claim Re-evaluation；
- Discovery topics、活动事件和 SQLite 持久化；
- Zhihu OAuth 身份层及关注/创作内容接口；
- LIVE / CACHE / GOLDEN_FIXTURE 来源标记；
- 离线 Golden Demo。

Golden Demo 特别展示三类结果：

| 场景 | 结果 | 说明 |
|---|---|---|
| **Accepted** | `E1_FIRST_HAND` | 证据被接受，可能使 `UNRESOLVED → EARLY_EVIDENCE` |
| **Rejected** | `E0_OPINION` | 只有观点，拒绝推进知识状态 |
| **Unchanged** | Accepted 但状态不变 | 证据有效，但不足以改变总体判断 |

这三种结果证明产品不是“用户提交 Evidence，系统一定修改结论”，而是：**证据只有在资格、匹配关系和影响范围成立时才改变知识状态。**

工程验证包括 Contract、Evidence Grade、Mission 生命周期、归因、Golden Flow 和社区流程测试，以及 `npm run verify` 所覆盖的格式、Lint、类型检查、测试和构建流程。实时知乎调用、真人用户研究和浏览器人工 UAT 不应被表述为已经完成的验证；离线 Demo 使用的合成样例也明确标记为 Golden Fixture。

---

## 14｜从 Answers 到 Living Knowledge

Human Gateway 的长期方向，不是让 AI 生成更多没有归属的答案，而是让每个具有公共价值的问题拥有一份可持续维护的知识状态。

今天，它可以从一个 AI Coding 问题开始：公开讨论形成初始理解，Agent 标出边界，真人补充一段经历，系统解释它影响了哪个 Claim。明天，同样的机制可以服务于职业经验、消费决策、教育实践、技术迁移等更多需要真实场景才能回答的问题。

但未来愿景必须建立在当前机制之上，而不是凭空添加复杂名词：

```text
一个可追踪的问题
→ 一次可解释的知识更新
→ 一群知道自己为什么参与的人
→ 更多问题拥有自己的知识边界
```

**Human Gateway 想做的不是答案的终点，而是问题的长期记忆与下一步行动之间的入口。**

---

# 附录 A｜当前能力、部分能力与未来愿景

## 当前已实现 / 已有代码与测试支撑

Investigation、Knowledge State、ClaimAssessment、EvidenceGap、Gap Suitability、Mission、Evidence Intake、Evidence Grade、Claim Re-evaluation、Impact Receipt、Discovery projection、活动事件、SQLite repository、Zhihu Search/Global Search adapter、OAuth 身份接口、LIVE/CACHE/GOLDEN_FIXTURE fallback，以及 Golden Demo 主链路。

## 已部分实现 / 有明确边界

- 实时 LLM：已有 OpenAI-compatible Adapter 和回退编排，但并非所有运行均为实时 LLM；规则式对话准备明确为 `EXTRACTIVE_RULES`。
- 社区聊天：已有路由、Proposal、Participation 和活动投影；完整社区产品仍非当前范围。
- Zhihu：已有搜索、部分用户 OAuth 能力和适配器；真实租户授权、配额、所有官方接口和 LIVE 全链路尚未全部核验。
- 前端：已有核心页面和 API 接入；30 秒理解目标、桌面/移动浏览器人工 UAT 仍需真人验证。

## 未来愿景，不应写成当前能力

更大规模的 Knowledge Object 网络、自动识别并匹配潜在观察者、Evidence Timeline、复杂 Mission 推荐、Topic/Circle 扩展、通知、长期 Observer Profile、Evidence Graph、完整用户画像和跨对象演化。Multi-Agent、A2A、Knowledge Graph、Long-term Memory、积分经济和完整社交图谱均不属于本轮产品。

---

# 附录 B｜主要产品与 API 映射

| 产品动作 | 主要接口 |
|---|---|
| 问题路由 | `POST /api/chat/route` |
| 创建并确认公共问题 | `POST /api/proposals`、`POST /api/proposals/:id/confirm` |
| 发现问题 | `GET /api/discovery/topics`、`GET /api/investigations` |
| 查看 Knowledge Object | `GET /api/knowledge-objects/:id` |
| 准备 Golden Demo | `POST /api/demo/prepare` |
| 对话式参与 | `POST /api/missions/:id/conversation` |
| 提交 Evidence | `POST /api/missions/:id/evidence` |
| 查看活动 | `GET /api/activity-events` |
| 知乎身份 | `GET /api/auth/zhihu/url`、`GET /api/auth/zhihu/me` |

---

# 附录 C｜启动与验证

```powershell
npm run dev:api
npm run dev:web
npm run verify
```

无密钥离线演示时，保持 `ZHIHU_ACCESS_SECRET` 与 `LLM_API_KEY` 为空；系统应根据实际响应标记 `GOLDEN_FIXTURE`，不得把 Fixture 称为实时检索或真实用户内容。

