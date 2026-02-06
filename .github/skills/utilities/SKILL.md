---
name: utilities
description: プロジェクト内の共通ユーティリティ関数・コンポーネントの一覧と使用方法
---

## 概要

新しいヘルパー関数やコンポーネントを作成する前に、既存のユーティリティを確認してください。
重複を避け、一貫性を保つために既存リソースの活用を推奨します。

## 日付・時刻ユーティリティ (`src/utils/date.ts`)

| 関数名                        | 説明                                        | 使用例                                                  |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `dateJst(date?)`              | JST タイムゾーンの dayjs オブジェクトを返す | `dateJst().format('YYYY-MM-DD')`                        |
| `timeObjectToString(time)`    | `{hour, minute}` を `HH:mm` 形式に変換      | `timeObjectToString({hour: 9, minute: 30})` → `'09:30'` |
| `stringToTimeObject(str)`     | `HH:mm` 形式を `{hour, minute}` に変換      | `stringToTimeObject('09:30')` → `{hour: 9, minute: 30}` |
| `formatDateToJstString(date)` | Date を JST の `YYYY-MM-DD` 形式に変換      | `formatDateToJstString(new Date())`                     |

### dayjs プラグイン

以下のプラグインが有効化されています：

- `timezone` - タイムゾーン操作
- `isoWeek` - ISO週（月曜開始）の操作
- `isSameOrBefore` / `isSameOrAfter` - 日付比較

```typescript
// ISO週の使用例（月曜日を週の開始日とする）
dateJst(date).startOf('isoWeek'); // 週の開始日（月曜日）
dateJst(date).endOf('isoWeek'); // 週の終了日（日曜日）
```

## アイコン (`src/app/_components/Icon/`)

material-symbols を使用したアイコンコンポーネント。

```tsx
import { Icon } from '@/app/_components/Icon';

// 使用例
<Icon name="warning" />
<Icon name="check_circle" />
<Icon name="error" />
```

### 利用可能なアイコン

`src/app/_components/Icon/iconMap.ts` で定義されているアイコンを確認してください。

## その他のユーティリティ

### テストユーティリティ (`src/testUtils.tsx`)

| 関数名                                       | 説明                                             |
| -------------------------------------------- | ------------------------------------------------ |
| `renderWithUser(component)`                  | userEvent 付きで同期コンポーネントをレンダリング |
| `renderWithUserForAsyncComponent(component)` | 非同期コンポーネント用レンダリング               |

### ActionResult (`src/app/actions/utils/actionResult.ts`)

Server Action の戻り値を統一するユーティリティ。

```typescript
import { success, failure } from '@/app/actions/utils/actionResult';

// 成功時
return success(data);

// 失敗時
return failure(400, 'エラーメッセージ');
```

## 新しいユーティリティを追加する場合

1. 既存のユーティリティファイルに追加できないか検討
2. 汎用的な場合は `src/utils/` に配置
3. ドメイン固有の場合は該当するサービス/リポジトリに配置
4. この SKILL.md を更新して追加したユーティリティを記載
