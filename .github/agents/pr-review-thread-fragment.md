## PR review thread 共通ルール

- 対象は GraphQL の `reviewThreads` で取得した **未解決 (`isResolved == false`) の thread のみ**。
- `resolved` の thread は現在対応すべき課題に含めない。
- `review agent` は取得・評価のみ行う。thread の resolve/unresolve、PR への返信、re-review リクエストは行わない。
- `implement agent` は渡された未解決 thread の指摘だけを実装対象にする。PR 操作は行わない。
- `pr agent` は PR 作成、Copilot reviewer 追加、re-review リクエスト、ポーリング手順の実行または提示を担当する。
- thread を `resolved` にしてよいのは、修正 push 済み、または却下/後続 Issue 化の説明が PR 上で明示された場合だけ。
- 最後のコメント本文に `... in this pull request and generated no comments.` が含まれる場合は、そのレビュー結果を **「指摘なし」** として扱う。

## PR コメント対応で必ず渡す情報

- リポジトリ: `{owner}/{repo}`
- PR 番号: `{pr_number}`
- PR URL: `{pr_url}`
- HEAD 情報が分かる場合: `headRefOid` または現在の branch / commit
- 参照ファイル: `.github/agents/pr-review-thread-fragment.md`

## 未解決 thread 取得の参考コマンド

```bash
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
              author { login }
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
| jq '.data.repository.pullRequest.reviewThreads.nodes | map(select(.isResolved == false))'
```

## re-review とポーリングの運用

### Copilot への re-review リクエスト

Copilot の自動 re-review がトリガーされない場合、以下のコマンドで明示的にリクエストする。

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/requested_reviewers \
  -X POST \
  -f 'reviewers[]=copilot-pull-request-reviewer[bot]'
```

### ポーリング条件

- PR 作成後または Push 後は、新しいレビューコメントを検出するために **30秒間隔・最大10分** でポーリングする。
- 取得対象は **未解決 (`isResolved == false`) の review thread のみ**。
- 必要に応じて `Commands` や handoff に、実行した/実行すべきポーリング手順を明示する。
- ただし最後のコメント本文に `... in this pull request and generated no comments.` が含まれる場合は、新規の指摘として扱わない。

### 未解決 thread 数の確認

```bash
gh api graphql -f query='{ repository(owner: "{owner}", name: "{repo}") { pullRequest(number: {pr_number}) { reviewThreads(first: 30) { nodes { isResolved } } } } }' \
| jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length'
```

## 必須フロー

1. **PR作成時**: `gh pr create` → Copilot レビュアー追加 → **即座に** 未解決 thread のみを対象にポーリング開始（30秒間隔・最大10分）
2. **修正 Push 時**: `git push` → re-review リクエスト → **即座に** 未解決 thread のみを対象にポーリング開始（30秒間隔・最大10分）
3. **コメント検出時**: 指摘内容を評価 → 修正実施 → テスト実行 → Push → 2 に戻る
4. **未解決 0件**: マージ準備完了
