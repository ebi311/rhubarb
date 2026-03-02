# Issue #69 要件整理（実装向け）

## 目的
過去日の週次シフトに対して、UI 上で「変更できそうに見える」状態を解消し、操作時エラー（更新失敗）を未然に防ぐ。

## 背景
- 現状、`ChangeStaffDialog` では過去シフトでも日付/時間/担当者の編集操作が可能に見える。
- ただしバックエンドでは過去シフト変更が禁止されており、送信時にエラーとなる。
- ユーザー体験として「押せるが失敗する」を避ける必要がある。

## スコープ
1. **ChangeStaffDialog の過去シフト判定**を追加する（JST 日付単位）。
2. 過去シフトの場合、以下を **編集不可（readonly/disabled）** にする。
   - 日付入力
   - 開始時刻入力
   - 終了時刻入力
   - 担当者選択ボタン
   - 変更理由入力
3. 過去シフトの場合、以下を **実行不可（disabled）** にする。
   - 「変更」ボタン
   - 「調整相談」ボタン（表示される場合）
4. 既存の「キャンセル」「閉じる」は利用可能のままとする。
5. ユニットテストを追加/更新し、過去シフトで操作できないことを担保する。

## 非スコープ
- バックエンドの業務ルール変更（過去シフトを更新可能にする等）は行わない。
- ダイアログ外（一覧/グリッド上の編集アイコン自体の非表示・無効化）は本 Issue では必須としない。
- エラーメッセージ文言やトースト仕様の全面見直しは行わない。

## 受け入れ条件（実装・テスト可能な形）
- [ ] 過去シフトを開いたとき、`ChangeStaffDialog` の編集系コントロールがすべて操作不可である。
- [ ] 過去シフトを開いたとき、「変更」ボタンは disabled であり、`updateShiftScheduleAction` が呼ばれない。
- [ ] 過去シフトを開いたとき、「調整相談」ボタン（存在する場合）は disabled であり、`onStartAdjustment` が呼ばれない。
- [ ] 当日以降のシフトでは従来どおり編集可能で、既存テストが維持される。
- [ ] 過去判定は JST 日付基準で行い、バックエンド制約と矛盾しない。

## 実装要求（plan エージェント向け要約）
- `ChangeStaffDialog` に `isPastShift`（JST 日付単位）を導入。
- `isSubmitting` に加えて `isPastShift` を disabled/readOnly 条件へ統合。
- ボタンハンドラ側でもガード（万一のイベント発火抑止）を入れる。
- `ChangeStaffDialog.test.tsx` に「過去シフト時の UI ロック」テストを追加する。

## 参照
- Issue: https://github.com/ebi311/rhubarb/issues/69
- 実装候補:
  - `src/app/admin/weekly-schedules/_components/ChangeStaffDialog/ChangeStaffDialog.tsx`
  - `src/app/admin/weekly-schedules/_components/ChangeStaffDialog/useChangeStaffDialog.ts`
  - `src/app/admin/weekly-schedules/_components/ChangeStaffDialog/ChangeStaffDialog.test.tsx`
- バックエンド制約:
  - `src/backend/services/shiftService.ts`
    - `ensureNotMovingToPast`
    - `ensureNotChangingStaffForPastShift`
