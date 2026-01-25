# 基本スケジュール一覧 表形式表示機能 タスク分解

**作成日時**: 2026-01-25 14:00

## 背景

現在の基本スケジュール一覧（`/admin/basic-schedules`）はリスト形式で表示されているが、視覚的なわかりやすさを向上させるため、**利用者 × 曜日のマトリクス形式**での表示オプションを追加する。

リスト形式との切り替えを可能にし、レスポンシブ対応とメンテナンス性を考慮して CSS Grid を使用する。

## 目標

- 縦軸: 利用者、横軸: 曜日のグリッドレイアウトで基本スケジュールを表示
- リスト形式とグリッド形式を切り替え可能に
- CSS Grid を使用（table タグは使わない）
- レスポンシブ対応（モバイルでは横スクロールまたは表示簡略化）
- フィルタリング機能は両形式で共通利用

## タスク分解

### 1. リスト形式コンポーネントの切り出し

**ファイル**:

- `src/app/admin/basic-schedules/_components/BasicScheduleList/BasicScheduleList.tsx`
- `src/app/admin/basic-schedules/_components/BasicScheduleList/BasicScheduleList.test.tsx`
- `src/app/admin/basic-schedules/_components/BasicScheduleList/BasicScheduleList.stories.tsx`
- `src/app/admin/basic-schedules/_components/BasicScheduleList/index.ts`

**作業内容**:

- 現在 `BasicScheduleTable` にある実装を `BasicScheduleList` として独立させる
- 既存の機能を維持したまま、再利用可能なコンポーネントとして整理
- props: `filters: BasicScheduleFilterState`
- 既存のテストとストーリーも移行

**受入基準**:

- リスト形式が独立したコンポーネントとして動作する
- 既存の機能が全て維持されている
- ユニットテストが全て通る
- Storybook が正しく動作する

---

### 2. データ構造とビューモデルの設計

**ファイル**:

- `src/app/admin/basic-schedules/_components/BasicScheduleGrid/types.ts`

**作業内容**:

- グリッド表示用のビューモデル型を定義

  ```typescript
  // 利用者 × 曜日のマトリクス構造
  interface BasicScheduleGridViewModel {
  	clientId: string;
  	clientName: string;
  	schedulesByWeekday: {
  		Mon?: BasicScheduleCell[];
  		Tue?: BasicScheduleCell[];
  		Wed?: BasicScheduleCell[];
  		Thu?: BasicScheduleCell[];
  		Fri?: BasicScheduleCell[];
  		Sat?: BasicScheduleCell[];
  		Sun?: BasicScheduleCell[];
  	};
  }

  interface BasicScheduleCell {
  	id: string;
  	timeRange: string;
  	serviceTypeId: ServiceTypeId;
  	staffNames: string[];
  	note: string | null;
  }
  ```

- 既存の `BasicScheduleViewModel` からグリッド形式に変換するロジック設計

**受入基準**:

- 型定義ファイルが作成され、TSエラーがない

---

### 3. グリッドビューコンポーネントの実装

**ファイル**:

- `src/app/admin/basic-schedules/_components/BasicScheduleGrid/BasicScheduleGrid.tsx`
- `src/app/admin/basic-schedules/_components/BasicScheduleGrid/BasicScheduleGrid.test.tsx`
- `src/app/admin/basic-schedules/_components/BasicScheduleGrid/BasicScheduleGrid.stories.tsx`
- `src/app/admin/basic-schedules/_components/BasicScheduleGrid/index.ts`

**作業内容**:

- CSS Grid を使った表形式レイアウト実装
  - 1列目: 利用者名（固定列）
  - 2〜8列目: 月〜日曜日
  - ヘッダー行 + 利用者ごとの行
- 各セルの実装
  - 時間帯、サービス区分バッジ、スタッフ名を表示
  - セル内に複数スケジュールがある場合は縦に並べる
  - 空セルは薄いグレー背景
- レスポンシブ対応
  - デスクトップ: 全曜日表示
  - タブレット: 横スクロール（`overflow-x-auto`）
  - モバイル: 簡略表示または曜日を折りたたみ
- 空状態の実装（スケジュールが0件の場合）

**受入基準**:

