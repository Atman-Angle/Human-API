# TEAM_SOP.md

## 每个任务的标准流程

```text
需求
↓
创建 Task
↓
指定唯一 Owner
↓
规定 Allowed Paths
↓
Codex 先搜索仓库
↓
确认 Authority
↓
Contract First
↓
开发
↓
npm run verify
↓
PR
↓
Duplicate Check
↓
Owner Review
↓
Merge main
```

---

## 三个避免重复的核心机制

### 1. 一个业务概念只能有一个 Authority

例如：

```text
EvidenceGrade
→ packages/evidence

KnowledgeState type
→ packages/contracts

KnowledgeState evaluator
→ packages/agent
```

### 2. 一个 Task 只能有一个 Owner

跨模块需求必须拆成多个 Task。

### 3. Codex 创建新东西前必须全仓搜索

如果已有实现：

> 复用 / 扩展。

不允许：

> 建第二套。

---

## 每 3 小时同步格式

每人只汇报：

```text
DONE
NEXT
BLOCKER
```

---

## Blocked

超过 20 分钟：

```text
BLOCKED
Task:
目标:
当前问题:
已尝试:
需要:
```
