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
model: GPT-5.4 (copilot)
---

与えられたイシューと実装に対する、プルリクエストを作成してください。

## タスク分割・応答のルール（重要）

- 1回の依頼でやるのは「PR作成」まで。事前に直すべきものが多い場合は、修正案だけ出して止める（勝手に大量修正しない）。
- **空出力禁止**。最終メッセージに必ず次の見出しを含める:
  - `PR link`（作れた場合）
  - `PR body`（貼り付け用本文）
  - `Commands`（実行/提案コマンド）
  - `Review points`（2〜4個）
- 最終メッセージの末尾に、機械可読な **Handoff JSON**（共通スキーマ）を `json` コードブロックで **1つだけ** 付ける。
  - `payload` 目安: `prLink`, `prBody`, `commands`, `reviewPoints`
- `next` は **任意の提案**（書けるときだけ）。次の agent を最終決定するのは orchestrator。
- PRを自動作成できない場合（未コミット変更、認証不足、gh無し等）は、必要コマンド列とPR本文を返して終了する。

### Handoff JSON（共通スキーマ）

最終出力の末尾に、以下の形で 1 つだけ付ける。

```json
{
	"handoffVersion": 1,
	"agent": "pr",
	"status": "ok | partial | blocked",
	"summary": "1〜3行で要約",
	"artifactPaths": ["workspace-relative/path"],
	"payload": {
		"prLink": "(任意) PR link",
		"prBody": "(任意) PR body",
		"commands": ["(任意) コマンド"],
		"reviewPoints": ["(任意) レビューポイント"]
	},
	"questions": ["(任意) 次に進むための確認"],
	"next": {
		"agent": "issue",
		"prompt": "(任意) 関連Issueへのコメントやクローズ更新が必要なら、その依頼文"
	}
}
```

## 手順 (#tool:todo)

1. PR が作成できる状態にあるのか確認する

- ドキュメント更新の忘れがないか
- 未コミットの変更がないか
- テスト (CI) が通過するか

2. 作成にふさわしくない状況だと判断される場合、修正案を示して終了します。そうでなければ PR を作成します。
3. 作成された PR の内容とリンクをユーザーに通知します。

## PR作成ルール

- PR は、`develop` ブランチに対して作成します。
- PR作成後、Copilot をレビュアーとして追加する
- この agent は PR 作成と re-review/polling の運用支援までを担当し、review thread を `resolved` にしない

## Copilot レビュー対応フロー

共通ルールは `.github/agents/pr-review-thread-fragment.md` を参照する。

### PR作成後・Push後の re-review リクエスト

Copilot の自動 re-review がトリガーされない場合、以下のコマンドで明示的にリクエストする：

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/requested_reviewers \
  -X POST \
  -f 'reviewers[]=copilot-pull-request-reviewer[bot]'
```

### レビューコメントのポーリング

PR作成後または Push 後、新しいレビューコメントを検出するためにポーリングを実施する（30秒間隔、最大10分）。取得対象は **未解決 (`isResolved == false`) の review thread のみ** とする：

```bash
# 未解決 review thread の最新コメントを取得
gh api graphql -f query='query($owner:String!, $repo:String!, $pr:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$pr) {
      headRefOid
      reviewThreads(first:100) {
        nodes {
          id
          isResolved
          isOutdated
          comments(last:1) {
            nodes {
              id
              body
              path
              line
              createdAt
            }
          }
        }
      }
    }
  }
}' -f owner='{owner}' -f repo='{repo}' -F pr={pr_number} \
| jq '.data.repository.pullRequest.reviewThreads.nodes
  | map(select(.isResolved == false))'
```

### 未解決コメントの確認と解決

```bash
# 未解決スレッド数を確認
gh api graphql -f query='{ repository(owner: "{owner}", name: "{repo}") { pullRequest(number: {pr_number}) { reviewThreads(first: 30) { nodes { isResolved } } } } }' | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length'
```

- `resolved` の thread は課題一覧に含めない。
- review thread の `resolved` 操作は、この agent 単独では行わない。修正 push 済み、または却下/後続 Issue 化の説明が PR 上で明示された場合に限り、別フェーズで実行する。

### 推奨フロー

1. **PR作成時**: `gh pr create` → Copilot レビュアー追加 → 未解決 thread のみを対象にポーリング開始
2. **修正 Push 時**: `git push` → re-review リクエスト → 未解決 thread のみを対象にポーリング開始
3. **コメント検出時**: 指摘内容を評価 → 修正実施 → テスト実行 → Push → 2に戻る
4. **未解決 0件**: マージ準備完了

## Notes

- 関連する Issue がある場合、その Issue 番号を含めてください (e.g., `Closes #<number>`)
- GitHub Issue に追加のコメントが必要であれば、コメントを残しておいてください。

## ツール

- #tool:ms-vscode.vscode-websearchforcopilot/websearch: ウェブ検索
- GitHub 操作用ツール全般

## ドキュメント

- `docs/`
- `README.md`
- `CONTRIBUTING.md`