- コンポーネントが正しくレンダリングされる
- セル内で複数スケジュールが表示できる
- ユニットテストが全て通る
- Storybook で通常・空状態・長いテキストの状態を確認できる

---

### 4. データ取得・変換ロジックの実装

**ファイル**:

- `src/app/admin/basic-schedules/_components/BasicScheduleGrid/fetchBasicSchedulesForGrid.ts`
- `src/app/admin/basic-schedules/_components/BasicScheduleGrid/transformToGridViewModel.ts`

**作業内容**:

- 既存の `fetchBasicSchedules` を流用または拡張
- 取得したデータを利用者 × 曜日のマトリクスに変換する関数を実装
  - 利用者でグルーピング
  - 曜日ごとにスケジュールを配置
  - 同一利用者・曜日に複数スケジュールがある場合は配列で保持
- ソート順: 利用者名昇順、曜日は月〜日

**受入基準**:

- 取得したデータが正しくグリッド形式に変換される
- ユニットテストでエッジケース（複数スケジュール、欠損曜日）をカバー

---

### 5. 表示切り替えボタンの実装

**ファイル**:

- `src/app/admin/basic-schedules/_components/ViewToggleButton/ViewToggleButton.tsx`
- `src/app/admin/basic-schedules/_components/ViewToggleButton/ViewToggleButton.test.tsx`
- `src/app/admin/basic-schedules/_components/ViewToggleButton/ViewToggleButton.stories.tsx`
- `src/app/admin/basic-schedules/_components/ViewToggleButton/index.ts`

**作業内容**:

- リスト形式 ⇔ グリッド形式の切り替えボタンを実装
  - アイコンボタン（リストアイコン/グリッドアイコン）
  - 選択中の表示モードをハイライト
- 表示モードの状態管理
  - URLクエリパラメータ `view=list|grid` で管理
  - デフォルトはリスト形式
  - または localStorage で保存（ユーザー設定として保持）

**受入基準**:

- ボタンクリックで表示が切り替わる
- URLパラメータが正しく更新される
- ユニットテストが通る
- Storybook で両状態を確認できる

---

### 6. 一覧ページへの統合

**ファイル**:

- `src/app/admin/basic-schedules/page.tsx`

**作業内容**:

- `ViewToggleButton` を配置（フィルタバーの右側など）
- URLパラメータ `view` を読み取り、表示コンポーネントを切り替え
  ```tsx
  {
  	view === 'grid' ? (
  		<Suspense fallback={<GridSkeleton />}>
  			<BasicScheduleGrid filters={filters} />
  		</Suspense>
  	) : (
  		<Suspense fallback={<ListSkeleton />}>
  			<BasicScheduleList filters={filters} />
  		</Suspense>
  	);
  }
  ```
- 既存のフィルタバーは両形式で共通利用
- ローディング状態のスケルトンを各形式に対応

**受入基準**:

- リスト/グリッド形式が切り替えられる
- フィルタが両形式で機能する
- ページ遷移や検索時に表示モードが維持される
- ユニットテストが通る

---

### 7. スタイリング・レスポンシブ対応の調整

**ファイル**:

- 各コンポーネントの CSS

**作業内容**:

- CSS Grid レイアウトの微調整（Tailwind CSS で実装）
  - `grid-cols-[auto_repeat(7,minmax(120px,1fr))]` または `grid-cols-[150px_repeat(7,minmax(120px,1fr))]`
  - 固定ヘッダー対応（`sticky top-0`）
  - セル間のボーダーは `gap-px` + 背景色で表現
  - パディングは `p-2` など
- モバイル対応
  - 768px以下: 横スクロール + 最小幅設定
  - 480px以下: 曜日ヘッダーを略記（月→月、火→火）
- ダークモード対応（daisyUI のテーマ変数使用）
- アクセシビリティ
  - グリッドセルに適切な `role` 属性
  - スクリーンリーダー対応のラベル

**受入基準**:

- デスクトップ・タブレット・モバイルで正しく表示される
- 横スクロールが機能する
- ダークモードで視認性が保たれる

---

### 8. エッジケースとエラーハンドリング

**ファイル**:

- 各コンポーネントのテスト

**作業内容**:

