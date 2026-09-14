# 知乎优先的后端优化与前端整合方案

日期：2026-09-14。设计任务：C08，Owner：C。能力证据与限制继承 `docs/ZHIHU_API_CAPABILITY_MATRIX.md`，本文件不重复维护官方接口目录。

## 1. 目标与决策

交付一个只有两个入口、由 Agent 统一维护的闭环：

```text
入口一：ChatGPT 式对话入口
→ 用户提出研究主题/问题
→ Agent 自主决定搜索、问题推荐、热榜、回答摘要、全网检索和是否需要 Mission
→ Investigation / Knowledge Object
→ Knowledge Frontier / Evidence Gap
→ Mission / Evidence / Re-evaluation / Impact Receipt

入口二：圈子广场帖子入口
→ 用户进入一个由 Agent 维护的帖子/Knowledge Object
→ 在帖子内与 Agent 对话、讨论或贡献 Mission
→ Agent 维护 Claims、冲突、Evidence Gap、Mission 生命周期和内容摘要
→ 用户提交 Observation
→ Evidence 分级 / Re-evaluation / Impact Receipt
```

知乎官方 API 是 Agent 的外部信息与用户上下文工具，不直接暴露成三个并列的产品入口。Agent 根据当前问题和上下文按需调用知乎搜索、热榜、问题回答摘要、用户数据等能力。

**目标是不再依赖阿里云模型 API；当前尚未验证可以移除。** 代码把通用 LLM Organizer 装配为讨论整理能力，当前本地配置指向阿里云兼容接口。知乎直答若通过同一输出契约、质量和异常测试，即可成为默认供应商。移除的是供应商依赖，不是 Organizer、Agent 或 Evidence Authority。

阿里云退出门槛未过时不得偷偷继续调用阿里云或让 Fake 输出冒充成功。保留旧配置作显式回退选项，是否启用必须可见；知乎-only 演示模式一律不调用它。成功迁移后无需阿里云凭证即可启动并完成 LIVE 闭环，但不删除、撤销或回显用户现有密钥。

本轮为方案交付，不宣称后端替换、前端整合或 E2E 已完成。实施主模式应为 EXPLORE：直答结构化能力是实质性未知，先验证再扩大改动。

## 2. 当前仓库证据与必须先解决的问题

| 现状                                                                        | 代码依据                                                | 对方案的影响                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 两类官方搜索已装配                                                          | `apps/api/src/server.ts`、`adapters/official-search.ts` | 直接复用，不新建搜索系统                                                          |
| 通用 Organizer 依赖 JSON 输出及引用校验                                     | `apps/api/src/llm/discussion-organizer.ts`              | 直答只承诺 model/messages/stream，不能直接更换 base URL 即宣称兼容                |
| Fake Organizer 可在 LIVE 失败时返回                                         | 同上 FallbackDiscussionOrganizer                        | 必须展示 LLMRun provenance、status、fallbackReason；LIVE 验收禁止该降级           |
| SearchService.inFlight 保存 Promise 后没有清理                              | `apps/api/src/search-service.ts`                        | 已完成请求会永久复用，失败也可能被持续复用；应 finally 清理，缓存时效交给缓存层   |
| 首页含本地 mock 初始数据、失败生成 Mock Investigation、固定延迟、关键词分流 | `apps/web/app/page.tsx`、`lib/mock-data.ts`             | API 失败不能看成创建成功；不能把定时动画当真实 Agent 进度                         |
| 现有 API client 已校验 Contract                                             | `apps/web/lib/api-client.ts`                            | 扩展现有入口，禁止第二套客户端/前端 DTO                                           |
| 有本地 JSON Aggregate 仓库                                                  | `apps/api/src/repository.ts`                            | 复用，验证重启回读；不以知识库 RAG 替换业务存储                                   |
| 已有 discovery、Knowledge Object、准备/确认 Intake、chat/proposal 路径      | `docs/API_CONTRACT.md`、`apps/api/src/app.ts`           | 优先复用；与 A11–A17 任务核对后再加路由，避免重复 Proposal/Conversation Authority |

