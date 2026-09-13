# Codex Task 模板

把下面内容作为每个开发任务的 Prompt。

---

目标：

<写清要实现什么>

Task ID：

<Txx>

Owner：

<A / B / C>

允许修改：

```text
<路径>
```

禁止修改：

```text
<路径>
```

验收标准：

1.
2.
3.

开始开发前必须：

1. 阅读根目录 `AGENTS.md`
2. 阅读 `docs/PROJECT_LOCK.md`
3. 阅读 `docs/ARCHITECTURE.md`
4. 阅读 `docs/API_CONTRACT.md`
5. 阅读 `TASKS.md`
6. 搜索整个仓库是否已有相同或相近职责的 Type / Service / State / Utility / Adapter
7. 优先复用已有 Authority，不创建第二套实现

先不要修改代码。

先告诉我：

- 你找到的相关现有实现
- 本任务应该修改哪些文件
- 是否需要改变 Contract
- 是否存在重复实现风险

确认修改范围后再开发。

开发完成后：

- 执行 `npm run verify`
- 汇报修改文件
- 汇报测试结果
- 汇报是否新增 Type / Service / State / Adapter
- 汇报重复实现检查结果
