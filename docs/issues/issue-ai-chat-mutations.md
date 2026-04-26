# AIチャットからデータ変更まで（安全に）できるようにする — Issue/サブIssue ドラフト

（Issue #72 の続きの要件具体化。貼り付け用下書き集）

## Findings（Issue #72 の現状要約）

- Issue #72: **「AIチャットによるシフト変更のサポート機能の追加」**
- 現状（develop 時点）で揃っていること（#72 コメントより）
  - `/api/chat/shift-adjustment` の **Gemini API 連携 + SSE ストリーミング**
  - 認証（`supabase.auth.getUser()`）と **認可（admin のみ）**
  - チャット UI: `AdjustmentChatDialog` + `useAdjustmentChat`
  - AI が利用できる **参照系 Tool**
    - `searchAvailableHelpers`（空きヘルパー検索）
    - `searchStaffs`（スタッフ検索：kana 対応含む）
    - `processStaffAbsence`（欠勤により影響するシフトと代替候補の算出。※モデル側コメントに「DB永続化なし」方針あり）
  - リクエスト/レスポンスのバリデーション（Zod）や fail-fast/制限（提案 1〜3 案、tool step 数 3 など）
- 一方で #72 の成果は基本的に **「提案・説明生成」まで**であり、
  - **チャットから DB 更新を確定する仕組み（人間確認→実行）**
  - **大量更新の防止**
  - **監査ログ（誰が・いつ・何を、チャット経由で更新したか）**
    といった「更新系の安全設計」はスコープ外（または未実装）となっている。

---

## Proposed Scope（ユースケース最大3つ）

### UC1: 単一シフトの担当変更（1件更新）

- 例: 「3/18 9:00 のAさんのシフト、田中さんから佐藤さんに変更して」
- 期待: AI は候補（スタッフ）と理由を提示し、**人間が確認して実行**できる。

### UC2: 単一シフトの時間変更（1件更新）

- 例: 「このシフトを 10:00〜11:00 にずらしたい」
- 期待: AI は変更案（時間）と注意点（重複/移動時間）を示し、**人間が確認して実行**できる。

### UC3: 欠勤→影響シフト一覧→（各シフトを）代替割当/キャンセル（複数件だが“個別確認”）

- 例: 「田中さんが 3/18〜3/20 欠勤。影響を見て、代替案も出して」
- 期待: AI は影響シフトと候補を出し、**各シフトごとに**確認して「割当」または「キャンセル」を実行できる。
  - ※ 一括確定は事故リスクが高いので MVP では **「複数件をまとめて実行」しない**（または上限付き）。

---

## Safety Requirements（必須の安全要件）

### 1) 認証 / 権限

- 認証必須（未ログインは 401）
- 役割ベース認可（原則 admin のみ。helper は閲覧/提案まで等）
- office 境界の強制（対象 shift/staff/client が同一 office であること）

### 2) 人間の確認ステップ（AI提案→確定の二段階）

- AI の出力（提案）と、DB 更新（確定）は分離
- UI で「変更内容の差分」を提示し、ユーザーが明示的に Confirm しない限り更新不可

### 3) 入力バリデーション / 再検証

- クライアント側だけでなく **サーバー側で Zod + ドメイン検証**を必ず実施
- 実行直前に再検証（対象 shift の status、過去日制約、時間範囲、スタッフ可用性など）

### 4) 意図しない大量更新の防止

- 1 回の確定で更新できる件数を制限（例: 1〜最大5件まで）
- チャット文から任意の shiftId を更新できないようにする
  - 例: UI が渡した allowlist（context.shifts / 影響一覧）外の ID を拒否
- 「連鎖解除（cascade unassign）」等の波及操作は MVP ではオプトイン + 明示リスト表示

### 5) 監査ログ / 操作ログ

- 変更操作ごとに「誰が、いつ、何を、どのチャット文脈で」変更したかを保存
- 望ましい最小項目
  - actor（auth user / staff）
  - office_id
  - source（`ai_chat`）
  - operation type
  - target shift_id(s)
  - request payload（新旧差分の要約）
  - created_at

