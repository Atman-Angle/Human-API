# Human Gateway — 人类网关

> **AI-native 知识社区：在知乎生态之上，用 Agent 驱动 Investigation → Evidence → Knowledge State 的持续知识演化。**

Human Gateway 不是一个独立问答社区。它建立在知乎已有问题、话题、内容和用户网络之上，保留知乎式的提问、回答与讨论，但以 **Knowledge Object** 而不是帖子作为长期知识组织单位。

Agent 的职责不是生成更多普通答案，而是持续维护问题的 **Knowledge Frontier**——发现已知、标记缺口、发起 Mission、接收 Evidence、更新 Knowledge State，并向贡献者交付 **Impact Receipt**。

---

## 产品理念

### Golden Loop

`进入一个 Knowledge Object
  ↓
看到目前已知什么
  ↓
看到当前还缺什么
  ↓
参与一个 Mission
  ↓
提交自己的真实经历
  ↓
Agent Re-evaluate
  ↓
看到 Knowledge State 改变
  ↓
收到 Impact Receipt
  ↓
进入 Next Frontier`

### 五条架构原则

| 原则                              | 含义                                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| **Agent owns decisions**          | Agent 维护 Knowledge State、Frontier、Evidence Gap、Re-evaluation |
| **Community owns participation**  | 社区负责 Mission Lifecycle、Evidence Intake、Impact Receipt       |
| **Evidence owns credibility**     | Evidence Authority 负责校验、分级、可信度判断                     |
| **Contracts own shared language** | DTO、Enum、Schema 只能来自 packages/contracts                     |
| **UI only projects authority**    | 前端不得自行判决 Knowledge State 或 Evidence Grade                |

---

## 核心概念

| 概念                   | 说明                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| **Investigation**      | 对一个问题的持续知识追踪单元                                     |
| **Knowledge State**    | UNRESOLVED → EARLY_EVIDENCE → SUPPORTED_WITH_LIMITATIONS         |
| **Knowledge Frontier** | 当前已知什么 + 还缺什么                                          |
| **Evidence Gap**       | 已知内容与足够判断之间的缺口                                     |
| **Gap Suitability**    | MISSION_READY / NEEDS_REFRAMING / NOT_SUITABLE_FOR_HUMAN_MISSION |
| **Mission**            | 针对明确 Evidence Gap 的结构化参与请求                           |
| **Evidence Grade**     | E0_OPINION / E1_FIRST_HAND / E2_ARTIFACT_BACKED                  |
| **Impact Receipt**     | 告知贡献者其 Observation 改变了什么、仍然缺什么                  |

---

## Golden Case

> **AI Coding 实际改变了初级开发者哪些工作？**

核心 Gap：

> 最近持续使用 AI Coding 的学生、实习生或 0–3 年开发者，哪些过去主要由自己完成的任务，现在主要交给 AI？人仍在哪一步承担最终判断？

---

## 技术栈

| 层                    | 技术                                            |
| --------------------- | ----------------------------------------------- |
| **Frontend**          | Next.js (React, TypeScript)                     |
| **Backend API**       | Node.js HTTP Server (TypeScript)                |
| **Shared Contracts**  | packages/contracts — 共享 DTO、Enum、Schema     |
| **LLM Orchestration** | Agent 驱动的 Investigation & Re-evaluation 链路 |
| **Data Source**       | 知乎公开内容 + 社区提交的第一手 Observation     |

### 项目结构

`human-api-evidence-agent/
├── apps/
│   ├── web/          # Next.js 前端
│   └── api/          # Node.js 后端 API
├── packages/
│   └── contracts/    # 共享类型、DTO、Enum
├── docs/             # 项目文档
│   ├── PROJECT_LOCK.md
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   └── ...
├── fixtures/         # 测试 Fixture
└── scripts/          # 工具脚本`

---

## 快速开始

### 前置要求

- Node.js >= 18
- npm >= 9

### 安装

`ash
npm install
`

### 开发

`ash

# 启动后端 API

npm run dev --workspace=apps/api

# 启动前端（另一个终端）

npm run dev --workspace=apps/web
`

前端默认运行在 http://localhost:3001，API 默认运行在 http://localhost:3002。

### 验证

`ash
npm run verify
`

---

## Agent 决策链路

`Question
  → Investigation
    → Candidate Evidence Gap
      → Gap Suitability Gate
        → MISSION_READY | NEEDS_REFRAMING | NOT_SUITABLE_FOR_HUMAN_MISSION
          → OPEN Mission or Stop
            → Human Evidence
              → Evidence Grade / Gap Match
                → Re-evaluation
                  → Knowledge State`

### Fallback 策略

`LIVE → CACHE → GOLDEN_FIXTURE`

缓存和 Fixture 不得伪装成实时数据。

---

## 测试

- Goldon Demo E2E 主链路测试
- Evidence State 状态变化测试
- Evidence Grade 测试
- Contract 校验测试
- Agent stop/continue 决策测试
- Gap Suitability 测试

`ash
npm run verify
`

---

## 项目状态

当前实现是一个已经具备最小 Investigation Aggregate 的 **vertical slice**，能在 Golden Demo 中演示从 Question 到 Evidence Re-evaluation 的完整链路。

### P0（当前实现）

- Investigation / Knowledge State / Knowledge Frontier
- Gap Suitability / Mission
- Evidence Submission / Evidence Grade
- Re-evaluation / Impact Receipt
- Mission Feed & Community Projection

### P1（可扩展）

- Follow Investigation
- Evidence Timeline

---

## 开发约定

> **一个业务概念只能有一个 Authority。**

> **一个 Task 只能有一个 Owner。**

> **创建新东西之前必须先全仓搜索已有实现。**

详细规则见：

- [PROJECT_LOCK.md](./docs/PROJECT_LOCK.md) — 项目范围与 Non-Goals
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 模块边界与架构原则
- [API_CONTRACT.md](./docs/API_CONTRACT.md) — 接口契约
- [TASKS.md](./TASKS.md) — 当前任务
- [CONTRIBUTING.md](./CONTRIBUTING.md) — 协作与合并规则

---

## License

MIT
