# CONTRIBUTING.md

## 1. 三人 Owner

### 成员 A：Agent / Backend Owner

主要负责：

```text
apps/api/
packages/agent/
packages/contracts/
```

职责：

- 知乎 API / Global Search Adapter
- Agent Loop
- Evidence State
- Knowledge Boundary
- Evidence Gap
- Backend API
- Contract 集成
- main 技术集成

---

### 成员 B：Frontend / UX Owner

主要负责：

```text
apps/web/
```

职责：

- Ask 页面
- Agent Investigation
- Knowledge Boundary
- Evidence Mission
- Mobile 表单
- Knowledge State
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

- Evidence Grade
- Evidence Validation
- 测试 Case
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

---

## 3. 分支规则

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

## 4. Commit 规范

推荐：

```text
feat(agent): add evidence gap evaluator
feat(web): add knowledge boundary view
feat(evidence): classify first-hand evidence
fix(api): handle empty zhihu search result
docs: update golden demo script
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

## 5. Contract First

如果 frontend/backend 交互变化：

1. 修改 `packages/contracts`
2. 修改 `docs/API_CONTRACT.md`
3. Backend 实现
4. Frontend 实现
5. 测试更新

禁止前后端各写一套 DTO。

---

## 6. Blocker 规则

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

## 7. 合并前规则

合并前必须：

```bash
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

## 8. Review 顺序

Review 优先级：

1. 是否破坏 Golden Demo
2. 是否重复实现已有 Authority
3. 是否违反 Contract
4. 是否违反模块边界
5. 业务逻辑是否正确
6. verify 是否通过
7. 最后才看格式和命名细节

---

## 9. AI Coding 规则

AI 生成代码与人工代码执行完全相同标准。

接受 AI 改动前必须：

- 查看 diff
- 拒绝无关重构
- 检查重复 Type / Service / State
- 跑 verify
- 检查 scope
- 保留重要开发记录

AI 是实现工具，不是架构 Authority。
