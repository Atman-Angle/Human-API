# CONTRIBUTING.md

## 1. 三人 Owner

### 成员 A：Agent / Backend Owner

主要负责：

```text
apps/api/
packages/agent/
packages/contracts/
packages/community/       # logical authority，物理 package 可后置
packages/persistence/     # logical authority，物理 package 可后置
```

职责：

- 知乎 API / Global Search Adapter
- Investigation / Knowledge Frontier / Gap Suitability
- Agent Re-evaluation
- Application Orchestration
- Mission Lifecycle 与 Impact Receipt 集成
- Contract 集成
- main 技术集成

---

### 成员 B：Community Frontend / UX Owner

主要负责：

```text
apps/web/
```

职责：

- Investigation Page
- Knowledge Frontier View
- Mission Feed / Mission Detail
- Evidence Submission
- Impact Receipt UI
- Knowledge State Update
- Demo UX

---

### 成员 C：Evidence / Validation Owner

主要负责：

```text
packages/evidence/
fixtures/
docs/
```

职责：

- Evidence Validation
- Evidence Grade
- First-hand 判断与 Gap Match
- 测试 Case 与 Negative Cases
- 真实测试参与者 Evidence
- Seed Evidence
- Red Team
- Demo / Submission 文档

---

## 2. Ownership 规则

谁拥有某个模块，谁拥有最终 Review 权。

跨模块改动必须经过对应 Owner Review。

例如：

- A 修改 `apps/web` → B 必须 Review
- B 修改 `packages/agent` → A 必须 Review
- A/B 修改 `packages/evidence` → C 必须 Review

### One Task = One Owner

一个 Task 只能有一个 Owner。一个需求跨多个模块时，拆成多个子任务，而不是让多人同时实现同一任务。

---

## 3. Authority First

任何新实现前先确认：

- 概念的唯一 Authority 是什么；
- 是否已有同名或相近实现；
- 应扩展已有实现，还是新增明确边界；
- 是否会创建第二套 Contract、State、Repository、Service 或 DTO。

Authority 以 `docs/ARCHITECTURE.md` 为准。

---

## 4. Search Before Create

创建 Type、Interface、Enum、Schema、Service、Repository、Adapter、State、DTO 或业务函数前，必须全仓搜索已有实现，并检查 `packages/contracts`。

发现重复实现时，不得创建第三套；必须报告并选择已有 Authority。

---

## 5. Contract First

如果 frontend/backend 交互变化：

1. 修改 `packages/contracts`
2. 修改 `docs/API_CONTRACT.md`
3. Backend / Application 实现
4. Frontend 实现
5. 测试更新

禁止前后端各写一套 DTO。

---

## 6. 分支规则

使用短生命周期分支：

```text
feat/agent-core
feat/web-experience
feat/evidence-system
fix/<name>
docs/<name>
```

禁止直接在 `main` 开发。

---

## 7. Commit 规范

推荐：

```text
feat(agent): add evidence attribution
feat(web): add knowledge frontier view
feat(evidence): classify first-hand evidence
fix(api): handle empty zhihu search result
docs: update community architecture
```

禁止：

```text
update
fix
123
final
final-final
```

---

## 8. Blocker 规则

卡住超过 20 分钟必须发：

```text
BLOCKED

Task:
目标:
当前问题:
已经尝试:
需要谁:
需要什么:
```

禁止自己卡 2 小时以后才说。

---

## 9. 合并前规则

合并前必须执行：

```powershell
npm run verify
```

并且人工检查受影响的 Golden Demo 路径。

PR 必须回答：

1. Task ID 是什么？
2. 改了什么？
3. 为什么改？
4. Contract 是否变化？
5. 新增了哪些文件？
6. 是否搜索过重复实现？
7. 跑了哪些测试？
8. 还有什么风险？

---

## 10. Review 顺序

Review 优先级：

1. 是否破坏 Golden Demo
2. 是否重复实现已有 Authority
3. 是否违反 Contract
4. 是否违反模块边界
5. 业务逻辑是否正确
6. `npm run verify` 是否通过
7. 最后才看格式和命名细节

---

## 11. No unrelated AI refactor

AI 生成代码与人工代码执行完全相同标准。

接受 AI 改动前必须：

- 查看 diff
- 拒绝无关重构
- 检查重复 Type / Service / State
- 检查是否超出 Task scope
- 跑 `npm run verify`
- 保留重要开发记录

AI 是实现工具，不是架构 Authority。
