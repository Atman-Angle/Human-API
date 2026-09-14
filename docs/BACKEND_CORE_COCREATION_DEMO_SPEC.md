# Human Gateway 后端核心共创 Demo 开发 Spec

**文档版本：** v2.0  
**日期：** 2026-09-15  
**状态：** 核心闭环已跑通，正在进行 Frontend UI 清理与端到端验收

---

## 1. 当前实现状态总览

所有后端核心 API 已实现并经过端到端验证：

| 核心流程                                             | 状态    | 备注                                                       |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------- |
| POST /api/chat/route (三路由)                        | ✅ 完成 | MATCHED_INVESTIGATION / CREATE_PUBLIC_POST / DIRECT_ANSWER |
| POST /api/proposals → Confirm → Investigation        | ✅ 完成 | Proposal 创建 + 确认后 LLM 生成文章                        |
| 真实 LLM 初始文章生成                                | ✅ 完成 | 使用 DiscussionOrganizer + 中文 Prompt + 自动 Schema 修复  |
| GET /api/knowledge-objects/:id                       | ✅ 完成 | 返回完整 Claims / Gaps / Sources / ImpactReceipts          |
| POST /api/demo/prepare                               | ✅ 完成 | 创建 Mission 并生成 Conversation Draft                     |
| POST /api/missions/:id/conversation                  | ✅ 完成 | 多轮对话 + Observation 提交                                |
| POST /api/missions/:id/evidence (confirmObservation) | ✅ 完成 | Evidence Grade → Re-evaluation → Impact Receipt            |
| GET /api/activity-events                             | ✅ 完成 | 活动事件流                                                 |
| GET /api/discovery/topics                            | ✅ 完成 | 发现页帖子列表                                             |
| 数据库持久化                                         | ✅ 完成 | node:sqlite → .data/investigations.sqlite (WAL 模式)       |
| Frontend API 代理                                    | ✅ 完成 | next.config.ts rewrites → localhost:3001                   |
| Mock/假数据清理                                      | ✅ 完成 | community-ui.tsx / investigation-client.tsx                |

---

## 2. 服务架构

### 2.1 端口分配

| 服务                          | 端口 | 启动方式 |
| ----------------------------- | ---- | -------- |
| Backend (Fastify + tsx)       | 3001 |
| px tsx apps/api/src/server.ts |
| Frontend (Next.js 16)         | 3000 |
| px next dev -p 3000           |

### 2.2 API 代理

前端通过
ext.config.ts 的 sync rewrites() 将 /api/:path* 代理到 localhost:3001，避免跨域问题。

### 2.3 数据库

- 使用
  ode:sqlite（SQLite WAL 模式）
- 数据库文件：.data/investigations.sqlite
- 表结构：
  epository_records（键值存储，序列化 JSON）
- 支持持久化：重启后数据仍在

---

## 3. LLM 文章生成

### 3.1 当前实现

- 文件：pps/api/src/llm/discussion-organizer.ts
- 模型：qwen-max（可通过 .env 配置）
- 超时：90 秒
- System Prompt：中文，含完整 JSON 输出示例

### 3.2 自动修复机制

LLM 输出经过以下后处理：

1. **Markdown 代码块剥离**：移除 \\\json ... \\\ 包裹
2. **Schema 自动修复**：
   - sourceRefIds / videnceIds / argetParticipants 从 string → array 转换
   - 缺失的 gaps / limitations /
     elations 补充默认空值
   - 中文标点修复
3. **Provenance 标记**：LIVE / CACHE / GOLDEN_FIXTURE

### 3.3 生成内容示例

一次典型调用生成：

- 4 个 Claims（含 2 个 LLM 生成的真实 Claim）
- 1 个 Evidence Gap
- 20 个公开来源
- 完整的 consensus / disagreements / unknowns 分类
- Limitations 列表

---

## 4. API 接口清单

### 4.1 核心接口