## 3. 保留、替换和新增

### 3.1 替换

1. **讨论结构化模型供应商**：在现有 DiscussionOrganizer 接入点增加知乎请求配置分支；复用现有解析、Schema、引用校验与 Fallback。不要创建第二套讨论组织规则。
2. **首页模拟成功路径**：LIVE 模式去掉 catch 中创建本地业务对象的行为，显示真实错误和重试入口。离线模式可显式展示后端 Fixture，但不得与 LIVE 数据混合。
3. **客户端模拟业务判断**：首页关键词分类不能决定创建调查、生成结论、Evidence Grade 或状态。利用已有后端 chat/proposal/prepare 路径完成路由，前端只展示结果；保持用户确认后才提交 Evidence。
4. **无限期请求合并**：修复 inFlight 生命周期；并发合并只覆盖进行中的同一请求，后续读缓存或发新请求按显式策略处理。

### 3.2 增加对演示确有价值的能力（由两个入口统一触发）

| 新能力               | 用户可见收益                             | 最小实现范围                                                                       |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| 主题推荐已有知乎问题 | 从真实知乎问题进入求证，不是孤立新建帖子 | 用户主动获取一页、选择一个问题；热榜作为 Investigation 入口，不做无限滚动通用 Feed |
| 问题回答摘要补充     | 展示“知乎已经讨论了什么、分歧在哪里”     | 对选定 QuestionUrl 请求一页；有需要时显式继续；不自动爬取所有回答                  |
| 来源与运行状态展示   | 评委可区分真实检索、缓存和演示数据       | 标题、原始链接、摘要、抓取时间、来源模式；LLM 模型及降级状态                       |
| 可见的贡献前后变化   | 展示产品核心价值，而不只是 API 拼装      | 复用 Receipt 显示 affected Claim、状态前后、仍缺什么；由后端提供，不按 UI 猜测     |
| 按需集成诊断         | 演示前发现未配置/限流问题                | 本地或受控诊断脚本查询必要能力额度；不新增公开 quota/凭证接口                      |

### 3.3 本轮增加的官方能力

- RAG：只有出现“同一研究反复检索已授权资料”的具体需求才接；不是本轮必选依赖。
- OAuth：有明确多用户身份验收需求才作为独立任务，不阻塞当前求证闭环，不扩建完整 Auth System。
- 本轮不做上传、Creator 统计、内容发布、关注/收藏写入、活动故事等副作用或非核心能力。未经授权不读取、不上传、不长期存储用户数据。
- 不开发发布、私信、任意用户全文；当前没有足够官方能力证据。
- 不引入 Multi-Agent、新状态系统或新数据库。Knowledge State、Evidence Grade、Mission lifecycle、Receipt 仍使用现有 Authority。

## 4. 后端改造方案

### 4.1 阶段 G0：知乎直答替代可行性

先用公开/合成测试讨论，不发送私人记录。真实凭证调用需获得明确确认；本轮方案不读取密钥值、不发业务请求。

- 扩展现有 Organizer 的供应商配置，知乎分支使用官方 endpoint、秒级时间戳及租户可用模型。
- 知乎分支不发送依赖未承诺语义的 response_format/temperature，不假定 tool calling 可用。
- 非流式起步，减少 SSE 中途错误复杂度；仅接受 schema-valid JSON 结构，不用危险字符串拼接“修好”错误结果。
- 输出仍由 DiscussionOrganizationSchema 及现有引用规则把关：Claim/Gap 引用一致、不虚构 evidenceIds、不将意见直接判定为 Evidence。
- 记录模型、provenance、status、延迟、失败原因；敏感输入和密钥不进入日志。
- live-only 验收允许明确失败，不允许缓存/Fake/阿里云掩盖失败。

**建议验收集：** 12 条合成输入覆盖观点、第一手观察、反例、限制、范围外输入、提示注入，每类 2 条；成本获批后运行一次。全部结构/引用有效，观点和注入样本不得生成已验证证据；实测延迟符合现有前后端超时预算，并记录 p50/max。若失败，修复或比较另一可用知乎模型；不得用自动无限重试掩盖稳定性。

