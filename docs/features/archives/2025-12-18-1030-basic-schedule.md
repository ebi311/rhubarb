# 基本スケジュール CRUD 仕様書

## 概要

- フェーズ: MVP フェーズ1 / 基本スケジュール登録
- 目的: 管理者が週次の繰り返し基本スケジュールを登録・更新・削除し、後続で Shift を生成できるようにする。
- ゴール:
  - 繰り返し予定の単一の正本を保持する（曜日・時間・利用者・サービス区分・デフォルト担当者）。
  - ビジネスルールを徹底する（契約中利用者のみ選択、許可リスト内スタッフのみ、時間の妥当性と担当者の重複禁止）。
  - バリデーション済みで監査可能な最小限の CRUD UI / API を提供する。

## スコープ

- 対象
  - 基本スケジュールの新規作成（週次のみ）
  - 基本スケジュールの編集（曜日・開始/終了時刻・サービス区分・利用者・デフォルト担当者・備考）
  - 基本スケジュールのソフト削除（deleted_at 設定で一覧/生成対象から除外、物理削除しない）
  - 基本スケジュールの一覧・フィルタ（曜日/利用者/サービス区分）
  - ビジネスルールに基づくバリデーションと権限制御
  - Repository / Service / API ハンドラ / UI フォーム・テーブル
  - 単体テスト（Repository, Service, UI）と Storybook
- 対象外（将来）
  - CSV インポート/エクスポート
  - 複雑な繰り返し（隔週・月次・日付範囲）
  - 一括編集・一括削除
  - Shift 生成（フェーズ2で実施）

## 登場人物 / 権限

- 管理者（オフィス管理者ロール）
  - 基本スケジュールの一覧/作成/更新/ソフト削除が可能。
- ヘルパー（スタッフロール）
  - 基本スケジュールの CRUD 不可。

## データモデル (BasicSchedule)

- `id`: UUID (PK)
- `client_id`: UUID (FK clients、contract_status = active 必須)
- `service_type_id`: UUID (FK service_types)
- `staff_id`: UUID (FK staffs、デフォルト担当者。ClientStaffAssignment で許可されていること)
- `weekday`: 文字列リテラル `"SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"`
- `start_time`: TimeValue（`{ hour: number; minute: number }`。DB では time without tz）
- `end_time`: TimeValue（`{ hour: number; minute: number }`。DB では time without tz）
- `note`: text nullable
- `deleted_at`: timestamptz nullable（ソフト削除）
- `created_at` / `updated_at`: timestamptz（サーバ管理）

## ビジネスルール

1. 利用者は contract_status = "active" のみ選択可（中断中は不可）。
2. スタッフは選択した利用者・サービス区分に対し ClientStaffAssignment に存在すること（ホワイトリスト制約）。
3. `start_time` < `end_time`（同日内のみ、夜跨ぎは非対応）。
4. 曜日×スタッフ単位で時間重複不可（同一スタッフが同曜日に重複予定を持てない）。
5. ソフト削除のみ：`deleted_at` を設定し、一覧・生成対象から除外。物理削除しない。
6. ソフト削除済みレコードの編集は禁止（復元は MVP 範囲外）。
7. サービス区分は固定マスタから選択。

## API / Service 要件

- Next.js Server Actions として `src/app/actions` 配下に実装する（Web API ルートは作らない）。
- 想定アクション（例: `src/app/actions/basicSchedules.ts` 内）:
  - `createBasicScheduleAction(input)` — 作成
  - `updateBasicScheduleAction(id, input)` — 更新
  - `deleteBasicScheduleAction(id)` — ソフト削除
  - `listBasicSchedulesAction(filters)` — 一覧取得（`weekday?`, `clientId?`, `serviceTypeId?`, `includeDeleted?` デフォルト false）
