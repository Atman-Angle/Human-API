# Human Gateway 前端产品与 Demo Specification

**版本：** v2.0
**日期：** 2026-09-14
**用途：** 在拉取前端同学已有实现后，以产品目标为唯一评判标准，补齐并跑通 AI-native 知乎社区 Golden Demo。
**适用对象：** 前端 / UX Owner（成员 B）以及负责集成 Demo 的开发者。

> 重要说明：前端同学已经完成了一部分页面，但当前尚未拉取到本地。本 Spec **不是要求重做现有页面，也不是为了迁就已有代码**。真正开发时应先拉取并审阅已有实现，再以本 Spec 的产品目标、用户流程、Contract 和验收标准判断：哪些保留、哪些接入、哪些修正、哪些删除。已有代码不是产品事实源。
>
> 本文不替代 `docs/PROJECT_LOCK.md`、`docs/SPEC.md`、`docs/API_CONTRACT.md`、`packages/contracts`、`TASKS.md` 和 `CONTRIBUTING.md`。

## 1. 产品定义

Human Gateway 是建立在知乎已有问题、话题、公开内容和真人经验之上的 **AI-native 知识社区**。

它不是：

- 一次性 AI 搜索或 Chatbot；
- Agent 自动生成内容的内容农场；
- 只让用户提交证据的任务平台；
- 只有结构化数据的研究仪表盘；
- 普通热门内容 Feed。

它保留知乎式的人类表达和讨论，同时新增一层由 Agent 持续维护的共享知识：

```text
人类提问 / 回答 / 讨论 / 质疑 / 分享经历
→ Agent 识别和组织讨论
→ Knowledge Object 持续记录 Claims、Evidence、分歧、限制和未知
→ 发现 Evidence Gap
→ 生成 Mission（仅在适合真人补充时）
→ 用户提交 Observation / Evidence
→ Evidence 校验与归因
→ Agent Re-evaluation
→ 共享知识更新并解释原因
→ 社区继续讨论和产生下一轮问题
```

**核心原则：** Mission 是社区参与方式之一，不是产品首页主角；Knowledge Object 是用户侧核心对象；Investigation 是后端知识演化机制。

## 2. Demo 成功标准

演示者在 5 分钟内必须能完成并解释：

1. 从 Circle 社区入口发现一个正在研究的问题；
2. 阅读真实的人类讨论，同时看到 Agent 的组织结果；
3. 理解当前知道什么、哪里冲突、还缺什么；
4. 进入一个具体 Mission，理解为什么需要真人经历；
5. 提交一条 Observation / Evidence；
6. 看到服务端返回的 Grade、归因、Re-evaluation 和 Impact Receipt；
7. 回到 Knowledge Object，看到知识变化或“仍不足以变化”的解释；
8. 明白这是一个会持续演化的社区，而不是一次性问答。

## 3. Golden Demo 内容

- Circle：AI Coding Circle；
- Knowledge Object：AI Coding 对初级开发者工作的影响；
- 问题：AI Coding 实际改变了初级开发者哪些工作？；
- 核心 Evidence Gap：最近持续使用 AI Coding 的学生、实习生或 0–3 年开发者，哪些任务交给了 AI，人仍在哪一步承担最终判断？。

不得把 Golden Fixture 伪装成实时知乎内容、真实用户内容或实时 LLM 结果。所有来源和降级状态要可识别。

## 4. 用户心智模型

用户不应被要求先理解内部术语。页面用自然语言解释：

| 内部概念         | 用户看到的解释                   |
| ---------------- | -------------------------------- |
| Knowledge Object | 正在被社区共同理解和更新的问题   |
| Claim            | 一个具体、可被支持或质疑的说法   |
| Evidence Gap     | 当前还缺少的关键信息             |
| Mission          | 社区邀请你完成的一项具体求证     |
| Evidence         | 可核对的经历、事件、材料或来源   |
| Knowledge State  | 当前证据支持到什么程度           |
| Impact Receipt   | 你的贡献对这个问题产生了什么影响 |

## 5. 信息架构

推荐主导航：

```text
Circle / 社区
├── Discover：正在讨论和研究的问题
├── Knowledge Objects：持续演化的问题页
├── Missions：可参与的证据缺口
└── My Contributions：我的提问、讨论、Evidence 与影响
```

如果当前 Demo 不具备完整身份系统，`My Contributions` 可明确标记为 Demo Session，不得伪造跨用户数据。

### 页面优先级

**P0 必须跑通：**