只有 G0 及最终全链路 LIVE 门槛都通过，才把“阿里云可移除”从目标改成事实。

### 4.2 阶段 G1：Contract-first 内容扩展

复用现有 SourceRef、SearchResponse、DiscoveryTopic、Investigation 与 KnowledgeObjectProjection。不要把此文中的候选字段当作已生效契约；精确定义必须落在 `packages/contracts` 并同步 `docs/API_CONTRACT.md`。

必要设计决定：

- 为“来自哪个知乎问题”保留可选、向后兼容的 QuestionUrl 关联；用户选择后后端验证合法知乎问题 URL，不能由模型发明。
- 回答摘要复用 SourceRef 的 URL、ID、excerpt；缺失作者/发布时间保持缺失，不填虚构值。
- 问题回答分页/检索元信息单独表达，不冒充现有全网搜索；官方分页 IsEnd/NextOffset 保留可回溯语义。
- 知乎来源已有 provider=ZHIHU，不因为多一个端点另造来源供应商。需要分辨获取方式时增加最小元信息，而不是滥用 contentType。
- 保留现有 searches.zhihu/global 兼容结构；新增来源通过既有投影扩展交付，旧消费者继续通过 Contract 测试。
- API 错误与来源状态可选扩展，前端能分辨“基础研究成功，回答摘要失败”和“整个 Investigation 创建失败”。

路由策略：先检查现有 discovery 是否纯读。若是，**不能在 GET 中隐式触发付费检索**；复用已有显式研究命令，或在 Owner A 确认后补一个最小主动发现命令。问题详情读取不重新调用搜索或直答。

### 4.3 阶段 G2：官方内容接入与编排

- 在现有 API Adapter 层增加热榜、问题推荐、回答摘要和用户数据的最小调用实现；独立的上游调用职责可以新增 Adapter，但不得复制 SearchService 或领域 Service。
- 用户数据统一采用“用户主动触发、最小字段、权限隔离、按需缓存”；Access Secret 所属账号的本人模式与 OAuth 授权用户模式必须分开，不能混用缓存。
- 热榜和用户数据都只产生候选来源/上下文，不能直接生成 Evidence 或改变 Knowledge State。
- 复用共同错误类型与超时模式；不为三个接口预建通用 Provider Framework。
- 用户选择问题后：知乎/全网基础检索可并行；摘要与问题 URL 的依赖明确；收集来源后进入现有 Agent/Organizer 和 suitability gate。
- 输入内容作为数据，不执行网页/摘要中的指令；没有可靠来源不生成“已证实”结论。
- Limit 初始采用小页，单次创建摘要最多一页；后续由用户显式继续，分页无进展/缺游标则停止并返回限制说明。
- 去重优先复用既有 Evidence/来源处理逻辑；相同内容通过搜索与摘要重复出现不能被算作两份独立证据。
- 新能力失败可返回部分资料及 limitations；基础业务不可用时返回明确错误，不能制造空壳成功。

### 4.4 阶段 G3：可靠性与供应商切换

- inFlight 使用 finally 清理，测试并发相同请求只调用一次、完成后可刷新、失败后可恢复。
- 缓存键含获取方法、规范化参数、分页和必要身份范围；缓存时间用真实获取时间，读取不能改写成“刚获取”。
- 公共 API LIVE/CACHE/FIXTURE 区分；任意 query 不能回退成不相关 Golden 问题。
- 新直答缓存要包含模型与输入/提示版本等必要上下文；不能把旧模型结果当新供应商实时成功。
- 无权限/限额停止重试；非幂等操作不盲目重试；输出必要 requestId 与领域 ID，不输出原始认证头。
- 供应商切换集中在 `server.ts` 配置装配；不在业务各处判断阿里云/知乎。
- 默认知乎；回滚是显式配置切换或显式离线演示，不能自动跨供应商传输用户内容。

## 5. 前端整合方案

Owner B 在既有布局中实施，不重做全站视觉、不新增状态管理。

