## PR review thread 共通ルール

- 対象は GraphQL の `reviewThreads` で取得した **未解決 (`isResolved == false`) の thread のみ**。
- `resolved` の thread は現在対応すべき課題に含めない。
- `review agent` は取得・評価のみ行う。thread の resolve/unresolve、PR への返信、re-review リクエストは行わない。
- `implement agent` は渡された未解決 thread の指摘だけを実装対象にする。PR 操作は行わない。
- `pr agent` は PR 作成、Copilot reviewer 追加、re-review リクエスト、ポーリング手順の実行または提示を担当する。
- thread を `resolved` にしてよいのは、修正 push 済み、または却下/後続 Issue 化の説明が PR 上で明示された場合だけ。

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
