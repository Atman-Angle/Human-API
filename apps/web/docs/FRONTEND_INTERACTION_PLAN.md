# Human Gateway 前端交互方案

## 1. 产品目标

Human Gateway 不是普通 AI 问答页面，而是一套“发现未知、邀请真人补充、更新公共知识”的 Web 求证工作台。

前端需要让用户清楚看到：

```text
这个问题已经知道什么
→ 还不知道什么
→ 为什么需要真人经历
→ 我可以补充什么
→ 我的观察改变了什么
```

## 2. 核心流程

```text
进入首页
→ 输入问题
→ 开始求证
→ 查看 Agent 调查过程
→ 查看 Investigation 结果
→ 查看 Knowledge Boundary
→ 查看 Evidence Gap
→ 参与 Evidence Mission
→ 提交真实经历
→ 查看 Evidence 评估
→ 查看 Knowledge State 更新
→ 查看仍未解决的部分
```

只有一个 Web 端。桌面和窄屏浏览器使用同一套功能与信息，只调整布局。

## 3. 首页：提问入口

路径：`/`

首页只负责开始一次 Investigation。

页面内容：

- Human Gateway 品牌与“求证社区”定位
- 说明 AI 能整理答案，但不能凭空生成真实经历
- 问题输入框
- Golden Case 快捷入口
- 开始求证按钮
- 流程提示：检索、找缺口、问真人、更新结论

输入规则：

- 不能为空，最长 500 字
- 支持回车提交，多行输入使用 `Ctrl/Command + Enter`
- 提交期间禁止重复提交

## 4. Investigation 工作台

路径：`/investigation/[id]`

采用“左侧证据内容 + 右侧知识边界”的双栏结构。

顶部区域：

- 当前问题
- Knowledge State
- Evidence 数量
- 公开来源数量
- 新建求证按钮

左侧内容区：

1. **公开信息**：已知信息、共同主题和公开资料中的分歧。
2. **当前可支持**：支持的 Claim、支持理由、关联来源或 Evidence 数量。
3. **仍待验证**：无法确认的 Claim、证据不足的原因，并说明“未支持不等于错误”。
4. **结论边界**：样本、搜索范围和摘要验证限制。
5. **检索来源**：知乎和全网分开标识，展示标题、摘要、作者、原文入口和来源状态。

右侧内容区：

- `Knowledge Frontier`：当前还缺少的 Observation
- 为什么现有证据不足
- 目标参与者
- 这条观察预计能帮助验证什么
- 参与求证按钮
- 本次求证路径进度

## 5. Agent 调查状态

用户点击“开始求证”后，依次展示：

```text
正在检索知乎社区中的真实经验
正在对照全网资料与外部证据
正在划定已知结论与知识边界
正在寻找适合真人补充的证据缺口
```

当前步骤高亮，已完成步骤显示勾选。失败时保留问题并提供重试，不展示虚假的百分比或精确剩余时间。

## 6. Knowledge State

只使用共享 Contract 中的三个状态：

```text
UNRESOLVED                  尚待求证
EARLY_EVIDENCE              已有早期证据
SUPPORTED_WITH_LIMITATIONS  有限支持
```

展示规则：

- `UNRESOLVED` 使用琥珀色，强调证据仍不足。
- `EARLY_EVIDENCE` 使用蓝色，强调已有具体观察但样本有限。
- `SUPPORTED_WITH_LIMITATIONS` 使用绿色，同时必须展示 Limitations。

禁止把支持显示为普遍真理，把未支持显示为结论错误，或由前端自行计算状态。

## 7. Evidence Gap

必须展示：

- 当前缺少的具体观察
- 为什么搜索结果无法解决它
- 目标参与者
- 需要描述的任务或场景
- 新观察可能影响的 Claim
- Gap 是否适合转换为 Mission

`MISSION_READY` 展示“参与这次求证”；`NEEDS_REFRAMING` 展示原始 Gap、改写原因和改写后的 Gap；`NOT_SUITABLE_FOR_HUMAN_MISSION` 不展示提交按钮，只说明停止原因。

前端只展示后端返回的 Suitability 结果，不自行判断。

## 8. Mission 面板

Mission 使用右侧抽屉，避免用户离开当前 Investigation。

面板包含：

