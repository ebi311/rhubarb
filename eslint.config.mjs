import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
		'./scripts/**', // 追加: scripts ディレクトリ全体を無視
	]),
	// `_` で始まる未使用の変数や引数を許可
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			// サイクロマティック複雑度が10以上の場合はエラーにする
			// ESLint の `complexity` ルールは `max` より大きい値を報告するため
			// 11以上でエラーにするには max を 10 に設定する
			complexity: ['error', { max: 10 }],
		},
	},
	// テストファイルでは `as any` の使用を許可
	{
		files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
]);

export default eslintConfig;