1. Circle / Community Landing；
2. Discover / 问题发现；
3. Knowledge Object Detail；
4. Mission Detail + Evidence Submission；
5. Impact Receipt / Knowledge Update；
6. 基础 My Contributions。

**可后置：** Follow、通知、复杂推荐、自动邀请、完整用户 Profile、多 Circle 治理、排行榜、积分经济。

## 6. 页面规格

### 6.1 Circle / Community Landing

页面回答：这个社区在共同研究什么？最近有什么变化？我可以从哪里进入？

必须有：

- Circle 名称、定位和主题说明；
- 核心 Knowledge Object；
- 正在讨论的问题；
- 最近发生的知识变化；
- 进行中的 Mission；
- 进入问题页的 CTA。

不能做成：热门榜、点赞榜、单纯 Mission 列表或帖子瀑布流。

### 6.2 Discover / 问题发现

用户可浏览或搜索：

- 问题标题和范围；
- 人类讨论摘要；
- 当前 Knowledge State；
- 是否有明显争议；
- 当前 Evidence Gap；
- 最近变化时间；
- 来源状态。

排序可以先使用简单的相关性 / 最近更新，不引入“热度等于真相”的表达。没有后端 Discover API 时，使用已有 Investigation / Knowledge Object projection，不另造前端数据源。

### 6.3 Knowledge Object Detail

这是核心页面，必须同时包含“人类讨论层”和“共享知识层”。

推荐顺序：

```text
问题标题、范围、来源与更新时间
↓
当前理解：Knowledge State + 人话解释
↓
主要 Claims
  ├── 支持 Evidence
  ├── 反例 / 冲突
  ├── 适用条件
  └── 限制
↓
人类讨论
  ├── 原始问题 / 回答 / 补充 / 质疑
  ├── 作者和上下文
  └── Agent 组织结果及其关联 Claim
↓
Knowledge Frontier：还缺什么
↓
Mission：我可以怎样参与
↓
最近变化：Evidence、Re-evaluation、Impact
```

页面首屏需要让用户知道：

- 正在讨论什么；
- 当前知道什么；
- 哪些仍不确定；
- 我可以说什么或做什么。

不要用“Agent 最终答案”覆盖人类原始讨论，也不要把讨论全部隐藏到页面底部。桌面端可以并列展示摘要与讨论；移动端用分区或标签切换。

### 6.4 Discussion

用户可以自然地：

- 提问；
- 回答；
- 补充背景；
- 分享经历；
- 提出反例；
- 引用来源；
- 质疑 Agent 的组织结果。

输入框可以给轻量提示，但不能强迫用户先选择 Evidence 类型或填写完整 Mission 表单。

每个 Agent 组织结果尽量能回溯：

```text
原始发言 → Agent 解释 → 关联 Claim / Open Question → 是否需要进一步求证
```

讨论分类（Opinion、Claim Candidate、Observation、Counterexample、Limitation、Evidence Gap）不是 Evidence Grade。普通讨论不会自动改变 Knowledge State。

### 6.5 Mission Feed

Mission Feed 是按 Evidence Gap 组织的结构化参与入口，不是通用推荐流。

每张卡回答：

- 为什么需要这条信息；
- 影响哪个 Claim；
- 什么人适合；
- 需要提交什么；
- 当前状态；
- 预计投入（若后端返回）；
- 提交后可能帮助判断什么。

优先使用 `GET /api/missions?status=OPEN`。`estimatedSeconds` 若存在，仅展示，不新增依赖。

### 6.6 Mission Detail + Evidence Submission

必须展示：

- Mission 目的；
- 所属 Knowledge Object / Investigation；
- Evidence Gap 与 Claim 关系；
- `OPEN / CLOSED` 状态；
- 用户需要回答的具体问题；
- 已有 Evidence（若接口返回）；
- 提交表单；
- 成功、失败、拒绝、超时和关闭状态。

前端只按 `EvidenceSubmission` Contract 提交字段。不得提交或覆盖 `missionId`、`evidenceGapId`、`affectedClaimId`；归因由服务端完成。

任务文案应鼓励具体经历：发生了什么、什么时候、用户扮演什么角色、哪些是亲身经历、是否有 Artifact、哪些地方不确定。

### 6.7 Impact Receipt / Knowledge Update

提交后的结果可以是页面、抽屉或更新卡，但必须来自服务端真实返回。

展示：

- Evidence Grade；
- 是否被接受；
- 受影响 Claim；
- `stateBefore → stateAfter`（若返回）；
- `impactSummary`；
- `stillMissing`；
- 时间、来源和回到 Knowledge Object 的入口。

必须同时设计两种结果：

