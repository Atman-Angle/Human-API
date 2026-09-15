# 知乎开放平台能力矩阵

调研日期：2026-09-14。任务：C07；文档 Owner：C；后续 Backend 接入 Owner：A。

## 1. 结论与证据边界

优先复用官方 API 的内容获取、问题发现、研究生成、资料检索和授权身份能力，而不是自行实现抓取、通用推荐、RAG 基础设施或账号密码系统。Human Gateway 保留业务编排、结构校验、证据分级、状态推进、参与记录和 Impact Receipt。

**本文件是能力调研和接入建议，不是新增产品范围、接口 Contract 或实施任务授权。** 范围以 `docs/PROJECT_LOCK.md` 为准，边界以 `docs/ARCHITECTURE.md` 为准，共享定义以 `packages/contracts` 为准，接口以 `docs/API_CONTRACT.md` 为准，Owner 以 `TASKS.md` 为准。

### 调研证据

- [S1] 本地知乎官方 Skill，`SKILL.md` 标记 author 为知乎，版本 `0.7.2-beta.20260911131715`。它是安装时的文档快照，不等于官网此刻完整目录。
- [S2] `references/http-api.md`：搜索、热榜、直答、问题推荐、回答摘要、额度、知识库。
- [S3] `references/user-api.md`：创作列表、关注、收藏和 OAuth 身份切换边界。
- [S4] `references/creator.md`：本人全文、评论和统计，明确只读本人身份限制。
- [S5] `references/oauth.md`、`references/hackathon-oauth.md`、`references/hackathon-user-profile-api.md`：授权、Token 和基础信息。
- [S6] `references/hackathon-content-api.md`：黑客松故事与知识活动内容。
- [S7] `references/cli.md`、`references/open-platform.md`：CLI、额度和平台约定。
- [R] 本仓库 `apps`、`packages`、`scripts`、`docs`、`TASKS.md` 的代码与文档搜索。

以上 Skill 文件所在目录（仅作证据定位，不作为运行依赖）：

```text
<CODEX_SKILLS_DIR>/zhihu/
```

官网入口：`https://developer.zhihu.com/`。本轮 web 检索/打开未返回可用正文，浏览器工具也未能建立会话，因此**未完成官网实时目录核验**。未调用收费/计额业务接口，未查询租户授权及额度，未读取密钥值。

覆盖口径：覆盖上述本地资料中已发现的业务接口族、OAuth 和活动内容入口；`tools` 只有额度组证据，具体接口仍未知。不能据此声称“平台所有能力已查全”或“所有接口已可用”。

### 状态定义

- 文档确认：上述资料描述了接口，不代表本租户已获授权。
- 代码已接入：存在 Adapter 和运行时装配，不代表本轮 LIVE 调用通过。
- 未发现接入：本轮搜索未发现对应官方调用，不等于已证明不存在任何间接调用。
- 待核验：资料不足、权限未知或兼容性尚未实测。

## 2. 官方能力矩阵

除另有说明，路径基址为 `https://developer.zhihu.com`。

鉴权缩写：

- **B**：后端 Bearer Access Secret + 秒级 `X-Request-Timestamp`。
- **BU**：B；代表其他授权用户时额外带 `X-OAuth-Token`，仅限用户数据列表接口。
- **O**：用户 OAuth access token；不要与平台 Access Secret 混用。