---

## Issue Drafts

### Epic: AIチャットからの安全なDB更新（確認フロー + 監査ログ）

**Title**: AIチャットからの安全なシフト更新（人間確認 + 大量更新防止 + 監査ログ）

**Body**:

- Refs: #72

#### 目的

AIチャットでの提案を、**人間の確認を挟んだ上で**、シフト関連データ（担当/時間/キャンセル等）へ安全に反映できるようにする。

#### 対象ユースケース（最大3つ）

- UC1: 単一シフトの担当変更
- UC2: 単一シフトの時間変更
- UC3: 欠勤→影響シフト→（各シフトを）代替割当/キャンセル

#### 非ゴール（MVPではやらない）

- AI の判断だけで自動更新（無確認実行）
- 無制限の一括更新
- チャットから任意IDを直接更新（UI/サーバーの allowlist を超える更新）

#### 高レベル設計案

- AI は「提案（proposal）」を **構造化データ**として返す（例: JSON in code block）
- UI は proposal を検出して「差分表示 + 確認」UI を出す
- 確認後、Server Actions（Actions→Service→Repository→Supabase）で更新
- 更新時に監査ログを必ず記録

**Acceptance Criteria**:

- [ ] AI が返す提案は DB 更新を直接起こさない（提案と確定が分離）
- [ ] 確定には UI 上の明示的な確認操作が必須
- [ ] サーバー側で認証/認可/office境界/入力検証が行われる
- [ ] 1回の確定で更新できる件数が制限される
- [ ] すべての更新操作が監査ログに残る

---

### Sub-issue 1: チャット提案（Mutation Proposal）のスキーマ定義と抽出

**Title**: AIチャットの「更新提案」を構造化（schema + prompt + JSON抽出）

**Body**:

#### 背景

現状の `/api/chat/shift-adjustment` は文章提案中心。更新系を安全に扱うため、UI が機械的に解釈できる proposal 形式が必要。

#### やること

- Zod で `AiChatMutationProposalSchema` を定義（discriminated union）
  - 例: `change_shift_staff`, `update_shift_time`, `cancel_shift`, `restore_shift` など
- AI への system prompt に「提案は JSON（code block）で出す」「実行はしない」等の規約を追加
- UI 側で assistant message から JSON を抽出/検証し、proposal として扱う

#### ガード

- `shiftId` は `context.shifts` または UI が保持する allowlist に含まれるもののみ許可（UI/サーバー双方で）
- operations 数上限（例: 1〜5）

**Acceptance Criteria**:

- [ ] proposal JSON が schema でバリデーションされ、失敗時は“通常メッセージ扱い”にフォールバック
- [ ] allowlist 外の shiftId を含む proposal は UI 上で実行不可になる

---

### Sub-issue 2: 実行API（Server Action）とドメイン再検証 + 大量更新防止

**Title**: AIチャット提案の確定実行（Server Actions）+ 再検証 + 大量更新ガード

**Body**:

#### やること

- `src/app/actions/aiChatMutations.ts`（例）を追加
  - `executeAiChatMutationsAction(input)`
- Actions→Service→Repository 既存構造に沿って実装
  - 既存 `ShiftService` のメソッド（`changeStaffAssignment`, `updateShiftSchedule`, `cancelShift`, `restoreShift` など）を呼ぶ
- 実行直前に以下を再検証
  - 認証/認可（admin）
  - office境界
  - shift の状態（canceled/completed/過去日など）
  - 時刻範囲
  - スタッフ重複（必要なら `validateStaffAvailability` でブロック）
- 大量更新ガード
  - 1回の入力で operations 上限（例: 5）
  - allowlist（shiftId / staffId）を入力に含め、サーバー側でも検証

**Acceptance Criteria**:

- [ ] 未認証/非admin は 401/403
- [ ] allowlist 外の ID が含まれる場合は 400
- [ ] 競合（重複）などの検証エラーが適切な 4xx で返る

---

### Sub-issue 3: 監査ログ（操作ログ）の永続化