```text
Evidence 被接受且状态改变
Evidence 有价值但仍不足以改变整体状态
```

禁止固定演示“提交一次必然升级”。禁止前端自行计算影响。

### 6.8 My Contributions

基础版展示：

- 我发起的问题；
- 我参与的 Mission；
- 我提交的 Evidence；
- Evidence 的处理状态；
- Impact Receipt；
- 仍未解决的问题。

若没有真实身份、归属和持久化 API：

- 使用 Demo Session 明确标识；或
- 先交付导航入口和空状态；
- 不把系统中所有人的记录显示为“我的”。

## 7. API 联调边界

优先使用 `docs/API_CONTRACT.md` 当前接口：

| 用途                  | 接口                                    |
| --------------------- | --------------------------------------- |
| Investigation 列表    | `GET /api/investigations`               |
| Investigation 详情    | `GET /api/investigations/:id`           |
| 创建 Investigation    | `POST /api/investigations`              |
| 创建 / 复用 Mission   | `POST /api/investigations/:id/missions` |
| Mission 列表          | `GET /api/missions?status=OPEN`         |
| Mission 详情          | `GET /api/missions/:id`                 |
| Evidence 提交         | `POST /api/missions/:id/evidence`       |
| Impact Receipt        | `GET /api/evidence/:id/impact`          |
| 讨论组织              | `POST /api/discussions/organize`        |
| Knowledge Object 投影 | `GET /api/knowledge-objects/:id`        |

联调顺序：

```text
先读取真实响应
→ 建立页面 View Model 映射
→ 实现 loading / error / empty
→ 接入 mutation
→ 验证回链和刷新
```

View Model 只能是前端展示适配，不得成为第二套业务 DTO、状态机或事实源。

## 8. 状态、来源和错误

只展示后端已有值：

- Knowledge State：`UNRESOLVED`、`EARLY_EVIDENCE`、`SUPPORTED_WITH_LIMITATIONS`；
- Evidence Grade：`E0_OPINION`、`E1_FIRST_HAND`、`E2_ARTIFACT_BACKED`；
- Mission Status：`OPEN`、`CLOSED`；
- Search Provenance：`LIVE`、`CACHE`、`GOLDEN_FIXTURE`。

必须覆盖：

- 加载；
- 空结果；
- 404；
- timeout；
- rate limit；
- upstream unavailable；
- CLOSED Mission；
- Evidence 被拒绝或不匹配；
- Evidence 接受但状态不变；
- 重复创建 Mission 返回既有 Mission；
- 提交中防重复点击。

错误信息要能回答：发生了什么、用户还能做什么、是否需要稍后重试。requestId（若返回）可放在详情或复制入口。

## 9. 视觉与交互方向

目标不是“AI 仪表盘”，而是：

> **知乎式人类内容阅读 + AI 组织层的清晰解释 + 求证行动的低摩擦入口。**

建议：

- 内容阅读优先，结构化信息分层出现；
- 人类作者、原话和来源清楚；
- Agent 以主持人 / 研究协调员形象出现，不伪装成权威用户；
- State、Grade、Mission 用克制的状态色和自然语言；
- 不展示虚假的可信度百分比；
- Evidence Gap 和 Mission 是行动重点，但不能压过讨论；
- 移动端提交和 Receipt 可单手完成；
- 重要变化有时间线或“最近变化”摘要；
- 缓存、Fixture 和失败状态不会被视觉包装成正常实时内容。

## 10. 已有前端实现的接入规则

拉取前端同学代码后，第一轮不是重写，而是做一次产品对照审查：

1. 列出现有页面、路由、组件和数据来源；
2. 标注哪些已对应本 Spec 的 P0 页面；
3. 标注哪些是静态占位、Fixture、真实 API 或未接通；
4. 检查是否重复定义 DTO、状态或业务规则；
5. 检查页面是否把产品做成普通 Feed、任务平台或纯 Agent 看板；
6. 保留符合产品目标的部分；
7. 通过最小修改接入真实 Contract；
8. 只有产品目标不满足时才重做局部交互；
9. 不为了迁就已有实现而降低本 Spec 的产品验收标准；
10. 不因为本 Spec 就删除已有实现，先查看 diff、运行和 Golden Demo。

审查输出至少包括：

```text
页面 / 路由
当前状态
真实数据来源
符合点
偏离点
需要保留 / 接入 / 修正 / 删除
依赖的后端 Contract
```

## 11. 前端交付顺序

### 阶段 A：接入和盘点

- 拉取前端分支或工作区；
- 确认启动命令和现有页面；
- 做页面—API—Contract 映射；
- 不先大面积重构。

