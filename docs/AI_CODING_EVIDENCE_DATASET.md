# AI Coding Evidence Dataset

文件：`fixtures/ai-coding/evidence-records.json`

## 数据状态

共 **16 条**记录，用于 Golden Case "AI Coding 实际改变了初级开发者哪些工作？"：

| 分类 | 数量 | 说明 |
|---|---|---|
| `test_participant` | **7 条** | 本人真实 AI Coding 使用经历 |
| `synthetic_fixture` | 9 条 | 人工构造，仅用于测试分类器 |
| `E0_OPINION` | 3 条 | 纯观点，无个人经历 |
| `E1_FIRST_HAND` | 12 条 | 真实或合成的一手经历 |
| `E2_ARTIFACT_BACKED` | 1 条 | 带 artifact 的一手经历（synthetic placeholder） |

### 参与者构成

| 身份 | 数量 |
|---|---|
| 初级开发者 (0-3 年) | 8 条（7 real + 1 synthetic） |
| 实习生 | 3 条（1 real + 2 synthetic） |
| 学生开发者 | 2 条（synthetic） |
| 其他 | 3 条（E0 反例） |

## 真实参与者数据（test_participant）

7 条数据均来自本人的真实 AI Coding 使用经历，覆盖：

- **工具**：Claude Code、GitHub Copilot、Cursor、ChatGPT
- **任务变化**：CRUD 生成、调试、重构、代码理解、文档、测试（全部 6 类均覆盖）
- **共同模式**：AI 擅长典型场景和样板代码，但边界条件、安全约束、业务异常处理仍然需要人工判断

### 各条重点

| ID | 亮点 |
|---|---|
| `ai-coding-real-001` | CRUD 样板代码 + AI 漏掉并发测试 |
| `ai-coding-real-002` | Copilot 帮定位锁超时 Bug，但仍需本地复现 |
| `ai-coding-real-003` | Cursor 理解遗留代码，但隐式状态被 AI 遗漏 |
| `ai-coding-real-004` | AI 做文档/测试草稿，产品语义测试需人工补充 |
| `ai-coding-real-005` | 工作模式从"自己写"变成"审查+边界条件专家" |
| `ai-coding-real-006` | 实习生视角：AI 加速 onboarding，但期望值也提高 |
| `ai-coding-real-007` | 完整综述 + 行业数据佐证（Stack Overflow 2025, JetBrains 2026, METR 2025） |

## 使用限制

- 合成 fixture（`synthetic_fixture`）只能用于分类器、校验器、Demo 流程和 UI 开发，禁止作为真实用户研究结果展示。
- `ai-coding-synthetic-005` 的 `artifactUrl` 是明确标记的 synthetic placeholder，不是可验证 Commit。
- 7 条真实数据仅来自一位开发者，样本量有限，不支持"初级开发者普遍如此"的概括结论。
- 不包含姓名、邮箱、组织、仓库地址或其他个人隐私信息。

## Demo 建议

1. **首选 `ai-coding-real-005` + `ai-coding-real-007`**：最全面地展示了工作模式变化，适合开场
2. **首选 `ai-coding-real-003`**：AI 理解遗留代码的场景观众容易共鸣
3. **选 `ai-coding-real-002`**：Debug 帮助具体，非技术观众也能理解
4. **配 `ai-coding-synthetic-007`**：演示 E0 不会被错误升级为 Evidence

## 不建议直接使用

- `ai-coding-synthetic-007` 至 `ai-coding-synthetic-009` 只适合作为 E0 反例，不应支撑任何关于工作变化的结论。
- 7 条真实数据来自单一视角，不能代表不同团队、行业或技术栈的开发者体验。
- 如需更全面的 Evidence，建议后续补充更多参与者的真实回答。
