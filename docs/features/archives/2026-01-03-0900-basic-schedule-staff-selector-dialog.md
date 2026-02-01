# 基本スケジュール向けスタッフ選択ダイアログ 仕様書

## 背景

- 参照: [基本スケジュール CRUD 仕様書](2025-12-18-1030-basic-schedule.md)
- 基本スケジュール作成/編集時に「デフォルト担当者」を選ぶ必要があるが、選択肢は利用者 × サービス区分ごとの許可スタッフ(ClientStaffAssignment)で動的に変わる。
- 現状はセレクトボックスに全員分を表示しており、許可外スタッフも出てしまう上、スタッフ情報（保有サービス区分や備考）を確認できない。
- 直感的にフィルタしながら選べるモーダル/ダイアログを提供する。

## ゴール

1. UI から許可済みスタッフ一覧を確認し、1 名を選択できる。
2. 一覧上の検索・フィルタ（氏名、役割、サービス区分）により対象を絞り込める。
3. 未選択・クリア操作をサポートし、フォーム側に `staff_id` を返却する。
4. daisyUI/Tailwind 構成に沿ったアクセシブルなモーダルを提供する。

## 対象コンポーネント

- 仮コンポーネント名: `StaffPickerDialog`
- 配置: `src/app/admin/basic-schedules/_components/StaffPickerDialog`
- 付随ファイル:
  - `StaffPickerDialog.tsx`
  - `StaffPickerDialog.test.tsx`
  - `StaffPickerDialog.stories.tsx`
  - `index.ts` (再エクスポート)

## ユースケース

1. 基本スケジュールフォームの「担当者を選択」ボタン押下でダイアログを開き、1 名選択して確定する。
2. 現在選択済みのスタッフを別のスタッフに変更する。
3. 担当者を一旦クリアして未選択に戻す（許可されている場合のみ）。
4. 許可スタッフ数が多い場合でも検索/フィルタで高速に絞り込む。

## データ入出力

### 入力 Props

| Prop                                       | 型                                                  | 必須     | 説明                                                    |
| ------------------------------------------ | --------------------------------------------------- | -------- | ------------------------------------------------------- | --------------------------------------- |
| `isOpen`                                   | `boolean`                                           | ✅       | モーダル開閉制御 (`<dialog open>` または daisyUI Modal) |
| `staffOptions`                             | `StaffPickerOption[]`                               | ✅       | 表示候補。以下の構造を前提:                             |
| `{ id: string; name: string; role: 'admin' | 'helper'; serviceTypeNames: string[]; note?: string | null; }` |
| `selectedStaffId`                          | `string                                             | null`    | ✅                                                      | 現在フォームに設定されているスタッフ ID |
| `onClose`                                  | `() => void`                                        | ✅       | キャンセル/完了時のクローズハンドラ                     |
| `onSelect`                                 | `(staffId: string) => void`                         | ✅       | 行選択または決定ボタン押下時に呼ばれる                  |
| `onClear`                                  | `() => void`                                        | ❌       | 選択解除ボタン（必要な場合のみ表示）                    |

### 出力・イベント

- `onSelect` で選択した `staffId` をフォームへ返却。
- `onClear` を実装した場合、フォーム側で `null` をセット。
- クローズ処理は `onClose` 経由で親に任せる（内部では呼ばない）。

## UI/UX 仕様

- daisyUI `modal modal-bottom sm:modal-middle` を使用。
- ダイアログ構造:
  1. ヘッダー: タイトル「担当者を選択」、`btn btn-ghost` の閉じるアイコン。
  2. フィルタバー: `input input-bordered` (検索), `select select-sm` (役割), `select select-sm` (サービス区分), `button btn-ghost` (クリア)。
  3. リスト: `table table-zebra` でスクロール可能な一覧。列 = 選択用ラジオ、氏名、役割、対応サービス区分、備考。行全体にホバー/選択ハイライトを付け、視覚的に状態を示す。
  4. モーダル下部: 選択中スタッフ表示＆確定ボタン (`btn btn-primary`)、クリアボタン (`btn btn-outline`)。
- レスポンシブ: 幅 600px をベースに、モバイルは全幅。
- キーボード操作:
  - `Esc` で閉じる (onClose)。
  - 行は `tabIndex`/`onKeyDown` を持ち、Enter/Space 操作で選択できる。
- ローディング状態: `staffOptions` が空配列かつ `isLoading` などが必要なら将来的に props 拡張で対応。現段階では読み込み済み前提。

## 振る舞い

1. 検索ボックスに入力すると `name` または `serviceTypeNames` に部分一致する行のみ表示。
2. 役割フィルタは `all/admin/helper` (daisyUI `select`)。
3. サービス区分フィルタは `all + serviceTypeNames`。
4. 行全体または先頭のラジオボタンをクリック/Enter/Space で即 `onSelect`。続けて `onClose` を呼ぶかは親実装に任せる。
5. 選択済み行はラジオ選択状態と行ハイライトで視覚的に示す。

## バリデーション/制約

- `staffOptions` は親側で許可スタッフに限定する（コンポーネント内では単純表示）。
- Props が空配列の場合は「該当スタッフがいません」を `alert alert-info` で表示。
- `onSelect` 引数はオプションから選んだ ID のみ。

## テスト観点 (Vitest + Testing Library)

1. フィルタ入力でリストが絞られる。
2. 行クリックまたはラジオ選択で `onSelect` が呼ばれる。
3. `onClear` が渡された場合、クリックで呼ばれる。
4. `isOpen=false` で何も描画されない。

## Storybook シナリオ

1. `Default` — 複数候補 + 役割/サービス区分バリエーション。
2. `Empty` — `staffOptions=[]`。
3. `WithSelected` — 既に選択済みでバッジ表示。

## 今後の拡張

- ローディング/エラー props の追加。
- スタッフ詳細 Tooltips やアバター表示。
- 複数選択モードへの拡張。
