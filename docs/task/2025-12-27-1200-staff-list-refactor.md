# スタッフ一覧ページ リファクタ計画

## 背景・課題

- 対象: [src/app/admin/staffs/\_components/StaffListPage/StaffListPage.tsx](../src/app/admin/staffs/_components/StaffListPage/StaffListPage.tsx)
- 現状は 1 コンポーネント内で以下の責務が混在し、可読性と再利用性が低下している。
  - サービス区分マッピングや日時整形といったビューモデル生成ロジック
  - フィルター適用・検索キーワード計算といった一覧ロジック
  - モーダル／ダイアログの開閉状態管理と、Mutation 後の再フェッチ処理
  - ヘッダー UI・アクションボタンまで含むプレゼンテーション
- 将来的な要望（フィルターの拡張、リストの並び替え、別コンテナからの再利用など）に備え、責務を切り分けたい。

## 要件

1. 既存の UI／振る舞い（フィルタリング、作成・更新・削除フロー、 router.refresh 呼び出しタイミング）は変えない。
2. 主要なロジックを「状態管理」「ビューモデル整形」「プレゼンテーション」の 3 レイヤーに分離する。
3. hooks／ユーティリティ化により、単体テストを付与しやすい構造にする。
4. 既存 Storybook（StaffListPage の親 Story 経由）でリグレッションしない。

## 機能分解プラン

| レイヤー     | 役割                                                                                      | 具体案                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 状態管理     | スタッフ配列・フィルタ値・モーダル状態・mutation 成功ハンドラを集約し、イベント発火を返す | `useStaffListState` (hooks) を新設。Action 成功時の配列更新・router.refresh をここに閉じ込める                              |
| ビューモデル | ServiceType name 解決、日時フォーマット、キーワードフィルタ計算など純粋ロジック           | `staffViewModel.ts` に `buildServiceTypeMap`、`toStaffViewModel`、`filterStaffs` を移動し UT 追加                           |
| プレゼン     | ヘッダー、フィルタバー、テーブル、モーダル群                                              | `StaffListPage` はフックから得たデータとハンドラを渡すだけにする。必要であれば `StaffListHeader` など小コンポーネントに分割 |

## タスク

| ID  | タイトル                         | 実装ステップ                                                                                                                                                                           | 成果物 / 受入条件                                                                              |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| T1  | ロジック抽出ユーティリティの新設 | 1) `buildServiceTypeMap`, `formatDateTime`, `toViewModel` を `staffViewModel.ts` に切り出し<br />2) フィルタ処理を `filterStaffs` として純粋関数化<br />3) Vitest でユニットテスト追加 | - 新ユーティリティに対する UT が通る<br>- `StaffListPage` から重複コードが消える               |
| T2  | 状態管理フックの実装             | 1) `useStaffListState` でスタッフ配列・モーダル state・成功ハンドラをラップ<br />2) router.refresh 例外処理を hook 内に集約<br />3) Hook 単体テスト（イベントで state が変わること）   | - `StaffListPage` では hook の戻り値のみ利用<br>- 既存ハンドラロジックと同等のテストカバレッジ |
| T3  | プレゼンテーション層の整理       | 1) Header セクションを `StaffListHeader`（props: onCreateRequest）に分割<br />2) `StaffListPage` は hook + 子コンポーネントで描画<br />3) Storybook の Props 更新                      | - Storybook/UT がグリーンのまま<br>- `StaffListPage` の行数が大幅に減少（~100 行目安）         |
| T4  | リグレッション確認               | 1) `pnpm test:ut --run src/app/admin/staffs/_components/StaffListPage/StaffListPage.test.tsx`<br />2) ブラウザで CRUD フローをスポット確認                                             | - テストパス、操作レポートを docs/task に追記                                                  |

## リスクと対応

- **Hook への移行で SSR/CSR 差異が出るリスク**: `use client` 前提を維持し、副作用を `useEffect` 内に限定。
- **モーダル props の循環参照**: 型定義を `_types` にまとめ、hook から返す `openCreate`, `openEdit`, `openDelete` をオブジェクト化して可読性を確保。

## 参考

- 現行 UT: [src/app/admin/staffs/\_components/StaffListPage/StaffListPage.test.tsx](../src/app/admin/staffs/_components/StaffListPage/StaffListPage.test.tsx)
- 関連 Story: [src/stories/StaffListPage.stories.ts](../src/stories/StaffListPage.stories.ts)（存在する場合、Props 更新が必要）

## 実施ログ (2025-12-27)

### T1: ロジック抽出ユーティリティの新設

- 追加: [src/app/admin/staffs/\_components/StaffListPage/staffViewModel.ts](../src/app/admin/staffs/_components/StaffListPage/staffViewModel.ts)
- UT: [staffViewModel.test.ts](../src/app/admin/staffs/_components/StaffListPage/staffViewModel.test.ts)
  - `pnpm test:ut --run src/app/admin/staffs/_components/StaffListPage/staffViewModel.test.ts`

### T2: 状態管理フックの実装

- 追加: [useStaffListState.ts](../src/app/admin/staffs/_components/StaffListPage/useStaffListState.ts)
- UT: [useStaffListState.test.tsx](../src/app/admin/staffs/_components/StaffListPage/useStaffListState.test.tsx)
  - `pnpm test:ut --run src/app/admin/staffs/_components/StaffListPage/useStaffListState.test.tsx`

### T3: プレゼンテーション層の整理

- 新規ヘッダー: [StaffListHeader.tsx](../src/app/admin/staffs/_components/StaffListPage/StaffListHeader.tsx)
- メインコンポーネント改修: [StaffListPage.tsx](../src/app/admin/staffs/_components/StaffListPage/StaffListPage.tsx)

### T4: リグレッション確認

- 既存コンポーネント UT: `pnpm test:ut --run src/app/admin/staffs/_components/StaffListPage/StaffListPage.test.tsx`