1. **ChatGPT 式入口**：继续使用 `apps/web/app/page.tsx` 和 `lib/api-client.ts`；用户只提交主题/问题，前端不让用户选择“调用哪个 API”。后端 Agent 自主编排知乎搜索、热榜、问题推荐、回答摘要和全网检索，并返回 Investigation 或需要用户确认的下一步。
2. **圈子广场帖子入口**：在现有 Mission Feed / Investigation 列表中进入 Agent 维护的帖子；帖子内统一承载 Agent 对话、已有讨论、Evidence Gap 和 Mission 贡献，不把热榜、用户收藏或问题推荐做成额外一级入口。
3. **真实运行反馈**：展示后端已确认阶段或普通 pending 状态；移除固定 4.5/11 秒延迟制造的假进度，不新增仅为动画服务的后端任务系统。
4. **详情统一**：以现有 Knowledge Object 投影为主；检查 `/investigation/[id]` 与 `/knowledge-object/[id]` 的数据来源一致，不能一个真后端一个本地 mock。
5. **来源面板**：知乎/全网/回答摘要可区分；展示原始引用、时间与获取模式；AI 生成内容和原始摘要不能混淆。
6. **贡献链路**：讨论 → 结构化草稿 → 用户确认 → 真实 Intake → Receipt；确认前不计为 Evidence。复用现有 prepare/confirm 接口，不新增第二套提交。
7. **刷新后回读**：提交成功后失效并重取相关查询；页面刷新从后端重建，不能靠内存数组维持新状态。
8. **异常页面**：断网、429、无摘要、无效 JSON、CLOSED Mission 明确反馈；重试不重复提交 Observation。
9. **演示模式**：正常路径只信后端；允许单独显式标记的离线演示，所有 Fixture 状态可见，不与 LIVE 内容静默拼接。

## 6. 单一 Owner 的实施切片与依赖

下列为建议工作包，不占用新 Task ID；实施前在 `TASKS.md` 检查/细化 A11–A17，避免另建重复功能任务。每个工作包唯一 Owner，A/B 的写集合分离；跨模块 Review 按 CONTRIBUTING。

| 工作包              | Owner | Allowed paths（实施时登记）                                            | 依赖与验收                                              |
| ------------------- | ----- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| G0 直答可行性       | A     | `apps/api/**`，已有 Agent 调用边界如确需修改才纳入 `packages/agent/**` | 固定契约通过、LIVE 质量证据；不动前端                   |
| G1 共享 Contract    | A     | `packages/contracts/**`、`docs/API_CONTRACT.md`                        | 字段与路由兼容审查；B/C Review                          |
| G2 内容调用及可靠性 | A     | `apps/api/**`、必要 `packages/agent/**`                                | G1；热榜/推荐/摘要/用户数据的分页、权限、降级、去重测试 |
| G3 真实前端闭环     | B     | `apps/web/**`                                                          | G1/G2；清除正常路径 mock 成功、Receipt 可回读           |
| G4 浏览器测试工程   | B     | `apps/web/**`、必要根测试脚本/依赖配置                                 | G3；真实浏览器操作前后端，隔离数据                      |
| G5 验收用例与报告   | C     | `fixtures/**`、`docs/**`                                               | G0–G4；记录 LIVE 与离线的独立结果，不代替 A/B 实现      |

顺序：基线 → G0 → G1 → G2 → G3 → G4/G5 → 供应商移除决定。预计工作量应在 G0 结果后估算，不能提前承诺直答必然兼容。

## 7. 端到端测试与验收

### 7.1 测试层次

- **单元/Contract**：沿用 Vitest，覆盖官方 response 映射、缺字段、分页、401/403、429、超时、坏 JSON、引用越界、并发去重和缓存恢复。
- **后端集成**：真实 HTTP 入口与临时持久目录，复用 Golden Flow / Community Flow；检查讨论、确认、Evidence、Receipt 之间的同一组 ID 与归因。
- **确定性浏览器 E2E**：启动真实 web + api；仅替换外部知乎 HTTP 为受控测试响应，不 mock 我们自己的业务 API；用浏览器操作 UI，落库再回读。
- **LIVE smoke**：获准后仅使用公开问题和合成测试讨论；真实知乎、真实 backend、真实 frontend。LIVE 搜索和 LLM provenance 断言通过，禁止 Fake 或阿里云回退。