| 方法 | 路径                           | 状态 | 说明                                         |
| ---- | ------------------------------ | ---- | -------------------------------------------- |
| POST | /api/chat/route                | ✅   | 问题路由：匹配帖子 / 创建帖子 / 直接回答     |
| POST | /api/proposals                 | ✅   | 创建 Proposal（用户确认前）                  |
| POST | /api/proposals/:id/confirm     | ✅   | 确认 Proposal → 创建 Investigation           |
| POST | /api/investigations            | ✅   | 直接创建 Investigation（含 LLM 生成）        |
| GET  | /api/investigations            | ✅   | 列表（含 evidenceCount / missionCount）      |
| GET  | /api/investigations/:id        | ✅   | 单个 Investigation 详情                      |
| GET  | /api/knowledge-objects/:id     | ✅   | 完整知识投影（Claims/Gaps/Sources/Receipts） |
| POST | /api/demo/prepare              | ✅   | 准备 Demo：创建 Mission                      |
| POST | /api/missions/:id/conversation | ✅   | 多轮对话（draft → advance → confirm）        |
| POST | /api/missions/:id/evidence     | ✅   | 提交 Evidence → Grade → Re-eval → Receipt    |
| GET  | /api/activity-events           | ✅   | 活动事件流                                   |
| GET  | /api/discovery/topics          | ✅   | 发现页帖子卡片                               |
| POST | /api/demo/reset                | ❌   | 待实现                                       |

---

## 5. 端到端流程验证

已验证的全流程（使用真实 API）：

`

1. POST /api/investigations → 创建 Investigation ✅
2. GET /api/knowledge-objects/:id → 4 Claims, 1 Gap, 20 Sources ✅
3. POST /api/chat/route → MATCHED_INVESTIGATION / DIRECT_ANSWER ✅
4. POST /api/proposals + POST confirm → LIVE LLM 创建 Investigation ✅
5. POST /api/demo/prepare → 创建 Mission ✅
6. POST /api/missions/:id/conversation → follow-up ✅
7. POST /api/missions/:id/evidence → E0_OPINION, Impact Receipt ✅
8. GET /api/activity-events → 活动事件 ✅
9. GET /api/discovery/topics → 发现页 ✅
10. 数据库重启后数据仍在 ✅
    `

---

## 6. 环境变量

在 pps/api/.env 中配置：

`nv
LLM_MODEL=qwen-max
LLM_TIMEOUT_MS=90000
ZHIHU_ACCESS_TOKEN=your_token
ZHIHU_ACCESS_SECRET=your_secret
`

---

## 7. Definition of Done 进度

### 7.1 已完成 ✅

- [x] Investigation 被作为共性问题帖子使用
- [x] 对话框支持已有帖子 / 创建公共帖子 / 普通回答三路由
- [x] 已有相关帖子时不会重复创建
- [x] 复杂公共问题可以创建新帖子
- [x] 创建后真实 LLM 根据已有资料生成初始文章
- [x] Evidence Gap 能生成 Mission
- [x] 圈子广场可以读取帖子列表
- [x] 帖子详情可以读取完整文章投影
- [x] 用户讨论会进入统一帖子讨论流程
- [x] Agent 会区分观点、Claim、Observation、反例和限制
- [x] Evidence 经过现有 Evidence Authority 判断
- [x] Evidence 能触发现有 Agent Re-evaluation
- [x] 新 Evidence 能更新文章状态和边界
- [x] Impact Receipt 能说明贡献改变了什么
- [x] 状态通过 SQLite Repository 持久化
- [x] 没有新增重复 Contract、Evidence Grade 或 Knowledge State Authority

### 7.2 待完成 🔲

- [ ] Agent 能从文章探索现实边界（MaintenanceRun 扩展）
- [ ] 更新历史可以读取完整版本链
- [ ] Demo 可以 Reset 并重复运行
- [ ] npm run verify 通过（需修复 ESLint 警告）

---

## 8. 已知问题

1. **ESLint warning**: pps/web/lib/api-client.ts 中 MissionInvitation 定义了但未使用
2. **mock-data.ts 残留**: pps/web/app/page.tsx 仍导入 @/lib/mock-data，首页部分展示使用 mock 数据
3. **Demo Reset**: POST /api/demo/reset 接口尚未实现
4. **前端缓存**: 修改后需删除 .next/ 缓存确保重新编译
5. **npm run verify**: 尚未完整通过（部分 ESLint 警告）

---

## 9. 下一步工作

### 短期（UI 优化）

1. 清理 page.tsx 中剩余的 mock 数据引用
2. 优化 Investigation 页面 UI 交互（用户标注反馈）
3. 修复 ESLint 警告

### 中期（功能完善）

4. 实现 POST /api/demo/reset
5. 扩展 MaintenanceRun 做现实边界探索
6. 实现更新历史版本链读取

### 长期

7. 补充单元测试（P0 级别的测试用例）
8. 知乎登录接入
9. 生产级部署
