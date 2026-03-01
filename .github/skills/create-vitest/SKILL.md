---
name: create-vitest
description: Reactコンポーネント以外のロジック（ユーティリティ関数、APIクライアント、カスタムフック、Zodスキーマ検証など）に対するテスト実装指針
---

# Vitest 実装ガイド（ロジック・関数編）

Zebra AMS フロントエンドにおける、Reactコンポーネント以外のロジック（ユーティリティ関数、APIクライアント、カスタムフック、Zodスキーマ検証など）に対するテスト実装指針です。

## 1. 基本方針

- **ファイル配置**: テスト対象ファイルと同じディレクトリに `{ファイル名}.spec.ts` として配置します。
- **実行**: `pnpm test:ut --run` で実行されます。
- **型安全性**: `as any` の使用は原則避けますが、モデル定義などでテストに関係のない大量のプロパティ記述を省略する場合など、状況に応じて許容します。

## 2. 実装パターン

### 2.1. 純粋関数（Pure Function）のテスト

副作用のないユーティリティ関数のテストには、`test.each` を使用して複数のケースを効率的に記述します。

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
	// パラメータ化テストで網羅性を高める
	it.each([
		{ input: 1000, expected: '1,000円' },
		{ input: 0, expected: '0円' },
		{ input: -500, expected: '-500円' },
	])('数値 $input を "$expected" にフォーマットする', ({ input, expected }) => {
		const result = formatCurrency(input);
		expect(result).toBe(expected);
	});
});
```

### 2.2. Zodスキーマの検証

`src/models/` 配下のスキーマ定義が意図通りにバリデーションを行うか確認します。特に `transform` や `refine` を使用している場合に重要です。

```typescript
import { describe, it, expect } from 'vitest';
import { CustomerSchema } from './customer';

describe('CustomerSchema', () => {
	it('有効なデータの場合はパースに成功する', () => {
		const validData = { id: 1, name: 'Test User', email: 'test@example.com' };
		const result = CustomerSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it('emailが不正な場合はエラーを返す', () => {
		const invalidData = { id: 1, name: 'Test User', email: 'invalid-email' };
		const result = CustomerSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
		if (!result.success) {
			// エラーメッセージの内容まで検証
			expect(result.error.flatten().fieldErrors.email).toContain(
				'メールアドレスの形式が正しくありません',
			);
		}
	});
});
```

### 2.3. 依存モジュールのモック（vi.mock）

APIクライアントなどの外部依存や、テストのスコープに応じて依存している内部モジュールに対して `vi.mock` を使用してモック化することが可能です。

```typescript
import { describe, it, expect, vi, type Mock } from 'vitest';
import { fetchUserData } from './userParams';
import { apiClient } from '@/lib/api/core'; // 依存モジュール

// モジュールのモック化
vi.mock('@/lib/api/core');

describe('fetchUserData', () => {
	it('APIからデータを取得して加工する', async () => {
		// モックの戻り値を設定
		const mockResponse = { id: 1, name: 'Alice' };

		// vi.mockedを使って型安全にモック操作を行う
		vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

		const result = await fetchUserData(1);

		expect(apiClient.get).toHaveBeenCalledWith('/users/1');
		expect(result).toEqual({ userName: 'Alice' });
	});
});
```

### 2.4. 日時のテスト（System Time）

`src/lib/dateUtils.ts` などをテストする場合、現在時刻に依存するロジックは `vi.useFakeTimers` で時刻を固定します。

```typescript
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { isNewCustomer } from './customerLogic';

describe('isNewCustomer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('登録から30日以内なら新規顧客とみなす', () => {
		// 現在時刻を 2025-01-01 00:00:00 JST に固定
		const mockNow = new Date('2025-01-01T00:00:00+09:00');
		vi.setSystemTime(mockNow);

		const recentDate = '2024-12-25'; // 7日前
		expect(isNewCustomer(recentDate)).toBe(true);

		const oldDate = '2024-11-01'; // 2ヶ月前
		expect(isNewCustomer(oldDate)).toBe(false);
	});
});
```

## 3. 注意点とベストプラクティス

1.  **Arrange-Act-Assert (AAA) パターン**:
    - 準備 (Arrange)、実行 (Act)、検証 (Assert) の順序を意識して可読性を保ちます。
2.  **`as any` の禁止**:
    - モックの型合わせで `as any` を使わず、`vi.mocked()` を通すことで、メソッド名のタイポや引数の変更検知を行います。
3.  **テストの独立性**:
    - `beforeEach` や `afterEach` で `vi.clearAllMocks()` を呼び出し、テスト間のステート汚染を防ぎます（`vitest.config.ts` で `mockReset: true` が設定されている場合もありますが、明示的なリセットを推奨）。
4.  **スナップショットの乱用注意**:
    - ロジックのテストでは `toMatchSnapshot()` は極力避け、具体的な値（`toBe`, `toEqual`）を検証してください。ロジック変更の意図が正しく伝わらなくなるためです。
5.  **カバレッジ**:
    - 正常系だけでなく、異常系（APIエラー、バリデーションエラー）の分岐も網羅します。

## 4. チートシート

| 用途               | Vitest API                   | 備考                                           |
| :----------------- | :--------------------------- | :--------------------------------------------- |
| 関数をモック化     | `vi.fn()`                    | コールバック関数のテストなどに使用             |
| モジュールのモック | `vi.mock('path')`            | ファイルのトップレベルで記述                   |
| メソッドのスパイ   | `vi.spyOn(obj, 'method')`    | 既存の実装を監視、または上書き                 |
| モック型変換       | `vi.mocked(variable)`        | TypeScriptでモックメソッドへアクセスする際必須 |
| タイマー操作       | `vi.useFakeTimers()`         | 時刻固定、`setTimeout`の早送りなど             |
| 非同期待ち         | `await expect(...).resolves` | Promiseの結果を検証                            |

> 参考:
> https://github.com/sapegin/vitest-cheat-sheet
