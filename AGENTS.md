# AGENTS.md

## 1. 本文件的作用

这是本项目所有 AI 编程 Agent（Codex / Claude Code / 其他 Coding Agent）必须遵守的项目级开发规则。

本项目是 48 小时黑客松项目，优先级如下：

1. Golden Demo 始终可运行。
2. 不破坏现有 Contract。
3. 不创造重复实现。
4. 只修改完成当前任务所必需的范围。
5. `main` 始终保持可构建、可演示。
6. 不做与当前任务无关的大重构。

开始修改代码前，必须先阅读：

- `docs/PROJECT_LOCK.md`
- `docs/ARCHITECTURE.md`
- `docs/API_CONTRACT.md`
- `TASKS.md`
- `CONTRIBUTING.md`

---

## 2. 唯一事实源

以下内容只能有一个权威来源：

| 内容                     | 唯一事实源             |
| ------------------------ | ---------------------- |
| 项目范围 / Non-Goals     | `docs/PROJECT_LOCK.md` |
| 模块边界                 | `docs/ARCHITECTURE.md` |
| 共享 DTO / Enum / Schema | `packages/contracts`   |
| 接口说明                 | `docs/API_CONTRACT.md` |
| 当前任务 Owner           | `TASKS.md`             |
| 协作与合并规则           | `CONTRIBUTING.md`      |

禁止为同一概念创建第二套事实源。

---

## 3. Product Authority

Human Gateway 不是一次性求证工具，而是建立在知乎已有问题、话题、内容和用户网络之上的 Agent 驱动求证子社区。

所有开发必须服务于：

```text
Investigation
→ Frontier
→ Mission
→ Participation
→ Evidence
→ Re-evaluation
→ Impact
```

如果一个功能不能解释它服务于这条链中的哪一步，默认不要新增。普通问答、通用 Feed、点赞、评论、排行榜、积分经济不属于当前产品范围。

---

## 4. Community Architecture

创建以下对象前必须全仓搜索：

- Investigation
- Claim
- KnowledgeState
- EvidenceGap
- Mission
- Evidence
- ImpactReceipt
- Repository
- Service
- DTO

必须先检查：

1. `packages/contracts` 是否已有共享定义；
2. 是否已有同名或相近职责实现；
3. 是否已有唯一 Authority；
4. 是否应扩展已有实现。

禁止创建第二套同职责实现。Community 负责 Mission Lifecycle、Participation、Evidence Intake 与 Impact Receipt，但不得重新实现 Evidence Grade 或 Agent Re-evaluation。

---

## 5. Shared Contract

Frontend / Backend 都不得创建并行 DTO。

所有 shared language、DTO、Enum、Schema、Status 与 API Projection 必须来自：

```text
packages/contracts
```

如果接口或共享数据结构需要变化：

1. 先改 `packages/contracts`
2. 再更新 `docs/API_CONTRACT.md`
3. 再改 backend / application orchestration
4. 再改 frontend
5. 再改测试

---

## 6. 创建新实现前必须搜索

在新增以下任何内容之前：

- Type
- Interface
- Enum
- Schema
- Service
- Repository
- Adapter
- Manager
- Store
- Utility
- Helper
- State
- API DTO
- 业务函数

必须先完成第 4 节的全仓搜索，并确认目标模块与 Authority。

默认原则：

> 能复用，不新建；能扩展，不并行；同一个业务概念只能有一个 Authority。

---

## 7. 模块边界

目标目录：

```text
apps/
  web/
  api/

packages/
  contracts/
  agent/
  evidence/
  community/       # logical authority，物理 package 可后置
  persistence/     # logical authority，物理 package 可后置

docs/
```

`packages/community` 和 `packages/persistence` 不要求现在立即物理创建，但职责与 Authority 必须先明确。

### `apps/web`

负责：

- Investigation / Frontier / Mission / Evidence / Impact Receipt 展示
- 用户交互
- 调用后端 API

禁止：

- Agent 决策
- Evidence Grade
- Knowledge State 推进
- 重复定义 API DTO
- 直接调用知乎 API

### `apps/api`

负责：

- HTTP 接口
- 参数校验
- Application Orchestration
- 调用 domain/package
- 外部 API Adapter
- 错误映射

禁止：