测试框架若采用 Playwright，应先核对现有依赖再引入最小浏览器测试依赖；这是自动化测试，不等同于用户电脑 UI 操作。测试存储、端口和凭证与工作数据隔离，不删除 `.data` / `.cache`，不把真实参与者内容发送上游。

### 7.2 代表性 E2E 场景

| 场景                                          | 必须观察到的结果                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| ChatGPT 式提问 → Agent 自动组织 Investigation | QuestionUrl/来源与 UI 一致，后端生成真实 Investigation ID                            |
| 读取详情                                      | 能看见 Claims、限制、缺口、Mission 或明确 stop 原因，不保证每个问题必定生成 Mission  |
| 正常贡献                                      | 填写 Observation、确认后只产生一份 Evidence 与 Receipt，引用同一个 Mission/Gap/Claim |
| E0 意见                                       | 不推进 Knowledge State，不伪造“贡献带来升级”                                         |
| 合格第一手观察/Artifact                       | 依现有规则判级；Artifact URL 本身不自动保证 E2；Receipt 展示实际变化/限制            |
| CLOSED Mission                                | 提交被后端拒绝，无新增 Evidence                                                      |
| 刷新和服务重启                                | 同一 ID 的 Investigation/Evidence/Receipt 仍可回读                                   |
| 双击确认/请求超时后重试                       | 至多一份业务写入；先验证已有幂等性，缺口在原 Intake Authority 最小修复               |
| 搜索 429 或断网                               | 明确缓存/Fixture/失败状态，不产生前端 mock 创建成功                                  |
| 直答返回普通文本/坏 JSON                      | 校验失败可见；LIVE 验收失败，不能靠 Fake 变绿                                        |
| 回答摘要空页/缺 NextOffset                    | 停止或按有效分页继续，不丢失限制、不无限循环                                         |
| 无阿里云凭证运行                              | 进程环境不注入阿里云凭证；完整 LIVE 链路成功；出站日志确认无阿里云请求               |

### 7.3 交付证据

必须提供：运行命令、时间、Git diff、测试数量/跳过项、LIVE/离线模式、浏览器截图或 trace、关键 requestId 与实体 ID、重启前后回读结果。证据不含密钥或私人全文。

`npm run verify` 是必要条件，不是浏览器 E2E 的替代品；当前 verify 只含格式/lint/类型/Vitest/build，不能据其成功声称浏览器验收完成。

验收后才可说明“阿里云不再是运行依赖”；若确定性测试通过但直答实测不通过，状态是 verification_blocked，而不是完成。

## 8. 回滚和风险

- Contract 采用向后兼容扩展；旧数据缺省可读，不能为了新来源强制清库。
- 按切片保留独立可审查 diff；不与正在进行的 A11–A17 混合覆盖文件。
- 关闭新内容获取能力仍能跑已有 Golden Case；不删除旧 Fixture。
- 供应商回退必须显式，保留模型来源展示。恢复阿里云只在用户选择后启用，不是默认失败策略。
- 主要风险：直答结构化不稳定、租户授权不足、配额、前端 mock 覆盖真实错误、部分状态只存内存、幂等缺口和来源重复计数。先用测试验证，不先假设所有状态已经持久化。

## 9. 本轮状态

```yaml
feature: zhihu-first-golden-loop
mode: EXPLORE
scope_status: stable
spec_status: draft
implementation_status: partial
migration_status: not_applicable
unit_test_status: not_run
integration_test_status: not_run
uat_status: not_run
runtime_status: unknown
security_status: unverified
external_dependency_status: unverified
artifact_status: mixed
resolved_status: draft
```

partial 表示原有搜索与领域闭环已有代码，不表示本方案新增能力已实现。本轮设计未改变 Contract、运行实现或供应商配置。npm run verify 的基线结果记录在 C08 与交付说明；即使基线通过，也不把新增能力测试标为 passed。
