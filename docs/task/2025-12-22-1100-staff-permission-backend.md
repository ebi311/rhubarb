# 担当者サービス区分権限バックエンド実装タスク

## 概要

- 目的: 担当者（スタッフ）のサービス区分権限と備考を管理できるバックエンド機能を実装する。
- 参照: `docs/features/2025-12-22-1100-staff-management-extension.md`

## 前提

- Supabase / Next.js / Server Actions 構成済み。
- 既存 `StaffRepository` はメール・Auth連携のみ対応しているため拡張が必要。
- TDD 原則に従い、各ステップでテストを先に記述する。

## タスク一覧

| 状態 | #   | タスク                  | 詳細                                                                                                                                                           | 期待成果                                                                 |
| ---- | --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [x]  | 1   | データモデル拡張        | - Migration を作成し `staffs.note` カラムを追加<br/>- `staff_service_type_abilities` テーブルを新設（schema/制約/RLS/trigger含む）                             | supabase/migrations に新ファイル追加。`pnpm db:migrate` 実行で反映可能。 |
| [x]  | 2   | Type 定義更新           | - `src/backend/types/supabase.ts` を再生成し新テーブル/カラムを反映                                                                                            | 型エラーなく新型が利用可能。                                             |
| [x]  | 3   | モデル/Zod スキーマ整備 | - `src/models/staff.ts` に `note`, `service_type_ids` を追加<br/>- `src/models/staffActionSchemas.ts`（新規）で `StaffInputSchema`, `StaffRecordSchema` を定義 | UI/Server Action 共有の検証用スキーマが揃う。                            |
| [x]  | 4   | Repository 層           | - `StaffRepository` に CRUD を追加（list/create/update/delete + serviceType IDs 取得/更新）<br/>- 必要に応じて `ServiceTypeRepository` を利用して所属確認      | DB との永続化レイヤーが完成。                                            |
| [x]  | 5   | Service 層              | - `StaffService`（新規）を実装し、管理者チェックやデフォルト全サービス区分付与、 note 正規化を行う<br/>- 重複や権限エラー時に `ServiceError` を返す            | ビジネスロジックを集約。                                                 |
| [x]  | 6   | Server Actions          | - `src/app/actions/staffs.ts`（新規）で list/create/update/delete Action を実装<br/>- 認証/権限/バリデーションの連携                                           | フロントから利用できるエンドポイントが揃う。                             |
| [x]  | 7   | テスト                  | - Repository, Service, Server Action の Vitest を追加（正常系 + エラー系）<br/>- note/デフォルト権限/サービス区分検証をカバー                                  | `pnpm test:ut --run` で全テスト成功。                                    |

## テスト観点

- デフォルトで全 ServiceType が設定されるか。
- service_type_ids にオフィス外の ID を渡した場合は 400/403 を返すか。
- note の最大文字数バリデーション。
- 管理者以外でのアクセス拒否。

## 完了条件

1. すべてのタスクが実装され、テストがパスしている。
2. 新 API でスタッフ権限と note を CRUD できる。
3. 変更内容がドキュメント化され、レビューに耐える状態になっている。