- Mission 标题和目的
- 当前需要补充的 Observation
- 参与资格
- 需要回答的问题
- “记录一次真实经历，不需要写完整答案”的说明
- 30–60 秒完成的体验提示

点击遮罩或关闭按钮退出，关闭后保留 Investigation 状态。提交期间禁止重复提交；成功后关闭面板并滚动到结果区域。

## 9. Evidence 提交表单

目标是收集第一手 Observation，而不是让用户写一篇回答。

字段：

1. 你的身份
2. 发生时间
3. 经历背景
4. 具体是什么任务
5. AI 具体做了什么
6. 你最后负责了什么判断
7. 相关材料（可选）

校验规则：

- 身份、经历背景、任务、AI 作用、人工判断为必填。
- 每个必填文本至少 2 个有效字符。
- Artifact 必须是合法 URL。
- 无效时提交按钮禁用。
- 提交失败时保留已填写内容。

## 10. Evidence 评估结果

提交成功后展示：

- 是否匹配当前 Evidence Gap
- Evidence Grade 和后端返回的评级原因
- 新增 Observation
- Knowledge State 是否变化
- 新增支持的 Claim
- 仍然存在的限制

匹配时显示：

```text
这条观察已进入求证链路
```

未匹配时显示：

```text
这条内容暂未影响当前结论
```

不能把未匹配内容称为“错误答案”。正式 `Impact Receipt` 接口完成前，前端只展示后端返回的评估结果，不伪造 Receipt。

## 11. Knowledge State 更新

有效 Evidence 提交后按顺序展示：

```text
新增 Human Observation
→ Evidence Grade
→ 影响的 Claim
→ UNRESOLVED → EARLY_EVIDENCE
→ 仍未解决的边界
```

状态变化短暂高亮，Evidence 数量从旧值过渡到新值，不使用夸张庆祝动画，并明确说明早期证据不能外推为总体结论。

## 12. 错误与边界状态

### 后端未启动

显示“无法连接求证服务，请确认后端已启动”，提供重试，保留用户输入。

### 使用缓存或 Fixture

正常展示结果，但必须标明“缓存结果”或“演示数据”，不得显示为实时搜索。

### 没有可用 Evidence Gap

显示 Agent 的停止原因，不显示空白区域或“暂无数据”。

### Mission 或 Evidence 请求失败

保留 Investigation 或表单内容，展示后端错误原因并允许重试。

### 页面刷新

保存 Investigation ID，并优先通过详情接口恢复。恢复失败时展示明确提示，不伪造本地数据。

## 13. 响应式布局

桌面端推荐最大内容宽度 `1180px`，左侧内容区自适应，右侧 Frontier 宽度 `320–380px`。Mission 使用右侧抽屉。

窄屏保持相同信息顺序：

```text
问题与状态
→ 公开信息
→ Knowledge Frontier
→ Claims 与限制
→ 来源
```

Mission 抽屉变为全宽面板，表单改为单列，按钮不能溢出或遮挡正文。

## 14. 视觉原则

- 参考知乎的白色内容面、浅灰背景和蓝色主色。
- 信息优先，装饰从简。
- 标题黑色，辅助信息灰色，行动使用知乎蓝。
- 支持使用绿色，限制使用琥珀色，错误使用红色。
- 卡片圆角不超过 8px。
- 不使用普通聊天气泡作为主要内容结构。
- 不使用点赞、评论、排行榜等社区 Feed 视觉隐喻。
- 让用户感到自己在参与公共求证，而不是向模型索要答案。

## 15. 前端边界

前端只负责展示 Investigation、Knowledge State、Gap、限制和评估结果，并收集 Evidence Submission。

前端不得：

- 自行判断 Evidence Grade
- 自行推进 Knowledge State
- 自行改写 Evidence Gap
- 自行生成 Claim 归因
- 直接调用知乎 API
- 伪造 Impact Receipt
- 把缓存或 Fixture 标为实时数据

## 16. Demo 验收标准

Web 端必须能够完成：

```text
输入：AI Coding 实际改变了初级开发者哪些工作？
→ 展示 Agent 调查过程
→ 展示 Knowledge Boundary
→ 展示 Evidence Gap
→ 打开 Mission
→ 提交一条第一手经历
→ 展示 E1 First-hand
→ 展示 UNRESOLVED → EARLY_EVIDENCE
→ 说明当前仍不能外推为总体结论
```
