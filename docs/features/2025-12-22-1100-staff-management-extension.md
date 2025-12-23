# 担当者管理拡張（サービス区分権限 + 備考）

## 概要

- フェーズ: MVP フェーズ1 / 担当許可リスト設定
- 目的: 担当者（スタッフ）の登録・更新時に、どのサービス区分を担当できるかを明示的に管理し、備考情報を保持できるようにする。
- 背景: 基本スケジュール作成時に「担当者がそのサービス区分を担当可能か」を即時判定する必要があるが、現状は担当者単位のサービス区分権限が存在しない。また、スタッフメモ（シフト調整時の注意点など）を保持する欄がない。

## ゴール

1. 担当者が複数サービス区分に対応できる設定をバックエンドで管理できる。
2. デフォルト値は「すべてのサービス区分を担当可能」とし、不要な区分のみ削除できる。
3. スタッフの備考（note）を保存し、CRUD で扱える。
4. API / Server Action / Service / Repository 層にテスト付きで実装が揃う。

## スコープ

- 対象
  - データモデルの拡張（staffs.note、staff_service_type_abilities テーブル）
  - リポジトリ層の CRUD + サービス区分権限管理
  - サービス層（StaffService 仮称）と Server Actions の実装
  - TDD による単体テスト（Repository / Service / Actions）
- 対象外（今後）
  - UI 実装（この後に別タスクで実装）
  - スタッフ可用性（staff_availabilities）の編集 UI（現状は 7 日 \* 24 時間 の暗黙値を維持）
  - ヘルパー自身のセルフサービス編集

## 利用者 / 権限

- 管理者（office admin ロール）
  - スタッフ一覧/作成/更新/削除、サービス区分割当の操作が可能。
- ヘルパー（helper ロール）
  - 自身の情報閲覧のみに限定（既存ポリシー踏襲）。サービス区分権限を編集する権限はない。

## 機能要件

1. スタッフ登録/更新 API に `service_type_ids: string[]` を追加。
   - 省略時は「所属オフィスの全 ServiceType を担当可能」として保存。
   - 指定時は重複を除外し、一意に保存。
2. スタッフ登録/更新 API に `note?: string | null (max 500)` を追加。
3. サービスからの返却値（Staff DTO）に `service_type_ids: string[]` と `note` を含める。
4. 削除（ソフト/ハード問わず）の要件変更はなし（現状どおり）。

## ビジネスルール

1. `service_type_ids` は同一オフィス内の ServiceType のみ許可。
2. 管理者以外はサービス区分の変更不可。
3. デフォルトでは全 ServiceType を担当可能 → 作成後に UI から不要分を削るフロー。
4. note は 500 文字まで、空文字入力時は null 保存。
5. 将来的な staff_availabilities 編集は対象外。現状は "全曜日 00:00-24:00" を暗黙的に保持し、変更 API は提供しない。

## データモデル

### staffs テーブル

| カラム | 型   | 変更点                           |
| ------ | ---- | -------------------------------- |
| note   | text | **新規**: nullable, default null |

### staff_service_type_abilities（新規）

| カラム          | 型          | 備考                                      |
| --------------- | ----------- | ----------------------------------------- |
| id              | uuid        | PK, default gen_random_uuid()             |
| staff_id        | uuid        | FK -> staffs(id) on delete cascade        |
| service_type_id | uuid        | FK -> service_types(id) on delete cascade |
| created_at      | timestamptz | default now()                             |
| updated_at      | timestamptz | default now()                             |

- `unique (staff_id, service_type_id)` 制約
- RLS: 管理者は同一 office のスタッフに紐づく行を CRUD 可能、ヘルパーは閲覧不可
- 作成時に `handle_updated_at()` トリガーを付与

## API / サービス設計

### Zod スキーマ

- `StaffInputSchema`
  - `name: string`
  - `email?: string | null`
  - `role: 'admin' | 'helper'`
  - `note?: string | null`
  - `service_type_ids?: string[]`（uuid, min 0）
- `StaffRecordSchema`
  - 上記に `id`, `office_id`, `created_at`, `updated_at` を加える

### Server Actions（例）

- `listStaffsAction()`
- `createStaffAction(input: StaffInput)`
- `updateStaffAction(id, input)`
- `deleteStaffAction(id)` ※ 既存仕様確認の上、必要な場合のみ

### StaffService

- `list(adminUserId)`
- `create(adminUserId, input)`
- `update(adminUserId, id, input)`
- `delete(adminUserId, id)`
- 内部で
  - 管理者チェック（既存 `StaffRepository.findByAuthUserId`）
  - ServiceType IDs のバリデーション（オフィス一致）
  - デフォルト全権限付与（ServiceType 一覧取得）

## エラーケース

- 400: Zod バリデーション失敗（例: UUID 不正, note 長すぎ）
- 403: 管理者権限なし
- 404: スタッフ/サービス区分が存在しない
- 409: ServiceType 重複やユニーク制約違反（ラップして人間可読なメッセージへ）

## テスト

- Repository: staff_service_type_abilities CRUD、デフォルト挙動
- Service: 管理者判定、ServiceType 範囲チェック、note の正規化
- Server Action: 認証失敗/成功、バリデーション、サービス層エラーハンドリング

## 受入基準

- スタッフ作成時に `service_type_ids` を渡さなくても全サービス区分が自動設定される。
- 渡した場合は指定サービス区分のみが許可され、BasicSchedule 作成時のチェックで利用可能。
- スタッフに note を保存でき、API レスポンスで参照できる。
- 追加した単体テストが `pnpm test:ut --run` で全て成功する。
