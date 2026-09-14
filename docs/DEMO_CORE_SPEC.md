# Human Gateway 核心共创 Demo Spec

**版本：** v2.0  
**日期：** 2026-09-14  
**状态：** Implementation Target

## 1. 产品定义

Human Gateway 不是一次性问答工具，也不是“每个用户提交一条内容就生成一个帖子”的社区。

它是一个建立在圈子讨论之上的 Agent 驱动共创求证社区：

- **帖子代表一类具有公共价值的共性问题；**
- **帖子是一份持续维护的 Knowledge Object / 文章；**
- 用户、Agent 和讨论共同维护这篇文章；
- 新证据不会简单追加成评论，而会被 Agent 判断后补充、修正或限制文章结论；
- 同一类问题尽量汇聚到已有帖子，避免重复建帖。

核心循环：

```text
用户提问 / 广场发现
→ 找到或创建共性问题帖子
→ Agent 整合已有资料形成文章
→ Agent 识别现实边界与证据缺口
→ 用户在帖子内讨论、补充经历和证据
→ Agent 读取讨论
→ 判断新证据
→ 更新文章、状态、边界和待验证问题
→ 持续共创
```

## 2. 两个用户入口

### 2.1 入口一：对话框问问题

用户从首页对话框进入，输入一个问题。

系统提供三个预设路由：

1. **已有帖子**：问题与现有帖子高度相关，进入已有帖子，不重复创建；
2. **创建公共求证帖子**：问题复杂、具有公共价值，且圈子中没有合适帖子，创建新的共创帖子；
3. **普通回答 / 不建帖**：问题过于个人化、简单或不适合形成公共知识对象，直接给出回答或建议。

路由由 Agent 根据问题和现有帖子判断，但必须向用户解释原因。

路由结果示例：

```text
我找到了一个高度相关的共创帖子，建议继续参与已有讨论。
```

```text
这个问题涉及多个真实场景，具有公共价值，当前圈子没有合适帖子，建议创建求证帖子。
```

```text
这个问题目前更适合直接回答，不需要创建公共帖子。
```

### 2.2 入口二：圈子广场刷帖子

用户进入圈子广场，浏览由社区共创的帖子卡片。

帖子卡片至少展示：

- 共性问题标题；
- 当前文章摘要；
- Knowledge State；
- 已覆盖的现实场景；
- 未解决的 Evidence Gap；
- 最近更新原因；
- 参与人数 / Evidence 数量；
- 是否存在可参与 Mission。

用户点击感兴趣的帖子后，进入帖子详情页，继续执行与入口一相同的流程：阅读文章、查看边界、参与讨论、提交经历或证据、触发 Agent 更新。

两个入口最终汇聚到同一个帖子共创模型，不允许存在两套独立的求证流程。

## 3. 帖子模型

### 3.1 帖子不是单条用户内容

帖子表示：

```text
一个具有公共价值的共性问题
+ 一篇由 Agent 持续维护的文章
+ 一组 Claims / Evidence / Limitations
+ 一组现实边界与开放问题
+ 社区讨论和参与记录
```

用户的提问、评论、Observation 和 Evidence 都是帖子演化的输入，不自动成为新的帖子。

### 3.2 创建帖子条件

仅当同时满足以下条件时，才创建新帖子：

- 问题复杂或具有公共价值；
- 当前圈子没有足够相关的已有帖子；
- Agent 能够识别至少一个可组织的 Claim 或研究方向；
- 该问题适合持续收集多人的现实经验或证据。

个人化、一次性、没有公共价值或与已有帖子重复的问题不得创建新帖子。

### 3.3 帖子内容结构

帖子详情页的主体是一篇持续更新的文章，至少包含：

1. 问题定义；
2. 当前结论摘要；
3. Claims；
4. 已有资料和来源；
5. 已确认的 Evidence；
6. 当前 Knowledge State；
7. 现实边界 / Limitations；
8. 尚未解决的 Evidence Gap；
9. 可参与的 Mission；
10. 社区讨论；
11. 更新日志；
12. Impact Receipt。

文章必须能够说明：

```text
当前我们知道什么
当前我们还不知道什么
哪些结论只在什么条件下成立
哪些新证据改变了文章的哪一部分
```

