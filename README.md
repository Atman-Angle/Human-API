# 群知｜Human Gateway

> **让社区知道：我们现在究竟知道什么，还缺什么，以及下一步应该向谁求证。**

群知是建立在知乎已有问题、回答、评论和真实经历之上的 **AI-native 知识社区原型**。它不追求再生成一个更长的答案，而是持续维护一个问题的知识状态：整理已有讨论，识别共识、分歧、限制与未知；当公开资料无法可靠解决关键缺口时，把缺口转化为具体求证任务，邀请有相关经历的人提交第一手观察，再通过证据分级、缺口匹配和局部重新评估，解释知识状态是否发生变化。

群知不是新的聊天机器人，也不是独立重做知乎。它在知乎已有内容与用户网络之上增加一层 **Knowledge Layer**，让问题能够随着现实变化持续被维护。

## 产品闭环

```text
知乎问题 / 回答 / 公开资料
          ↓
整理当前认识、分歧、限制与未知
          ↓
识别 Evidence Gap
          ↓
判断：继续搜索，还是需要真人补充
          ↓
Mission：具体求证任务
          ↓
用户提交第一手 Observation
          ↓
Evidence Grade / Gap Match / Attribution
          ↓
局部 Re-evaluation
          ↓
Knowledge State 更新或保持
          ↓
Impact Receipt：解释这段经历改变了什么
```

### Golden Loop

1. 进入一个 Knowledge Object
2. 查看当前已经知道什么
3. 查看当前还缺什么
4. 参与一个 Mission
5. 提交自己的真实经历
6. Agent 重新评估
7. 查看 Knowledge State 是否变化
8. 收到 Impact Receipt
9. 进入下一轮 Knowledge Frontier

## 核心 Golden Case

> **AI Coding 实际改变了初级开发者哪些工作？**

核心 Evidence Gap：

> 最近持续使用 AI Coding 的学生、实习生或 0–3 年开发者，哪些过去主要由自己完成的任务，现在主要交给 AI？人仍在哪一步承担最终判断？

这个案例用于验证：系统能否从已有讨论中提炼当前认识，暴露仍然重要的缺口，邀请真实经历进入，并解释新证据对具体判断产生的影响。

## 核心概念

| 概念 | 说明 |
| --- | --- |
| **Investigation** | 对一个问题进行持续知识追踪的单元 |
| **Knowledge State** | `UNRESOLVED` → `EARLY_EVIDENCE` → `SUPPORTED_WITH_LIMITATIONS` |
| **Knowledge Frontier** | 当前已知内容、限制条件与仍待解决的缺口 |
| **Evidence Gap** | 当前认识与足够判断之间的具体缺口 |
| **Gap Suitability** | `MISSION_READY` / `NEEDS_REFRAMING` / `NOT_SUITABLE_FOR_HUMAN_MISSION` |
| **Mission** | 针对明确 Evidence Gap 的结构化求证请求 |
| **Evidence Grade** | `E0_OPINION` / `E1_FIRST_HAND` / `E2_ARTIFACT_BACKED` |
| **Impact Receipt** | 告知贡献者其 Observation 改变了什么、没有证明什么、还缺什么 |

## 当前 Prototype 已验证

- Investigation 与 Knowledge Frontier 展示
- 知乎搜索 / 公开内容整理
- Gap Suitability Gate
- Mission Feed、Mission Detail 与 Evidence Submission
- Evidence Grade、Gap Match 与局部 Re-evaluation
- Knowledge State 更新或保持
- Impact Receipt 与 Community Projection
- `LIVE → CACHE → GOLDEN_FIXTURE` 三层降级机制
- Golden Demo 主链路：问题 → 缺口 → 求证 → 经历 → 更新 → 回执

> 当前版本是可演示的 vertical slice，不宣称已经完成大规模真人社区运营、自动用户匹配、完整知乎授权链路或长期用户研究。`Multi-Agent / A2A`、Knowledge Graph、Long-term Memory、完整社交图谱等也不属于当前已完成能力。

## 架构原则

- **Agent owns decisions**：Agent 负责 Knowledge State、Frontier、Evidence Gap 与 Re-evaluation。
- **Community owns participation**：Community 负责 Mission Lifecycle、Evidence Intake 与 Impact Receipt。
- **Evidence owns credibility**：Evidence 模块负责校验、分级、可信度与相关性辅助判断。
- **Contracts own shared language**：共享 DTO、Enum、Schema 统一来自 `packages/contracts`。
- **UI only projects authority**：前端展示后端结果，不自行判定 Knowledge State 或 Evidence Grade。

## 技术栈与目录

- **Frontend**：Next.js、React、TypeScript
- **Backend**：Node.js HTTP Server、TypeScript
- **Shared Contracts**：`packages/contracts`
- **Agent Orchestration**：`packages/agent`
- **Evidence Validation**：`packages/evidence`
- **Data Source**：知乎公开内容与社区提交的第一手 Observation

```text
apps/
├── web/                  # Next.js 前端
└── api/                  # HTTP API、Application Orchestration、外部 Adapter
packages/
├── contracts/            # DTO、Enum、Schema 的唯一共享 Authority
├── agent/                # Investigation、Gap、Knowledge State、Re-evaluation
└── evidence/             # Evidence 校验、分级、匹配与聚合
fixtures/                 # Golden Demo 与测试数据
docs/                     # 项目范围、架构、API Contract
tests/                    # 自动化测试
```

## 快速开始

### 前置要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```powershell
npm install
```

### 启动开发环境

在两个终端分别运行：

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

默认地址：

- Web：`http://localhost:3001`
- API：`http://localhost:3000`

### 准备 Golden Demo

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/demo/reset
Invoke-RestMethod -Method Post http://localhost:3000/api/demo/prepare
```

### 完整验证

```powershell
npm run verify
```

`npm run verify` 会执行格式检查、Lint、TypeScript 类型检查、测试和构建。提交前必须通过该命令，并确认 Golden Demo 主链路仍可运行。

## 测试重点

- Evidence State 状态变化
- Evidence Grade 与 First-hand 判断
- Shared Contract 校验
- Agent stop / continue 决策
- Gap Suitability
- Golden Demo E2E 主链路

## 开发约定

> 一个业务概念只能有一个 Authority。创建新 Type、Service、Repository、State 或 DTO 前必须先全仓搜索。

> Frontend / Backend 不得创建并行 DTO；共享语言必须先修改 `packages/contracts`，再同步 API、实现和测试。

详细规则：

- [项目范围与 Non-Goals](./docs/PROJECT_LOCK.md)
- [模块边界与架构原则](./docs/ARCHITECTURE.md)
- [API Contract](./docs/API_CONTRACT.md)
- [当前任务与 Owner](./TASKS.md)
- [协作与合并规则](./CONTRIBUTING.md)

## 项目愿景

传统社区记录“谁说过什么”。群知希望进一步探索：关于一个重要问题，我们现在究竟知道什么，还不知道什么，下一步应该向谁求证。

当 AI 不只是参与内容生产，而是帮助社区理解自身知识边界、组织求证并解释知识变化时，社区就可能从内容平台逐渐成为一个由人和 Agent 共同维护、持续被现实修正的知识网络。

## License

MIT
