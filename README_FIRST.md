# 先看这里

这套文件不是“文档资料”，而是一套三人协作机制。

建议顺序：

1. 把整个目录内容复制到项目仓库根目录。
2. 把 `.github/CODEOWNERS` 里的 `@member-a / b / c` 改成你们真实 GitHub 用户名。
3. 根据真实技术栈，把 `package.verify.snippet.json` 里的 verify 脚本合并进项目 `package.json`。
4. 三个人一起看：
   - `PROJECT_LOCK.md`
   - `ARCHITECTURE.md`
   - `TASKS.md`
5. 每个人启动 Codex 后，先发 `docs/CODEX_TASK_TEMPLATE.md` 里的模板。
6. 每个功能必须先登记 Task，再开发。
7. 每个 PR 必须使用 PR 模板。
8. `main` 永远保持可演示。

最重要的三条纪律：

> 一个业务概念只能有一个 Authority。

> 一个 Task 只能有一个 Owner。

> Codex 创建新东西之前必须先全仓搜索已有实现。
