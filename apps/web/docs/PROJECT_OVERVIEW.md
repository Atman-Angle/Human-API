# Human Gateway 项目功能说明

## 项目是什么

Human Gateway 是建立在知乎内容与真人社区之上的 Agent 求证工具。

它不直接生成一个看似完整的答案，而是持续判断：

- 当前已经知道什么；
- 哪些结论仍有争议或证据不足；
- 还缺少哪类真人第一手观察；
- 新提交的证据改变了什么。

## 核心流程

```text
用户提出问题
→ Agent 搜索知乎与全网内容
→ 整理已有结论、争议和限制
→ 识别 Evidence Gap
→ 将合适的 Gap 转换为 Mission
→ 符合条件的用户提交真实经历或 Artifact
→ 系统校验并评级 Evidence
→ Agent 重新评估 Knowledge State
→ 告诉贡献者其证据产生的影响和仍缺少的信息
```

## 前端功能

1. **Investigation**：展示问题、当前状态、已有结论、争议和局限。
2. **Knowledge Frontier**：明确展示当前缺少的观察、目标参与者和预期价值。
3. **Mission**：让合适的用户参与轻量求证任务并提交第一手经历。
4. **Evidence Result**：展示证据是否被接受、证据等级及原因。
5. **Knowledge State Update**：展示新增证据带来的状态变化。
6. **Impact Receipt**：说明该贡献影响了哪个结论，以及下一步还缺什么。

## Golden Case

> AI Coding 实际改变了初级开发者哪些工作？

系统识别仍未解决的证据缺口，邀请学生、实习生或 0–3 年开发者提交真实工作经历，再根据这些观察更新结论。

## 产品边界

本轮不做普通问答社区、内容 Feed、点赞评论、排行榜、积分体系、专家市场或完整用户系统。

前端只负责展示后端结果和收集用户输入，不自行判断 Evidence Grade、Evidence Gap 或 Knowledge State。