**Title**: AIチャット経由の更新操作を監査ログに記録する

**Body**:

#### やること

- 新テーブル追加案（例）: `ai_operation_logs`
  - `id uuid pk`
  - `office_id uuid not null`
  - `actor_user_id uuid not null`（auth user）
  - `actor_staff_id uuid null`（引けるなら）
  - `source text not null`（`ai_chat`）
  - `operation_type text not null`
  - `target_ids jsonb not null`（shiftId など）
  - `payload jsonb not null`（提案/実行入力、差分の要約）
  - `created_at timestamptz not null default now()`
- RLS
  - 同 office の admin のみ閲覧可能
  - insert はサーバー経由（既存の supabase client 方針に合わせる）
- Repository / Service を追加し、更新実行のたびに必ず insert

**Acceptance Criteria**:

- [ ] すべての execute 操作でログが 1 件以上残る
- [ ] office境界が守られている（他 office のログは読めない）

---

### Sub-issue 4: UI（チャット内の提案カード + 確認モーダル + 実行結果表示）

**Title**: チャット提案をUIで確認・確定できるようにする（提案カード/確認モーダル）

**Body**:

#### やること

- `AdjustmentChatDialog` の `ChatMessageList` に proposal 表示（カードUI）を追加
- 「差分（Before/After）」を明示して確認 UI を出す
- Confirm 時に `executeAiChatMutationsAction` を呼ぶ
- 実行後に
  - 成功: 更新内容サマリ表示 + WeeklySchedule の再取得（invalidate/reload）
  - 失敗: エラーメッセージ + 再試行導線

**Acceptance Criteria**:

- [ ] 提案→確認→確定の導線がチャット内で完結する
- [ ] streaming 中は確定ボタンが無効化される
- [ ] 実行結果（成功/失敗）がユーザーに分かる

---

### Sub-issue 5: UC1 実装（単一シフトの担当変更）

**Title**: UC1: AIチャットから単一シフトの担当変更を安全に確定できる

**Body**:

- 対象: `context.shifts[0]` の担当変更
- AI は `change_shift_staff` proposal を返す
- UI 確認後に確定
- 重複がある場合はブロック（MVP）し、競合内容を表示

**Acceptance Criteria**:

- [ ] admin が「担当をA→Bへ」と指示→確認→DB更新できる
- [ ] 競合があれば確定がブロックされ、ユーザーが理解できるエラー表示になる

---

### Sub-issue 6: UC2 実装（単一シフトの時間変更）

**Title**: UC2: AIチャットから単一シフトの時間変更を安全に確定できる

**Body**:

- 対象: `context.shifts[0]` の時間変更
- AI は `update_shift_time` proposal を返す
- UI 確認後に確定

**Acceptance Criteria**:

- [ ] admin が「10:00〜11:00に変更」と指示→確認→DB更新できる
- [ ] 不正な時間（start>=end）や過去日の変更は 4xx で拒否される

---

### Sub-issue 7: UC3 実装（欠勤→影響→各シフトを個別に代替割当/キャンセル）

**Title**: UC3: 欠勤相談から影響シフトを出し、各シフトを個別確認して更新できる

**Body**:

- AI が `processStaffAbsence` を呼び、影響シフト + 候補を得る
- UI は影響シフト一覧を表示
- 各シフトごとに
  - 候補を割当（UC1 相当）
  - またはキャンセル
    を proposal として発行→確認→確定

**Acceptance Criteria**:

- [ ] 欠勤期間を入力すると影響シフト一覧が表示される
- [ ] 影響シフト1件ずつ、確認して割当/キャンセルできる
- [ ] 1操作での更新数上限が守られる（事故防止）

---

## Notes（フェーズ分割案）

- Phase 1（MVP）: 「単一シフトの担当/時間変更」＋監査ログ＋確認UI
- Phase 2: 欠勤→影響シフトの UI 統合（個別確定）
- Phase 3: 連鎖解除（cascade unassign）など波及操作のサポート（オプトイン + 明示差分）
