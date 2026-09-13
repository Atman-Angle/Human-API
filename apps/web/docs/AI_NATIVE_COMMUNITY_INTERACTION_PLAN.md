# AI-native 知乎社区交互方案

## 1. 产品核心

Human Gateway 不是“Agent 自动生成帖子”的内容社区，也不是普通 AI 搜索。

核心对象是一个持续更新的 **Investigation / Knowledge Object**：

```text
问题
→ 已有 Claims
→ 多方讨论与 Evidence
→ 冲突与知识边界
→ Evidence Gap
→ Mission
→ 真人贡献
→ Knowledge State 更新
```

帖子、回答、评论、Mission 和 Evidence 都是围绕 Investigation 的不同输入或展示方式。

## 2. Agent 的定位

Agent 是社区知识的编排者、主持人和研究协调员，不是社区成员，也不是最终裁判。

Agent 负责：

- 组织分散的知乎内容和讨论；
- 提炼 Claims、Evidence 和冲突；
- 暴露当前 Knowledge Boundary；
- 发现 Evidence Gap；
- 生成 Mission 并邀请合适的人参与；
- 重新评估 Knowledge State；
- 说明每条贡献改变了什么。

Agent 不负责：

- 代替用户站队；
- 把某个观点直接判定为真理；
- 伪造证据；
- 把所有用户发言压缩成无来源的总结；
- 用“评论数量”代替真实 Evidence。

## 3. 首页：正在推进的问题

首页不是普通内容 Feed，而是 **Investigation Feed**。

用户看到的不是“热门帖子”，而是社区正在推进的问题。

### 顶部结构

- 知乎 · 求证 Agent 品牌
- 搜索入口
- 我的求证入口
- 话题分类：推荐、AI、科技、编程、教育、职场、数码
- 发起求证按钮

### Investigation 卡片

每张卡片展示：

- 问题标题；
- 发起人和更新时间；
- 当前 Knowledge State；
- 当前 Claims 或公开讨论摘要；
- 相关讨论数量；
- Evidence 数量；
- 第一手经历数量；
- 当前 Evidence Gap；
- Agent 行动按钮：查看缺口 / 查看分析。

卡片右侧使用 Agent 状态区域：

```text
✦ Agent
⚠ 证据不足
18 条相关讨论
当前缺口：真实开发者经历
[查看缺口]
```

禁止展示没有后端或 Mock 字段支撑的点赞、热度和排名。

## 4. Investigation 详情页

详情页是整个产品的核心页面，页面中心始终是问题的知识状态，而不是某一篇帖子。

### 页面结构

#### A. 问题头部

- 问题标题；
- 发起时间和发起人；
- Knowledge State；
- Evidence 数量；
- 当前参与人数；
- 关注或回到我的求证入口。

#### B. 当前知道什么

展示 Agent 整理出的：

- 已知 Claims；
- 支持每条 Claim 的 Evidence；
- 公开来源；
- 适用条件；
- 当前可信程度。

#### C. 分歧与冲突

不把讨论简单分成“正方”和“反方”，而是按 Claim 展示：

```text
Claim
支持它的 Evidence
反驳它的 Evidence
适用条件
当前可信程度
仍有的限制
```

如果需要展示立场，只作为辅助标签，例如“支持观点”“反例”“补充条件”，不把用户固定贴成某个阵营。

#### D. Knowledge Frontier

明确展示：

- 目前还不知道什么；
- 为什么现有内容无法回答；
- 缺少哪类真实经历；
- 哪些用户适合参与；
- 新 Evidence 可能影响哪条 Claim。

#### E. Mission 区域

展示当前可以参与的求证任务：

- 任务目的；
- 证据缺口；
- 参与资格；
- 预计耗时；
- 需要提交的内容；
- 影响的 Claim；
- 当前 Mission 状态。

## 5. 用户贡献类型

不要只提供一个通用评论框。用户必须明确自己正在贡献什么。

### 普通讨论

按钮文案：

```text
补充观点
```

适合表达看法、解释和补充背景，不直接推进 Knowledge State。

### 反例

按钮文案：

```text
提供一个反例
```

引导用户说明：

- 哪条现有 Claim 不适用于自己的情况；
- 发生了什么不同的事实；
- 反例适用的场景和边界。

### Evidence Submission

按钮文案：

```text
提交第一手经历
```