### 阶段 B：跑通 Golden Loop

```text
Circle Landing
→ Knowledge Object
→ Discussion / Agent Organization
→ Evidence Gap
→ Mission
→ Evidence Submission
→ Impact Receipt
→ Knowledge Object 更新
```

### 阶段 C：补齐真实状态

- loading / empty / error；
- LIVE / CACHE / GOLDEN_FIXTURE；
- Mission CLOSED；
- Evidence rejected / accepted-but-no-change；
- 防重复提交和刷新回链。

### 阶段 D：体验优化

再优化视觉层级、内容阅读、移动端、动效、文案和发现效率。优化不能改变 Contract 或偷偷补业务规则。

## 12. 验收清单

### 产品验收

- [ ] 用户感觉进入的是有人参与的知识社区，而不是后台工具；
- [ ] 用户可以自然阅读和参与讨论；
- [ ] 原始讨论与 Agent 组织结果可追溯；
- [ ] Knowledge Object 清楚展示已知、分歧、未知和最近变化；
- [ ] Mission 是有原因的参与邀请，而不是泛化问答；
- [ ] 用户知道 Evidence 提交后可能改变什么；
- [ ] 状态不改变时也有解释；
- [ ] 少数意见、反例和限制不会被总结覆盖；
- [ ] 回到 Knowledge Object 后能看到真实更新或真实无变化。

### 工程验收

- [ ] 已有前端实现先盘点后修改；
- [ ] 没有因为迁就旧代码而偏离产品目标；
- [ ] 没有重新定义后端 DTO / Enum / Schema；
- [ ] 没有前端自行判定 Grade、State、Gap Suitability 或 Claim 归因；
- [ ] `npm run verify` 通过；
- [ ] 人工走完 Golden Demo；
- [ ] 明确真实 API、Fixture、placeholder 和 Contract 缺口；
- [ ] 改动符合当前 Task Owner 和 Allowed Paths。

## 13. Demo 后分工

完整 Demo 跑通后再拆优化任务：

- **前端 / UX Owner：** 页面结构、视觉、交互、响应式、错误状态、内容阅读和讨论体验；
- **Agent / Backend Owner：** 缺失 API、Contract、编排、持久化、归因和状态更新；
- **Evidence Owner：** Grade 文案、负例、证据解释和验收 Case。

每个优化任务必须包含 Task ID、Owner、Allowed Paths、Must Not Modify 和 Acceptance Criteria。跨模块需求按 Contract First 执行。

## 14. 明确不做

本轮 Demo 不包含：

- 点赞、排行榜、积分经济；
- 普通内容推荐 Feed；
- 完整用户画像和复杂自动匹配；
- Multi-Agent / A2A；
- Knowledge Graph；
- 完整社交图谱；
- 第二套状态管理、DTO 或 Contract；
- 用 Agent 生成内容替代原始讨论；
- 用前端假数据伪装真实社区活动。

## 15. 一句话总结

> 先让用户像在知乎一样发现、阅读和参与一个问题，再让 Agent 把讨论组织成持续演化的共享知识；当知识有缺口时，用户可以选择参与 Mission，并清楚看到自己的贡献如何改变了这个社区正在理解的问题。

## 16. v3 Golden Demo 当前实现与验收边界（2026-09-14）

本轮页面信息优先级以 `docs/SPEC.md` §12 为准，覆盖上文历史顺序：发现 → 公开人类讨论 → Agent 共识/分歧/未知 → 邀请 → 对话 → 用户确认 → 回执。`/knowledge-object/:id` 与 `/investigation/:id` 使用同一组件和共享 Contract，不再并行维护 JSON 弱类型页面。

- 首页自动请求服务端准备固定主题，展示真实 projection；没有前端 Mock fallback。
- 只有对话确认动作调用服务端写入；摘要可以直接修改或取消。主路径不再从 MockContribution 推导 acceptance。
- 合成示例明确标记 GOLDEN_FIXTURE；公开来源各自展示 LIVE/CACHE/GOLDEN_FIXTURE。规则摘录不假冒实时 LLM。
- 暂不提供通用创建、个人投稿统计、普通社交流；旧假数据页面不再作为演示入口。
- 响应式、键盘焦点约束、Escape 取消已实现；浏览器工具因 `unsupported Codex auth method: apikey` 无法启动，本轮不能声称桌面/移动浏览器人工验收完成。
- 自动化证据与运行步骤见 `docs/DEMO_V3.md`。30 秒理解目标需真人观察测试，不以代码检查替代。