| 能力           | 方法与路径                                            | 鉴权 / 额度组                  | 主要限制                                                                        | 项目用途 / 当前状态                                                      | 来源      |
| -------------- | ----------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------- |
| 知乎搜索       | GET `/api/v1/content/zhihu_search`                    | B / `zhihu_search`             | 摘要级；最多 10 条、固定 HasMore=false 不能证明穷尽                             | Investigation 初始资料；代码已接入                                       | S2、R     |
| 全网搜索       | GET `/api/v1/content/global_search`                   | B / `global_search`            | 可用 SearchDB、Filter；筛选规则需按文档映射，当前 Adapter 只传 Query/Count      | 交叉资料、反例检索；基础搜索代码已接入                                   | S2、R     |
| 热榜           | GET `/api/v1/content/hot_list`                        | B / `hot_list`                 | 热度不是证据质量                                                                | 可选选题入口；未发现接入，不是 Golden Loop 必需                          | S2、R     |
| 主题问题推荐   | GET `/api/v1/user/question_recommendations`，传 Query | B / `creator`                  | Count 1–20；显式空 Query 非法                                                   | 复用知乎已有问题，不自建候选问题推荐算法；未发现接入                     | S2、R     |
| 画像问题推荐   | 同上，不传 Query                                      | B / `creator`                  | 当前 Access Secret 所属用户画像；未确认能用 OAuth 切换                          | 本人个性化入口；不得拿服务账号画像冒充所有用户；未发现接入               | S2、R     |
| 问题回答摘要   | GET `/api/v1/content/question_answers`                | B / `question_answers`         | QuestionUrl、Offset、Limit；摘要不是任意回答全文                                | 指定问题下补充观点、冲突及来源；优先接入候选                             | S2、R     |
| 知乎直答       | POST `/v1/chat/completions`                           | B / `zhida_openai`             | 正式保证 model/messages/stream；不保证 JSON mode、工具调用或其他参数            | 可复用研究生成、讨论整理的推理能力；需验证结构化兼容，未发现直答专用接入 | S2、R     |
| 知识库列表     | GET `/api/v1/knowledge/bases`                         | B / `knowledge`                | Scope all/created/subscribed；不分页；ID 为十进制字符串                         | 选择获授权资料库；未发现接入                                             | S2、R     |
| 知识库内容列表 | GET `/api/v1/knowledge/bases/{KnowledgeBaseID}/items` | B / `knowledge`                | 服务端 NextCursor 分页；Limit 1–20                                              | 已上传资料定位、上传结果核对；未发现接入                                 | S2、R     |
| 文件上传       | POST `/api/v1/knowledge/files`                        | B / `knowledge`                | multipart；单文件最大 100 MiB；有副作用，不自动重试                             | 经明确授权上传研究资料，省去部分解析/索引工作；未发现接入                | S2、R     |
| RAG 检索       | POST `/api/v1/knowledge/search`                       | B / `knowledge`                | KnowledgeBaseIDs 与 RecallScopes 至少一个；Limit 1–10；Content 为有序字符串数组 | 外包通用资料召回，不自建第二套向量检索；未发现接入                       | S2、R     |
| 创作列表与摘要 | GET `/api/v1/user/contents`                           | BU / `user_data`               | 授权用户范围；列表不是全文接口                                                  | 已有创作作为候选资料入口；未发现接入                                     | S3、R     |
| 关注用户       | GET `/api/v1/user/followees`                          | BU / `user_data`               | 只在授权范围内读取；不是任意用户社交图谱                                        | 当前无必要新增；不得扩张为专家市场/完整图谱                              | S3、R     |
| 收藏夹列表     | GET `/api/v1/user/favlists`                           | BU / `user_data`               | 用户授权范围与服务端分页                                                        | 选择本人已有资料集合；未发现接入                                         | S3、R     |
| 收藏夹内容     | GET `/api/v1/user/favlist_contents`                   | BU / `user_data`               | 不能访问未授权收藏内容                                                          | 调研资料复用；未发现接入                                                 | S3、R     |
| 近期收藏       | GET `/api/v1/user/collections`                        | BU / `user_data`               | 依实际 Paging 遍历，不自动全量同步                                              | 用户主动导入资料候选；未发现接入                                         | S3、R     |
| 本人全文       | GET `/api/v1/user/content_detail`                     | B / `creator`                  | 只认 Access Secret 本人；不接受 OAuth 代查；不支持任意问题正文                  | 本人指定创作原始材料；不能获取所有参与者全文                             | S4、R     |
| 本人创作下评论 | GET `/api/v1/user/content_comments`                   | B / `creator`                  | 目标内容须归本人；Children 不保证完整；按 NextOffset 分页                       | 可选反例资料输入；不是项目评论系统或评论发布 API                         | S4、R     |
| 本人账号统计   | GET `/api/v1/user/creator_account_stats`              | B / `creator`                  | 只读本人，缺失指标不能补零或推断                                                | 当前主链路不需要，不排入 MVP                                             | S4、R     |
| 本人单篇统计   | GET `/api/v1/user/creator_content_stats`              | B / `creator`                  | 日期需成对合法提供；非 Knowledge Impact                                         | 不可替代 Impact Receipt，不排入 MVP                                      | S4、R     |
| 额度查询       | GET `/api/v1/quota`                                   | B / 查询本身不消耗这些业务额度 | APIIDs 可筛选；额度组不是具体授权 API ID                                        | 运维排错、限流后诊断；未发现接入                                         | S2、S7、R |
| 小工具         | 路径、方法待核验                                      | `tools` 额度组已记载           | 尚无足够端点/参数证据                                                           | 不设计 Adapter，不承诺可用功能                                           | S2、S7    |