- 大段业务规则
- 在 route 中长期直接修改领域 Aggregate
- UI 逻辑
- 重新定义 shared types

### `packages/contracts`

负责：

- DTO
- Enum
- Schema
- 状态定义
- 前后端共享类型

这是共享 Contract 唯一 Authority。

### `packages/agent`

负责：

- Investigation Decision
- Evidence State
- Knowledge State
- Knowledge Frontier
- Evidence Gap
- Gap Suitability
- Mission Planning
- Re-evaluation
- Next Action / Stop / Continue

### `packages/evidence`

负责：

- Evidence 校验
- Evidence Grade
- First-hand 判断
- Gap Match
- Artifact 可信度辅助
- 去重
- 相关性判断
- 聚合
- Limitations

### Community Authority

负责 Mission Lifecycle、Participation、Evidence Intake 与 Impact Receipt。

### Persistence Authority

负责 DB、Cache、Durable Storage 和 Aggregate 读写；不得决定 Knowledge State、Evidence Grade 或 Gap Suitability。

---

## 8. 当前核心状态

Knowledge State：

```text
UNRESOLVED
EARLY_EVIDENCE
SUPPORTED_WITH_LIMITATIONS
```

Evidence Grade：

```text
E0_OPINION
E1_FIRST_HAND
E2_ARTIFACT_BACKED
```

必须从 `packages/contracts` 导入。

禁止在业务代码里直接写魔法字符串。

`OPEN / CLOSED` Mission 生命周期属于已确认目标，在当前代码实现前不得假装已经存在。

---

## 9. 修改代码前的固定流程

每次收到任务：

### Step 1：确认 Task

先查看 `TASKS.md`：

- Task ID
- Owner
- Allowed paths
- Must not modify

如果任务没有 Owner，先不要开发。

### Step 2：搜索已有实现

必须搜索：

- 相关类型
- 相关函数
- 相关 service
- 相关状态
- 相关 API

### Step 3：确认 Authority

明确这次改动应该属于哪个模块。

### Step 4：先 Contract，后实现

按第 5 节顺序执行。

### Step 5：最小修改

只修改完成当前 Task 必需文件。

禁止顺手：

- 重构整个目录
- 改无关命名
- 替换框架
- 引入新状态系统
- 建立第二套抽象

---

## 10. 修改完成后的固定流程

完成后必须：

1. 执行 `npm run verify`
2. 确认 Golden Demo 未被破坏
3. 总结：
   - 改了什么
   - 修改了哪些文件
   - 是否改变 Contract
   - 跑了哪些测试
   - 还有什么风险
4. 明确说明：
   - 是否新增 Type / Service / Adapter / State
   - 是否做过全仓重复检查

---

## 11. 错误处理

禁止静默吞错。

外部 API 错误至少区分：

- timeout
- rate limit
- invalid response
- upstream unavailable

Golden Demo fallback：

```text
LIVE
↓
CACHE
↓
GOLDEN FIXTURE
```

缓存和 Fixture 不得伪装成实时数据。

---

## 12. 日志规范

日志应包含必要上下文：

- `requestId`
- `questionId`
- `missionId`
- `evidenceRecordId`
- 当前 Agent action

禁止残留：

```text
console.log("here")
console.log("123")
console.log("test")
```

---

## 13. 测试优先级

P0 测试：

- Evidence State 状态变化
- Evidence Grade
- Contract 校验
- Agent stop / continue
- Gap Suitability
- Golden Demo 主链路

不要求在黑客松阶段追求完整 UI 单测覆盖率。

---

## 14. 默认禁止的改动

未经明确批准，不得引入：

- Multi-Agent
- Agent-to-Agent
- Digital Twin
- Long-term Memory
- Reputation / Ranking
- Expert Marketplace
- Knowledge Graph
- 完整社交图谱
- 点赞 / 评论 / 积分经济
- Full Auth System
- 大规模框架迁移
- 第二套状态管理
- 第二套 Contract
- 与 Task 无关的大重构

---

## 15. Definition of Done

任务不是“代码写完”就完成。

必须同时满足：

- 行为正确
- 没有重复 Authority
- Contract 正确
- `npm run verify` 通过
- Golden Demo 仍可运行
- 改动符合 `docs/PROJECT_LOCK.md`
