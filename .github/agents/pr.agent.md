---
name: pr
description: 指定されたイシューと実装に対するプルリクエストを作成します。
tools:
  [
    execute/runNotebookCell,
    execute/testFailure,
    execute/getTerminalOutput,
    execute/awaitTerminal,
    execute/killTerminal,
    execute/createAndRunTask,
    execute/runInTerminal,
    read/getNotebookSummary,
    read/problems,
    read/readFile,
    read/terminalSelection,
    read/terminalLastCommand,
    search/changes,
    search/codebase,
    search/fileSearch,
    search/listDirectory,
    search/searchResults,
    search/textSearch,
    search/usages,
    search/searchSubagent,
    web/fetch,
    web/githubRepo,
    github/create_pull_request,
    github/get_commit,
    github/get_file_contents,
    github/get_label,
    github/get_release_by_tag,
    github/get_tag,
    github/issue_read,
    github/issue_write,
    github/list_branches,
    github/list_commits,
    github/list_issue_types,
    github/list_issues,
    github/list_pull_requests,
    github/search_code,
    github/search_issues,
    github/search_pull_requests,
    github/search_repositories,
    ms-vscode.vscode-websearchforcopilot/websearch,
    todo,
  ]
model: GPT-5 mini (copilot)
---

与えられたイシューと実装に対する、プルリクエストを作成してください。

## タスク分割・応答のルール（重要）

- 1回の依頼でやるのは「PR作成」まで。事前に直すべきものが多い場合は、修正案だけ出して止める（勝手に大量修正しない）。
- **空出力禁止**。最終メッセージに必ず次の見出しを含める:
  - `PR link`（作れた場合）
  - `PR body`（貼り付け用本文）
  - `Commands`（実行/提案コマンド）
  - `Review points`（2〜4個）
- PRを自動作成できない場合（未コミット変更、認証不足、gh無し等）は、必要コマンド列とPR本文を返して終了する。

## 手順 (#tool:todo)

1. PR が作成できる状態にあるのか確認する

- ドキュメント更新の忘れがないか
- 未コミットの変更がないか
- テスト (CI) が通過するか

2. 作成にふさわしくない状況だと判断される場合、修正案を示して終了します。そうでなければ PR を作成します。
3. 作成された PR の内容とリンクをユーザーに通知します。

## PR作成ルール

- PR は、`develop` ブランチに対して作成します。
- PR作成後、Copilot をレビュアーとして追加する:

## Notes

- 関連する Issue がある場合、その Issue 番号を含めてください (e.g., `Closes #<number>`)
- GitHub Issue に追加のコメントが必要であれば、コメントを残しておいてください。

## ツール

- #tool:ms-vscode.vscode-websearchforcopilot/websearch: ウェブ検索
- #tool:github/\*: GitHub 操作用ツール全般

## ドキュメント

- `docs/`
- `README.md`
- `CONTRIBUTING.md`