### OAuth、活动内容和接入形式

| 能力             | 接口 / 形式                                                            | 替代价值及边界                                                                       | 当前状态 / 来源                    |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- |
| 授权登录         | GET `https://openapi.zhihu.com/authorize`                              | 复用知乎身份，不开发密码注册；仍需应用 state 校验、回调、会话和授权撤销策略          | 未发现接入；S5、R                  |
| Token 交换       | POST `https://openapi.zhihu.com/access_token`                          | 后端保管应用凭证与 Token；不假定无限有效或自动具备 refresh 能力                      | 未发现接入；S5、R                  |
| 授权用户基础信息 | GET `https://openapi.zhihu.com/user`，O 鉴权                           | 标识、昵称、头像等；与 BU 列表接口鉴权不同；额度限制另核验                           | 未发现接入；S5、R                  |
| 黑客松故事列表   | GET `https://api.zhihu.com/km-indep-home/hackathon/v2/story/list`      | 无鉴权活动内容；不是全站通用内容 API                                                 | 未发现接入；S6、R                  |
| 黑客松知识列表   | GET `https://api.zhihu.com/km-indep-home/hackathon/v2/knowledge/list`  | 无鉴权；仅限活动文档列明内容                                                         | 未发现接入；S6、R                  |
| 活动内容详情     | GET `https://api.zhihu.com/km-indep-home/hackathon/v2/story/{work_id}` | 故事和知识详情共用入口；不能用任意知乎内容 ID 替代 work_id                           | 未发现接入；S6、R                  |
| 官方 CLI / MCP   | Skill 中的 CLI 与 MCP 接入说明                                         | 是已有能力的调用入口，不是新的领域能力；服务端沿用 HTTP Adapter，不再建设 MCP Server | 本次不安装、不升级、不调用；S1、S7 |

**纠正前文：** 未找到发布回答/文章、发评论、私信邀请、创建知乎问题或任意用户全文读取的接口证据；不能由 `creator` 名称推断发布能力。九个额度组也不等于九个业务接口，更不能证明目录完整。

## 3. 项目复用矩阵与具体落点

以下是建议修改落点，不是本任务实际修改文件清单。新增共享 API Projection 时先改 `packages/contracts/src/index.ts`，再改 `docs/API_CONTRACT.md`；纯上游私有解析 Schema 不应伪装成前后端共享 DTO。