## 4. 核心用户流程

### 4.1 从对话框进入已有帖子

```text
用户输入问题
→ Agent 检索帖子广场
→ 返回相关帖子
→ 用户进入帖子
→ 阅读当前文章
→ 参与讨论或提交 Evidence
```

系统不能因为用户重新提问就复制一篇内容相同的新帖子。

### 4.2 从对话框创建公共求证帖子

```text
用户输入复杂公共问题
→ Agent 判断没有合适已有帖子
→ 用户确认创建
→ Agent 读取现有搜索资料、讨论和来源
→ 生成第一版文章
→ 创建帖子 / Investigation
→ 持久化文章和结构化知识状态
→ 识别现实边界和 Evidence Gap
→ 生成可参与 Mission
```

创建后，用户进入的是帖子详情，而不是一次性 AI 答案页。

### 4.3 Agent 整合文章

后端调用真实 OpenAI-compatible LLM，根据已有资料生成结构化结果：

- 文章摘要；
- Claims；
- 支持和限制关系；
- 来源引用；
- 当前 Knowledge State；
- 现实边界；
- Evidence Gap；
- 需要哪些人的什么具体经历；
- 是否适合生成 Mission。

Agent 可以改写文章，但不得捏造 Evidence。讨论和普通观点只能作为候选输入，只有经过 Evidence 规则判断的内容才能进入已确认依据。

文章更新必须保存版本或更新记录，使用户能看到：

```text
本次更新由哪条讨论 / Evidence 触发
文章改变了什么
Knowledge State 是否变化
仍然缺少什么
```

### 4.4 Agent 探索现实边界

Agent 根据当前文章主动识别现实中的边界，而不是只总结已有内容。

示例：

```text
当前文章认为 AI Coding 可能减少简单任务的调试时间。
```

Agent 进一步提出：

- 在复杂重构中是否仍然成立？
- 对不同经验水平的开发者是否不同？
- 短期效率提升是否会带来长期维护成本？
- 哪些场景会出现反效果？

每个边界都必须转化为可回答的 Evidence Gap / Mission，例如：

```text
请分享一次最近 30 天内使用 AI Coding Agent 完成复杂重构的经历，
说明具体操作、结果以及是否需要返工。
```

不得把 Mission 设计成泛泛问卷、人口比例调查或要求用户提交大量记录。

### 4.5 帖子内共创讨论

用户可以在帖子内：

- 发表评论；
- 提出反例；
- 补充具体经历；
- 引用外部资料；
- 质疑文章中的 Claim；
- 响应某个 Mission。

评论本身不会自动改变文章。Agent 需要读取讨论，区分：

```text
Opinion
Claim Candidate
First-hand Observation
Counterexample
Limitation
Evidence Gap
```

只有符合 Evidence 条件且命中当前 Gap 的内容，才能触发 Evidence intake 和文章更新。

### 4.6 新证据更新文章

```text
用户评论 / Observation
→ Agent 识别是否是有效 Evidence
→ Evidence package 分级 E0 / E1 / E2
→ 判断是否命中 Gap
→ 更新 Claim 支持关系
→ 更新 Knowledge State
→ 更新文章摘要 / 边界 / 待验证问题
→ 生成 Impact Receipt
→ 写入帖子更新日志
```

单条个人经历只能支持、挑战或限制具体 Claim，不得被表述为证明普遍规律。

## 5. Demo 范围

### 5.1 必须支持

- 对话框入口；
- 三个 Agent 预设路由；
- 已有帖子匹配；
- 创建公共求证帖子；
- 圈子广场帖子列表；
- 帖子详情文章；
- 真实 LLM 文章整合；
- Agent 边界探索；
- Mission 生成；
- 帖子内评论 / Observation；
- Evidence Grade；
- Re-evaluation；
- 文章更新；
- Knowledge State 更新；
- Impact Receipt；
- 更新日志；
- Demo 初始化和重置。

### 5.2 可以暂时简化

- 用户认证；
- 多人真实账号；
- 生产级数据库；
- 完整知乎写入；
- 高并发；
- 管理后台；
- 复杂通知系统。

