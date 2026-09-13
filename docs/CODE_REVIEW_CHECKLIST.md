# CODE_REVIEW_CHECKLIST.md

Review 时按顺序检查。

## 1. Golden Demo

- 是否破坏主链路？
- main 是否仍可运行？

## 2. Duplicate Check

重点看：

- 新 Type
- 新 Enum
- 新 State
- 新 Service
- 新 Adapter
- 新 Repository
- 新 Utility
- 新 Schema

每出现一个，都问：

> 仓库里是否已经有同职责实现？

## 3. Authority

是否违反：

```text
contracts → 类型
agent → 决策
evidence → 证据
api → HTTP
web → UI
```

## 4. Contract

- 前后端是否共用 Contract？
- 是否出现本地复制 DTO？

## 5. Scope

- 是否只改当前 Task？
- 是否顺手重构了无关代码？

## 6. Verification

- verify 是否通过？
- 相关测试是否存在？

## 7. Readability

最后才检查：

- 命名
- 文件大小
- 函数职责
- 注释