| 当前职责 / 代码证据                                            | 官方可替代工作                                              | 必须保留的工作                                                | 后续建议落点 / Contract 影响                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/api/src/adapters/official-search.ts`、`server.ts`        | 已用官方知乎与全网搜索，不是自研搜索引擎                    | 归一化、鉴权、超时和错误映射                                  | 扩展现有搜索 Authority；只加内部参数不必然改共享 Contract                               |
| `apps/api/src/search-service.ts`、`cache/file-search-cache.ts` | 官方负责检索，不能替代本地演示降级                          | provenance、缓存、请求合并、可观测性                          | 复用现有链路，禁止第二套 SearchService                                                  |
| `apps/api/src/app.ts` 的 Investigation 编排                    | question_answers 补充指定问题材料；主题推荐提供既有问题入口 | 来源绑定、触发时机、去重、预算、领域调用                      | 新结果映射需验证 SourceRef 足够；无法表达则先改 Contract，不挤入无关字段                |
| `packages/agent/src/index.ts`                                  | 搜索/直答/RAG 可减少资料查找与归纳实现                      | 知识边界、Gap suitability、状态推进和 stop/continue Authority | 官方模型可以承担推理步骤，输出必须经现有领域规则接受；不能直接写 Aggregate              |
| `apps/api/src/llm/discussion-organizer.ts`                     | 直答可作为讨论分类、Claim/Gap 候选生成的模型后端            | DiscussionOrganizationSchema、引用校验、错误记录及降级        | 扩展既有 Organizer 接入点，不建第二套 Organizer Authority；保持返回契约则不必改共享 DTO |
| `apps/api/src/repository.ts`                                   | 知识库可承载可检索资料，不是事务存储                        | Investigation/Mission/Evidence/Receipt 的持久记录与关系       | 不删除 JsonInvestigationRepository，不把 RAG 当数据库                                   |
| `packages/evidence`、`apps/api/src/evidence-intake.ts`         | 官方内容可以成为输入材料；模型可辅助整理                    | 来源归属、E0/E1/E2、相关性、去重、限制和 Intake               | 不因“来自官方”自动升级 Grade；也不禁止合理外包辅助推理                                  |
| `apps/api/src/community-projection.ts` 及 Community 生命周期   | OAuth 减少账号身份开发；推荐减少问题发现开发                | Participation、Mission、Impact Receipt 与权限绑定             | OAuth 需独立 Owner 任务；不开发完整 Auth System                                         |
| `apps/web`                                                     | 展示官方来源、候选问题和授权入口                            | 用户体验、提交 Observation、来源/降级可见性                   | 只调用后端；网页不得持有 Access Secret 或直连知乎                                       |

本轮搜索未发现独立的知乎爬虫、自建向量库、官方热榜/推荐/回答摘要/知识库/用户 API Adapter。因此多数收益是**避免未来重复开发**，不是已有大量代码可立即删除。已有官方搜索接入也不等于“充分接入”或“本轮 LIVE 成功”。[R]

### 直答替换现有 LLM 的兼容性缺口

现有 Organizer 请求带 `temperature: 0` 与 `response_format: { type: "json_object" }`，未设置知乎要求的秒级时间戳；直答文档只正式保证 `model/messages/stream`。[S2、R]

因此不能只把 LLM_BASE_URL 换成知乎地址就宣称完成。需要在现有接入点验证：

1. 正确鉴权和时间戳；租户确实能用所选模型。
2. 不依赖未承诺的 JSON mode、tool calling 或 temperature 语义。
3. 普通文本输出解析与 Schema 校验成功；无效 JSON、引用不合法时明确失败而非接受。
4. 延迟、中文分类效果、反例与 Gap 质量满足 Golden Case。
5. 超时和流式中途错误不会产生半完成状态；不额外自动重试直答 POST。
6. 私人讨论传给第三方模型前明确授权和数据最小化。

## 4. 接入优先级建议（不是变更项目 P0）

| 顺序           | 能力                                         | 为什么                                                    | 接入前验收门槛                                                          |
| -------------- | -------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1              | 问题回答摘要                                 | 直接补齐现有 Investigation 来源，比热榜更贴近 Golden Loop | Golden Case 有真实 QuestionUrl；摘要、分页、来源、无结果/限流和降级测试 |
| 2              | 现有搜索可靠性 + 按需 quota                  | 保证已有 LIVE 链路可信，不扩张功能面                      | 真实调用/来源标记验证；并发合并与后续刷新语义；限额停止重试             |
| 3              | 主题问题推荐                                 | 从已有知乎问题进入 Investigation，省去自研候选发现        | 只作选题；有 Owner 和明确用户入口；无 Query 时不得误用服务账号画像      |
| 4              | 直答兼容性试验                               | 可能直接替代当前模型供应商，减少研究整理工作              | 上述结构化兼容性门槛通过；失败不破坏原 Organizer                        |
| 5              | 知识库 RAG / 列表                            | 有复用研究资料需求时才接，避免自建检索基础设施            | 引用可回溯、权限隔离、召回质量验证；不替代业务存储                      |
| 6              | OAuth + 基础信息 + 用户列表                  | 有真实参与者身份/资料导入需求时复用知乎账号               | 独立安全与会话范围；授权隔离；不承诺他人全文                            |
| 后置           | 热榜、画像推荐、上传、活动内容               | 可选入口或资料能力，不是固定 Golden Case 必需             | 与具体链路步骤绑定；上传需授权和副作用处理                              |
| 不纳入当前计划 | 账号统计、单篇统计、完整社交网络、未知 tools | 无法证明对当前求证闭环的必要价值                          | 新证据与范围批准后再评估                                                |

前文“热榜、推荐、回答摘要、额度全部 P0”过宽。本文件按现有固定 Golden Case 收敛：先补证据获取与可靠性，不为了 API 数量新增页面和功能。

## 5. 降级、配额与安全

### 降级按操作分类，不一刀切

- 公开读取：复用 `LIVE → CACHE → GOLDEN_FIXTURE`，标明检索时间和 fallbackReason；没有匹配 Fixture 应明确失败，不能随意返回 Golden Case 数据。
- 私有/授权读取：缓存按租户、用户、权限、参数隔离；授权失败不得返回别人的缓存。不得用公共 Fixture 冒充当前用户内容。
- 直答：沿用现有 Organizer 降级边界并显式标记；模拟输出不能冒充真人 Evidence 或真实 LLM 成功。
- 上传：有副作用；超时先列出知识库内容核对，不盲目重传，不用 Fixture 伪装上传成功。
- OAuth / Token：失败就是授权失败，不能降级成模拟登录。
- quota：按需读取或排错时调用，不为每个页面/请求额外查询，不定时轮询；失败时显示额度未知，不编造 RemainingQuota。

### 配额和错误

[S2、S4、S7] 记录九个公开额度组：`global_search`、`zhihu_search`、`hot_list`、`question_answers`、`user_data`、`creator`、`zhida_openai`、`knowledge`、`tools`。推荐与本人全文/评论/统计共用 creator；回答摘要有独立额度。资料中的默认额度不是本租户可用额度，实际以 quota 和授权返回为准。

具体授权 API ID 与额度组不同，例如 `user_content_detail` 不能用 `creator` 代替授权申请。API 的错误外层也并非完全一致：直答是 Chat Completions 风格，不应强行套用搜索的 Code/Message/Data。

至少区分 timeout、rate limit、invalid response、upstream unavailable，以及授权/参数错误。限额或权限拒绝停止重复请求；不要把鉴权失败说成“没有搜索结果”。日志保留 requestId、相关领域 ID 和 Agent action，不记录密钥/Token。

### 隐私与内容可信性

- Secret、应用密钥、OAuth Token 只在后端保管；不回显、不提交 Git、不进入前端 bundle。
- 只导入用户明确选择的创作/收藏/文件；不自动遍历账号或把私有内容同步到公共知识库。
- 本人全文/评论/统计不支持 OAuth 代查；关注列表不能用于构造未授权人物画像。
- 官方摘要、直答输出、RAG chunk 均为输入材料，不自动成为高等级 Evidence。保留原始出处、权限范围、时间、引用和限制；HTML 与模型输入都按不可信数据处理。

## 6. 完整调研仍欠缺的验证

1. 官网/控制台实时接口目录：是否有本地快照遗漏的新能力，尤其 tools。
2. 本租户逐能力授权、真实剩余额度、QPS、并发、实际响应和可用直答模型。
3. 搜索/摘要/RAG 的引用字段是否能无损映射当前 SourceRef，禁止虚构 URL 或作者。
4. 回答摘要具体分页行为、空页、内容下线、无权限和限额样本。
5. 直答结构化稳定性、响应耗时与候选质量，不能仅凭 OpenAI-compatible 名称判断。
6. 知识库上传格式覆盖、删除/撤回能力、保留策略、权限隔离和引用粒度；当前资料不能证明这些全部支持。
7. OAuth 生命周期、Token 失效/撤销策略、用户授权 scope 和应用配置。
8. 发布、评论写入、私信、任意用户全文等未获文档证明的能力，继续标记未知而非默认存在。

完成方式：先核对可访问的官方目录，再在获授权范围内逐项最小请求验收；不为了“全覆盖”批量抓取用户数据或上传文件。

## 7. 本次交付范围与验证

- 仅新增本矩阵并登记 C07，不改变业务代码、共享 Contract、架构 Authority 或产品范围。
- 未新增 Type / Service / Adapter / State；已全仓搜索相关实现，列出可复用位置而非另建实现。
- 执行 `npm run verify`；实际结果见 C07 状态与任务交付说明。
- Golden Demo 自动化覆盖以 `apps/api/test/golden-flow.test.ts` 等测试结果为依据；未执行真实知乎请求和浏览器人工演示，不能声称 LIVE Golden Demo 已验收。