Demo 可以使用单用户本地身份和 JSON Repository，但核心文章、Evidence 和更新结果必须由后端持久化。

## 6. 现有代码对应关系

当前代码中的 Investigation 应作为帖子的领域承载对象，而不是被当作一次性问答结果：

- `Investigation`：共性问题帖子 / Knowledge Object；
- `discussionOrganizations`：Agent 对讨论的结构化整理；
- `knowledgeState`：文章当前知识状态；
- `evidenceState`：Claims、Gap、Limitations 和 Frontier；
- `missions`：针对现实边界的参与邀请；
- `evidence`：用户提交并被判断的依据；
- `impactReceipts`：每次贡献对文章的影响反馈；
- `repository`：帖子及其演化状态的持久化；
- `community-projection`：广场和帖子详情的读取投影。

现有 `/api/demo/prepare`、`/api/discussions/organize`、`/api/missions/:id/evidence` 和 `/api/evidence/:id/impact` 应被串成统一帖子共创流程，而不是分别作为孤立 Demo API。

## 7. 必须补齐的接口能力

| Method | Path                         | 用途                     |
| ------ | ---------------------------- | ------------------------ |
| `POST` | `/api/chat/route`            | 对话框三路由判断         |
| `GET`  | `/api/investigations`        | 圈子广场帖子列表         |
| `GET`  | `/api/investigations/:id`    | 帖子详情 / 当前文章      |
| `POST` | `/api/investigations`        | 确认创建公共求证帖子     |
| `POST` | `/api/discussions/organize`  | Agent 整理讨论并更新帖子 |
| `GET`  | `/api/knowledge-objects/:id` | 帖子读取投影             |
| `GET`  | `/api/missions?status=OPEN`  | 可参与边界 Mission       |
| `POST` | `/api/missions/:id/evidence` | 提交 Evidence 并更新帖子 |
| `GET`  | `/api/evidence/:id/impact`   | 获取 Impact Receipt      |
| `POST` | `/api/demo/prepare`          | 初始化共创 Demo 帖子     |
| `POST` | `/api/demo/reset`            | 重置 Demo 帖子           |

如果当前接口名称或 DTO 已存在，必须优先扩展现有 Contract，不创建第二套帖子 DTO。

## 8. 评委可体验路径

### 路径 A：从对话框开始

```text
打开首页
→ 输入一个复杂公共问题
→ 查看三个预设路由
→ 选择“创建公共求证帖子”
→ Agent 整合现有资料
→ 进入生成的文章帖子
→ 查看当前结论和现实边界
→ 选择一个 Mission
→ 提交自己的经历
→ 查看 Evidence Grade
→ 查看文章更新
→ 查看 Impact Receipt
```

### 路径 B：从圈子广场开始

```text
打开圈子广场
→ 浏览共性问题帖子
→ 点击感兴趣的帖子
→ 阅读当前文章
→ 查看未解决的边界
→ 参与讨论或提交 Observation
→ Agent 读取讨论
→ 文章更新
→ 查看更新日志和自己的 Impact Receipt
```

两条路径最终都进入同一个帖子详情和共创循环。

## 9. Definition of Done

- [ ] 用户有对话框入口；
- [ ] 对话框显示三个预设路由；
- [ ] 已有相关帖子时不会重复创建；
- [ ] 复杂公共问题可以创建共创帖子；
- [ ] 帖子是一篇持久化、可持续更新的文章；
- [ ] Agent 根据已有资料生成第一版文章；
- [ ] Agent 能根据文章提出现实边界和 Mission；
- [ ] 圈子广场可以浏览帖子；
- [ ] 用户可以从帖子进入相同共创流程；
- [ ] 用户可以在帖子内讨论和提交 Observation；
- [ ] Agent 能读取讨论并区分观点与证据；
- [ ] Evidence 由后端分级和判断；
- [ ] 新 Evidence 能更新文章，而非只增加一条评论；
- [ ] Knowledge State 和文章边界能真实更新；
- [ ] 用户能看到 Impact Receipt 和更新日志；
- [ ] 页面刷新后状态不丢失；
- [ ] Demo 可以重置并重复演示；
- [ ] `npm run verify` 通过。
