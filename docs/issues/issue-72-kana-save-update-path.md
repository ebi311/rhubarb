# [Draft] staffs: kana の保存/更新経路を実装（スタッフ作成/編集）

refs: #72
related PR: #100 (merged)

## 背景 / 問題

- `staffs` テーブルに `kana` カラムは追加済み（migration: `supabase/migrations/20260312000000_add_kana_to_staffs.sql`）
- `StaffSchema` でも `kana` は追加済み（`src/models/staff.ts`）
- `searchStaffs` Tool は `name/kana` の検索に対応済み（#100）

一方で、スタッフ作成/編集（UI → Action → Service → Repository → DB）で `kana` を保存・更新する経路が未実装のため、実運用では `kana` が常に `null` になりやすく、`kana` 検索の実効性が担保できていません（#100 review thread: `staff.ts:17`）。

## 目的

- スタッフ作成時に `kana` を入力して保存できる
- スタッフ編集時に `kana` を更新できる
- バリデーション/Action/Repository/UI が一貫した契約になる

## スコープ（今回やる）

- 管理画面のスタッフ作成/編集フォームに `kana` 入力欄を追加する
- `createStaffAction` / `updateStaffAction` で `kana` を受け取り、Service/Repository を通して DB に保存する
- 既存 `kana` があるスタッフを編集フォームに表示し、更新できる
- 入力値の正規化（trim、空文字→null）を他フィールドと同様に揃える
- ユニット/コンポーネントテスト（最低限）を追加・更新する

## スコープ外（今回やらない）

- スタッフ一覧テーブル/検索欄に `kana` の表示・フロント側フィルタを追加（必要なら別Issue）
- `kana` の自動生成（名前→かな変換）や、ひらがな/カタカナの正規化
- 既存データの一括移行・埋め戻し（バックフィル）

## 受け入れ基準 (Acceptance Criteria)

- [ ] スタッフ作成モーダルに `ふりがな (kana)` 入力欄があり、入力して登録すると `staffs.kana` に保存される
- [ ] スタッフ編集モーダルに `ふりがな (kana)` が初期表示され、更新して保存すると `staffs.kana` が更新される
- [ ] `kana` は任意入力であり、未入力/空文字は `null` として保存される
- [ ] `kana` の最大長などのバリデーションが `StaffSchema` と矛盾しない（例: `max(100)`）
- [ ] `createStaffAction` / `updateStaffAction` の入力スキーマと `StaffService` / `StaffRepository` の payload が `kana` を含む
- [ ] テストが追加/更新され、少なくとも create/update の payload に `kana` が含まれることを担保できる

## 影響範囲（変更が入りそうな箇所）

### フロント/UI

- `src/app/admin/staffs/_components/StaffFormModal/StaffFormModal.tsx`
  - フォーム項目追加（`kana`）
  - edit の defaultValues に `kana` を含める

### Action / Schema

- `src/models/staffActionSchemas.ts`
  - `StaffInputSchema` に `kana` を追加（optional/nullable, max 100）
- `src/app/actions/staffs.ts`
  - `createStaffAction` / `updateStaffAction` の `StaffInputSchema` バリデーションに `kana` が含まれるようにする

### Service / Repository

- `src/backend/services/staffService.ts`
  - `create` / `update` の repository 呼び出し payload に `kana` を追加
- `src/backend/repositories/staffRepository.ts`
  - `StaffCreateParams` / `StaffUpdateParams` に `kana` を追加
  - `create` の insert payload に `kana`
  - `buildUpdatePayload` に `kana`

### テスト

- `src/backend/repositories/staffRepository.test.ts`（create/update の payload アサーション）
- `src/app/admin/staffs/_components/StaffFormModal/StaffFormModal.test.tsx`（フォーム送信値に `kana` が含まれること）
  - 既存のテスト状況により追加先は調整

## 実装メモ（plan agent向け）

- `kana` の扱いは email/note と同様に「空文字 → null」へ寄せるのが自然
  - 例: `StaffFormSchema` の transform で `kana` を trim し、空なら `null`
- 既存の `StaffRecord` には `kana` が含まれるため、UI の edit 初期値へ流し込むだけで表示は可能
- 既存 `searchStaffs` が `kana` を検索対象にしているため、データ投入経路ができれば検索の品質が上がる
