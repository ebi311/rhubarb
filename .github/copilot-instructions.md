# Rhubarb Copilot Instructions

このファイルは、Rhubarb プロジェクトにおける Copilot の動作指示を定義しています。以下の指示に従ってください。

## プロジェクト概要

訪問介護事業所向けのシフト管理 Web アプリケーションです。
「予定のすっぽかし」と「変更時の調整負担」を解消し、現場管理者の作業効率化を支援します。

## 基本

- 日本語で応答すること
- 必要に応じて、ユーザに質問を行い、要求を明確にすること
- 作業後、作業内容とユーザが次に取れる行動を説明すること
- コマンドの出力が確認できない場合、 get last command / check background terminal を使用して確認すること

## develop

各作業を以下のように定義する。

- 開発は、”要件”の定義から、それを満たす"機能"をリスト化して、機能を実装するための"タスク"に分解することから始める。
- "要件"は、"docs/MVP.md"に記載しているので、参照にする。
- "機能"、"タスク"は、Marakdown 形式で、docs/features、docs/task に保存する。
- 各タスクは、実装に必要なステップに分解し、表や API 仕様、DB スキーマ、エンティティ仕様、合格基準などを定義する。
- ドキュメントに、コードを直接書かない。(デバッグなどの候補が必要な場合は除く)
- 各ステップのコードは、必要に応じて説明を加える。
- 各ステップのコードは、TDD の原則に従い、テストコードを最初に提供し、その後に実装コードを提供する。
- 最小限のテスト項目と実装コードを提供し、動作確認を行いながら進める。
- 関数は、Arrow Function を原則として使用する。(クラスのメソッド等は除く)
- Typescript による厳密な型チェックを行う。`as any` の仕様は原則として禁止する。
  - どうしても必要な場合は、開発者に問い合わせる。
  - ただし、UT は例外として、型指定がテスト上重要な意味を保つ場合でない場合は、`as any` を使用してもよい。

## UI components

- Component と、UT のファイルに加え、Storybook も作成する。
- それらは、`src/app/{path}/_components/{Component名}` ディレクトリに保存する。
- Storybook のストーリーは、`src/app/{path}/_components/{Component名}/{Component名}.stories.tsx` に保存する。
- テストコードは、`src/app/{path}/_components/{Component名}/{Component名}.test.tsx` に保存する。
- import で、コンポーネント名が重複するのを避けるため、同じディレクトリ内に、`index.ts` を作成し、エクスポートすることを推奨する。
- スタイルフレームワークには、Tailwind CSS + daisyUI を使用する。
- Component が複数の責務を持つ場合、サブコンポーネントに分割する。

## git rules

- コミット前に、prettier を使用してコードを整形する。
- コミットメッセージは、日本語で書く。
- コミットメッセージのルール
  - 1 行目: おおよそ 50 文字以内で要約を書く
    - プレフィックス: feat:, fix:, docs:, style:, refactor:, test:, chore:
  - 2 行目: 空行
  - 3 行目以降: おおよそ 100 文字以内で詳細な説明を書く

## use libraries

- 日付の操作には、Day.js を使用する。
- 実装で可読性や保守性、再利用性が向上すると判断した場合、適切なライブラリを提案する。コピーレフトライセンスのライブラリは使用しないこと。

## infrastructure

- クラウドサービスとして、Vercel を使用する。
- DB, 認証, ファイルストレージなどは、Supabase を使用する。

## unit tests

- テストフレームワークは Vitest を使用する。
- `pnpm test:ut --run` コマンドで実行する。
- component のテストは、 Testing Library for Svelte を使用する。
- テスト対象のファイル名のプレフィックスに `+` がついていても、テストコードのファイルにはつけないこと。
  - Vitest、Svelte の予約語のため。

## documents

- docs/reports/{yyyy-mm-dd HH:MM}-{簡単な内容(英語)}.md : 調査レポート
- docs/features/{yyyy-mm-dd HH:MM}-{簡単な内容(英語)}.md : 機能仕様書
- docs/task/{yyyy-mm-dd HH:MM}-{簡単な内容(英語)}.md : タスク

### コンポーネントの構成規則

プロジェクトルートの `README.md` の同名の項目を参照してください。

## llm.txt

ラブラリで llm.txt が提供されている物があるので、それらを使用する場合、llm.txt の指示に従うこと。

- daisyUI: `.github/instructions/daisyui.instructions.md`
- zod: `.github/instructions/zod.instructions.md`