- リクエストバリデーション: Zod スキーマを UI と共有。
- レスポンス: 作成/更新エンティティまたはリストを返却。フィールド単位のバリデーションエラーを含める。
- エラーハンドリング: 400 バリデーション、404 未存在/削除済み、409 重複/許可違反、500 予期せぬエラー。
- 認証: ログイン必須。認可: 管理者のみ。
- RLS 整合: BasicSchedules RLS は管理者のみ許可、ヘルパーは書込/一覧不可（将来 read-only が必要になるまで）。

## バリデーション規則 (Zod 共通)

- `weekday`: `"SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"`
- `start_time` / `end_time`: TimeValue（hour/minute）、`start < end`。既存の TimeValueSchema / TimeRangeSchema を利用。
- `client_id`: UUID + active チェック（サーバ側）
- `staff_id`: UUID + ホワイトリストチェック（サーバ側）
- `service_type_id`: UUID が存在
- `note`: 任意、最大 500 文字

## UI 要件 (daisyUI + Tailwind)

- 画面: 一覧テーブル + モーダル/ドロワー形式のフォーム（新規/編集）
- テーブル列: 利用者, サービス区分, 曜日(ローカライズ), 時間(HH:MM-HH:MM), デフォルト担当者, 備考, 操作(編集/削除)
- フィルタ（上部）: 曜日セレクト, 利用者セレクト（契約中のみ）, サービス区分セレクト, テキスト検索（利用者/スタッフ名部分一致）
- フォーム項目: 利用者, サービス区分, 曜日, 開始時刻, 終了時刻, デフォルト担当者（利用者許可リストでフィルタ済み）, 備考
- フォーム項目: 利用者, サービス区分, 曜日, 開始時刻, 終了時刻, デフォルト担当者（`StaffPickerDialog` で許可済みスタッフのみを検索・フィルタ選択）, 備考
- 削除: 確認モーダル後にソフト削除。
- 空状態: メッセージ + 「新規登録」ボタン。
- ローディング/エラー: スピナー + インラインエラー表示。フィールドエラーは項目下に表示。
- アクセシビリティ: 全入力に label、フォーカス順序保証、送信中はボタン無効化。

## インタラクション / 例外ケース

- 利用者変更時にスタッフ選択肢を再検証し、許可外ならエラー表示の上リセット。
- デフォルト担当者選択は `StaffPickerDialog` をモーダルで起動し、検索・役割/サービス区分フィルタ・ラジオ選択によりスタッフを決定する。選択後はフィールドに反映し、`onClear` で未選択状態へ戻す。
- 既に削除済みを削除要求した場合は非致命 404 とし、UI はトースト表示後リスト再読込。
- 重複検知時は、衝突したスケジュールの時間帯を明示したエラーメッセージを表示。
- 契約中断中の利用者はセレクトから除外。ただし既存レコードが中断中利用者に紐づく場合は一覧は表示可、編集は不可（再開まで）。

## テスト (最小)

- Repository / Service (Vitest):
  - 正常作成、非アクティブ利用者で失敗、許可外スタッフで失敗、重複で失敗、ソフト削除で `deleted_at` 設定、一覧は削除除外がデフォルトで includeDeleted=true で含む。
- API ハンドラ: 400 バリデーション、401/403 認証/認可、404 未存在、409 重複、200/201 成功。
- UI (Testing Library):
  - フォームのバリデーション表示
  - 曜日/利用者/サービス区分フィルタ
  - 作成フローで一覧更新
  - 削除フローで行が非表示になる
- Storybook: フォーム、一覧テーブルの状態（通常、空、ローディング、エラー）。

## 受入基準

- 管理者が UI / API から基本スケジュールを作成・更新・ソフト削除でき、上記バリデーションが効いている。
- 契約中利用者のみ選択でき、スタッフ選択肢は許可リストでフィルタされる。
- 同一スタッフ・同一曜日の重複予定は明確なエラーで拒否される。
- ソフト削除済みはデフォルト一覧に出ず、下流生成にも使われない。
- 追加したテストと Story が `pnpm test:ut --run` で全て通る。