引导用户提交：

- 发生了什么；
- 什么时候发生；
- 自己扮演什么角色；
- 哪一部分是亲身经历；
- 是否有 Artifact；
- 哪些地方自己不确定。

用户提交前必须看到提示：

> 你不需要证明完整结论，只需要记录一次真实经历。

## 6. Mission Feed

Mission Feed 不是普通推荐流，而是：

> 我现在可以帮助补足哪些证据？

每张 Mission 卡片展示：

- 当前 Evidence Gap；
- 为什么需要这条信息；
- 适合参与者；
- 预计耗时；
- 需要提交的内容；
- 影响的 Claim；
- 已有多少人参与；
- 当前状态：OPEN / CLOSED。

筛选方式：

- 与我相关；
- 最近创建；
- 尚无人参与；
- 正在交叉验证；
- 已完成。

## 7. Evidence 提交交互

Evidence 表单根据 Mission 返回的问题动态生成，不写死为 AI Coding 字段。

字段类型：

- `SINGLE_SELECT`：单选；
- `MULTI_SELECT`：多选；
- `SHORT_TEXT`：短文本；
- `URL`：材料链接。

提交过程：

```text
选择贡献类型
→ 填写真实经历
→ 确认不确定部分
→ 提交
→ Agent 评估
```

提交期间显示：

```text
正在验证这条经历与当前 Evidence Gap 的关系
```

前端不自行判断 E0 / E1 / E2。

## 8. Impact Receipt

Evidence 提交完成后，页面展示正式的 Impact Receipt。

必须说明：

- Evidence 等级；
- 是否被接受；
- 影响了哪条 Claim；
- Knowledge State 是否变化；
- 变化前后的状态；
- 这条贡献具体改变了什么；
- 仍然缺少什么；
- 下一步可以参与什么 Mission。

展示示例：

```text
你的第一手经历已进入求证链路

E1 · 第一手观察
影响 Claim：AI 正在接手部分测试与调试任务
状态变化：UNRESOLVED → EARLY_EVIDENCE

这条经历验证了一个具体任务变化。
它还不能证明所有初级开发者都发生了同样变化。
```

## 9. 我的求证：贡献控制台

“我的求证”不是简单历史记录，而是用户的贡献控制台。

页面分为：

### 我提出的问题

- 我发起的 Investigation；
- 当前 Knowledge State；
- 当前 Evidence Gap；
- 最新一次 Re-evaluation。

### 我参与的 Mission

- Mission 标题；
- 所属 Investigation；
- Mission 状态；
- 提交状态；
- 是否产生影响。

### 我的 Evidence

- 提交的第一手经历；
- Evidence Grade；
- 是否被接受；
- 影响的 Claim；
- Impact Receipt。

### 仍在推进的问题

- 仍未解决的 Investigation；
- 尚无人处理的 Evidence Gap；
- 下一步可以参与的 Mission。

所有记录都可以回到对应 Investigation，不停留在孤立的个人历史列表。

## 10. 页面之间的跳转

```text
Investigation Feed
→ Investigation 详情
→ Knowledge Frontier
→ Mission 详情
→ Evidence Submission
→ Impact Receipt
→ 回到 Investigation 的最新状态
```

```text
我的求证
→ 我提出的问题
→ 我参与的 Mission
→ 我的 Evidence
→ 对应 Impact Receipt
```

## 11. 前端展示边界

前端只负责投影后端或 Mock 返回的知识状态。

前端不负责：

- 自行判断 Evidence Grade；
- 自行推进 Knowledge State；
- 自行决定 Claim 是否成立；
- 把普通讨论显示为 Evidence；
- 把一个人经历外推为群体结论；
- 生成伪造的 Impact Receipt；
- 把帖子、评论数量当成知识可信度。

## 12. 当前 Mock 原型验收标准

在不接后端的情况下，前端 Mock 必须能够演示：

```text
打开知乎式求证首页
→ 看到多个 Investigation 卡片
→ 切换话题分类
→ 点击卡片查看 Knowledge Object
→ 查看 Claims、分歧、Evidence Gap
→ 打开 Mission
→ 提交第一手经历
→ 显示 E1 / E2
→ 显示 UNRESOLVED → EARLY_EVIDENCE
→ 显示 Impact Receipt
```

这套 Mock 交互稳定后，再把数据源替换成真实 API。
