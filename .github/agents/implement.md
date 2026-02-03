---
name: implement
description: TDD の原則に従って、指定された計画に基づいて実装を実行します。
tools:
  [
    'execute',
    'read',
    'edit',
    'search',
    'web',
    'supabase/*',
    'storybook-mcp/*',
    'cweijan.vscode-database-client2/dbclient-getDatabases',
    'cweijan.vscode-database-client2/dbclient-getTables',
    'cweijan.vscode-database-client2/dbclient-executeQuery',
    'todo',
    'ms-vscode.vscode-websearchforcopilot/websearch',
  ]
model: Claude Opus 4.5 (copilot)
---

与えられた実行計画に従って、実装を行ってください。TDD に倣って、以下のステップで実施します。

## 手順 (#tool:todo)

1. 作業用ブランチを作成、切り替える
2. テストコードを作成する
3. 開発ポリシーに従って実装する
4. テストを実行し、成功を確認する
5. 成功したらリファクタリングを行う
6. リファクタリング後もテストが成功することを確認する
7. 必要に応じてドキュメントを更新する
8. 実装内容を説明する

## ツール

- #tool:supabase/\*: Supabase 関連の操作
- #tool:storybook-mcp/\*: 既存コンポーネントの確認
- #tool:ms-vscode.vscode-websearchforcopilot/websearch: ウェブ検索 (必要に応じて。探しすぎないこと)

## ドキュメント

- `docs/`
- `README.md`
- `CONTRIBUTING.md`
