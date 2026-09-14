# Human Gateway v3 Golden Demo

## 状态（2026-09-14）

CONTINUE：保留原有未提交的 projection、receipt 和 SPEC 改动，接续用户叙事与对话闭环。Owner 对应 A09/A10、B01–B07、C06；跨 Owner review 待完成，未提交或合并。

Knowledge Object 是已有 Investigation 的只读 projection，不是第二个 Aggregate。对话只摘录用户原话，不决定 Grade、归因、Gap Match 或 Knowledge State。最终确认摘要复用现有 intake、Evidence 与 Agent Authority。

## 启动

在仓库根目录的两个 PowerShell 终端分别运行 npm run dev:api 和 npm run dev:web。默认 API 为 3000，首页为 http://localhost:3001。旧同端口 API 需由操作者先停止并重启，否则不会加载新路由。

隔离运行：API 终端设置 $env:PORT='3100' 后启动；web 终端设置 $env:NEXT_PUBLIC_API_BASE_URL='http://localhost:3100' 后运行 npm run build:web，再运行 node node_modules/next/dist/bin/next start apps/web --port 3101。公开 API 地址在构建时注入，改变地址需重建。

确定性离线演示可在 API 终端将 ZHIHU_ACCESS_SECRET 与 LLM_API_KEY 设置为空字符串。来源使用已有 LIVE → CACHE → GOLDEN_FIXTURE 降级，以实际响应 provenance 为准；不能把快照称为实时检索。

## 3–5 分钟演示

1. **0:00–0:30 首页**：公开讨论已经存在，Agent 整理共识、分歧与未知，真实经历帮助补充边界。点击主题入口。
2. **0:30–1:10 详情**：先看公开人类讨论及来源，再看“大家比较一致 / 仍有分歧 / 还不知道”。技术字段默认折叠。
3. **1:10–2:20 邀请**：打开对话，自然回答。稳定演示可展开“演示者工具”使用 accepted 样例。提交首段，回答关键追问，查看摘要并确认；确认前可编辑或取消，取消不写入 Evidence。
4. **2:20–2:50 回执**：展示已采纳，知识状态转为早期证据，但不是结论已被证明。
5. **2:50–3:40 对照**：使用 rejected 样例展示只有观点的拒绝；使用 unchanged 样例展示采纳但状态不变。
6. **3:40–4:30 刷新**：贡献、回执和知识状态保留；技术详情仅用于补充解释。

样例唯一文件：fixtures/golden-case/conversation-samples.json。均为合成输入，非真实用户投稿；UI 和 demoSample 字段明确区分。新 API 进程按下表顺序运行：

| 输入      | 服务端结果               | 知识状态                    |
| --------- | ------------------------ | --------------------------- |
| accepted  | accepted / E1_FIRST_HAND | UNRESOLVED → EARLY_EVIDENCE |
| rejected  | rejected / E0_OPINION    | EARLY_EVIDENCE 不变         |
| unchanged | accepted / E1_FIRST_HAND | EARLY_EVIDENCE 不变         |

当前默认 SQLite repository 保证浏览器刷新和 API 重启后仍能读取相同数据；首次启动会从旧 `.data/investigations.json` 自动迁移到 `.data/investigations.sqlite`，并保留原 JSON。测试或兼容场景仍可显式使用内存 repository 或 JSON repository。

## 验证与边界

- npm run verify：format、lint、typecheck、72 个测试及 API/Next production build 通过，无跳过测试。
- 新增覆盖并发准备主题、三类回执、刷新一致、摘要改写、取消不落库、必须确认、最多两次追问、无效/关闭邀请、客户端不能覆盖 grading/attribution。
- 隔离 API 3100 实际 HTTP 验证三类输入，读取 3 条 Evidence / 3 条 Receipt，最终 EARLY_EVIDENCE。本次来源实际为 GOLDEN_FIXTURE。
- 前端 HTTP 和构建检查不等于浏览器验收。浏览器工具返回 unsupported Codex auth method: apikey，桌面/移动交互 UAT 未完成；30 秒理解目标仍需真人观察。
- 对话明确标记 EXTRACTIVE_RULES，不是实时 LLM。关键词摘录覆盖有限，未识别的真实经历可能被拒绝；规则评估不等于现实真实性验证。
- 实时知乎、实时 LLM、真实参与者研究未验证，不能宣称 BACKEND_SPEC 的全部实时 LLM 目标完成。
- 全仓重复检查未发现新增第二套领域 Authority。新增共享请求/响应 Schema 只在 packages/contracts；新增 conversation 应用函数与 UI 组件，没有新领域 Service/Adapter/State。

## 产品接续：依据与邀请

详情页直接展开已有 Claim 内容与 rationale，并可查阅关联来源摘要和 Evidence 原文；首页/详情的共识优先使用已有 supported Claim，而不是检索数量说明。邀请展示其 Gap 的 whyUnresolved、missingObservation、expectedValue。没有另造事实或前端归因。

规则追问每次最多询问两个缺失上下文，先问具体事件和检查，再问背景与身份。新增测试覆盖非预设回答下的问题优先级与已知信息不再询问。仍不能声称具备自由语义访谈，具体争议自动提炼尚未实现。