- エッジケースの確認
  - 同一利用者・曜日に複数スケジュールが存在
  - フィルタで結果が0件
  - 利用者が多数（100人以上）の場合のパフォーマンス
  - 長い利用者名・備考のオーバーフロー対応
- エラー状態の表示
  - データ取得失敗時のフォールバック

**受入基準**:

- 全エッジケースのテストが通る
- パフォーマンスが許容範囲内（100行程度で遅延なし）
- エラー時に適切なメッセージが表示される

---

### 9. ドキュメント更新

**ファイル**:

- `docs/features/2026-01-07-1100-basic-schedule-list.md`（既存を更新）
- または新規: `docs/features/2026-01-25-1400-basic-schedule-grid-view.md`

**作業内容**:

- グリッド表示機能の仕様を追記
  - UI 構成
  - 表示切り替え機能
  - レスポンシブ対応
- スクリーンショット（Storybook）の追加

**受入基準**:

- 機能仕様が明文化されている

---

### 10. 統合テストとレビュー

**作業内容**:

- `pnpm test:ut --run` の実行・全テスト通過確認
- `pnpm test:storybook` の実行・全ストーリー確認
- 手動で実際の画面で動作確認
  - フィルタ適用 → 表示切り替え
  - 複数スケジュールのある利用者の表示
  - レスポンシブ動作
- コードレビュー依頼

**受入基準**:

- 全自動テストが通る
- Storybook で全状態が確認できる
- 手動テストで異常なし

---

## 技術的考慮事項

- **CSS Grid の構造**（Tailwind CSS クラスで実装）:

  ```tsx
  // グリッドコンテナ
  <div className="grid grid-cols-[150px_repeat(7,minmax(120px,1fr))] gap-px bg-base-300">
  	{/* ヘッダー */}
  	<div className="bg-base-100 p-2">利用者名</div>
  	<div className="bg-base-100 p-2">月</div>
  	{/* ...他の曜日 */}

  	{/* データ行 */}
  	<div className="bg-base-100 p-2">山田太郎</div>
  	<div className="bg-base-100 p-2">{/* セル内容 */}</div>
  </div>
  ```

  - `grid-cols-[150px_repeat(7,minmax(120px,1fr))]`: 1列目150px固定、2-8列目は可変
  - `gap-px`: セル間の隙間（1px）をボーダーとして利用
  - `bg-base-300`: 隙間の背景色（ボーダー色）
  - `bg-base-100`: セルの背景色

- **パフォーマンス**:
  - 大量データ（100+ 利用者）の場合は仮想スクロールを検討
  - 初回は通常レンダリングで実装し、必要に応じて最適化

- **アクセシビリティ**:
  - `<div role="table">`, `<div role="row">`, `<div role="cell">` を使用
  - スクリーンリーダー用に曜日とセルの関連を明示

- **ブラウザ互換性**:
  - CSS Grid は主要ブラウザでサポート済み
  - IE11 は対象外（Next.js 16 の要件に準拠）

## 完了条件

- [ ] 全タスク（1〜10）が完了
- [ ] `pnpm test:ut --run` が成功
- [ ] `pnpm test:storybook` が成功
- [ ] `/admin/basic-schedules` でリスト⇔グリッド切り替えが動作
- [ ] レスポンシブ表示が正しく機能
- [ ] ドキュメントが更新されている

## 見積もり

- タスク1: 1.5h（リスト形式コンポーネント切り出し）
- タスク2: 0.5h（データ構造とビューモデルの設計）
- タスク3: 3h（グリッドビューコンポーネントの実装）
- タスク4: 2h（データ取得・変換ロジックの実装）
- タスク5: 1.5h（表示切り替えボタンの実装）
- タスク6: 1h（一覧ページへの統合）
- タスク7: 2h（スタイリング・レスポンシブ対応の調整）
- タスク8: 2h（エッジケースとエラーハンドリング）
- タスク9: 0.5h（ドキュメント更新）
- タスク10: 1.5h（統合テストとレビュー）

**合計**: 約16時間

## 参考資料

- [CSS Grid Layout - MDN](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_grid_layout)
- daisyUI Table Component: https://daisyui.com/components/table/
- 既存実装: `src/app/admin/basic-schedules/_components/BasicScheduleTable/`
