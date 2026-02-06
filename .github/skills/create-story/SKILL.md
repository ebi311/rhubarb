---
name: create-story
description: Storybook の Story を実装するときのテンプレートと注意点
---

## テンプレート

```tsx
import { Suspense } from 'react'; // Suspense が必要な場合
import { Meta, StoryObj } from '@storybook/nextjs-vite';

import <%= component_name %> from './<%= component_name %>';

const meta: Meta<typeof <%= component_name %>> = {
  title: 'Components/<%= component_name %>',
  component: <%= component_name %>,
  tags: ['autodocs'],
    // コンポーネントのプロパティ定義で、
    args: {
      clientId: 1,
      questionnaireId: 10,
      searchParams: {},
  },
  // 非同期コンポーネントの場合、下記を入れる
  decorators: [
    (Story) => (
      <Suspense fallback={<div>Loading...</div>}>
        <Story />
      </Suspense>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof <%= component_name %>>;

/**
 * サンプルストーリー。必要に応じて props を編集してください。
 * - 引数の型やデフォルト値はコンポーネントの props に合わせて更新してください。
 */
export const Primary: Story = {
  args: {
    // exampleProp: 'value',
  },
};
```

## 注意点

- Storybook の import は、`@storybook/react` ではなく、`@storybook/nextjs-vite` を利用すること。

### 非同期コンポーネント

- `async` 関数の非同期コンポーネントが対象の場合、`meta.decorators` で、`<Suspense>` でラップすること。

### Server Action などの呼び出しのモック

- Server Action や対象外にしたいコンポーネントがある場合、モックにします。モックは下記の要領で実装できます。

  ```tsx
  import { mocked } from 'storybook/test'; // モック関数のインポート
  import { <%= モック対象の関数 %>} from '...'

  const meta: Meta = {
    // 他のプロパティ
     beforeEach: async () => {
      // 同期の場合は、`mockReturn`などを利用。
      mocked(<%=モック対象の関数 %>).mockResolvedValue(async () => {
        // 返す値を return する
      });
    }
  }
  ```

  > Storybook mock のより詳しい説明については下記を参照のこと
  > https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-modules
